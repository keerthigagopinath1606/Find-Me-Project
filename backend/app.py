from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import threading
from pathlib import Path
import json
import uuid
import secrets
import hashlib
import cv2
import smtplib
from email.message import EmailMessage

from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy import event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
import time
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from .config import Config, BASE_DIR
from .models import (db, User, ComplaintGiver, Complaint, MissingPerson, FaceEmbedding,
                     ImageSearch, VideoSearch, AIMatchResult, Sighting, Evidence,
                     Notification, AuditLog, InvestigationRecord, EmergencyAlert, Camera, CandidateObservation)
from .services import (embedding_for, reference_embeddings_for, face_records_for, refine_face_records_for,
                        face_embedding_from_crop, face_regions_for, aligned_face_embedding_from_crop, arcface_embedding_from_crop, arcface_reference_embeddings_for, efficientnet_b0_embedding_from_crop, efficientnet_b0_reference_embeddings_for, efficientnet_similarity, face_quality, similarity, robust_face_similarity, face_augmented_embeddings_from_crop, confidence, MODEL_NAME,
                        clothing_similarity, estimate_age_from_face, age_compatibility,
                        location_relevance, location_context, clothing_context, time_relevance, combined_score)

STATUSES = ["Reported", "Under Verification", "Verified", "Under Investigation", "Possible Match", "Match Under Review", "Located", "Case Closed", "Rejected", "More Information Required"]

INDIA_TZ = ZoneInfo("Asia/Kolkata")
_EMBEDDING_LOCK = threading.Lock()
_DB_WRITE_LOCK = threading.RLock()
_VIDEO_JOBS = {}
_VIDEO_JOBS_LOCK = threading.RLock()

@event.listens_for(Engine, "connect")
def _sqlite_pragmas(dbapi_connection, connection_record):
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=30000")
        finally:
            cursor.close()

def safe_commit(retries=6):
    last_error = None
    for attempt in range(retries):
        try:
            with _DB_WRITE_LOCK:
                db.session.commit()
            return
        except OperationalError as error:
            db.session.rollback()
            last_error = error
            if "locked" not in str(error).lower() and "busy" not in str(error).lower():
                raise
            time.sleep(0.35 * (attempt + 1))
    raise last_error

def india_now():
    return datetime.now(INDIA_TZ).replace(tzinfo=None)

def iso_india(value):
    if not value:
        return None
    return value.replace(tzinfo=INDIA_TZ).isoformat()

def identifier(prefix):
    return f"{prefix}-{india_now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"

def api_error(message, status=400): return jsonify(success=False, message=message), status

def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def safe_json(value, fallback=None):
    try:
        return json.loads(value) if value else (fallback if fallback is not None else {})
    except Exception:
        return fallback if fallback is not None else {}

def user_payload(user): return {"id": user.id, "username": user.username, "email": user.email, "role": user.role}

def serialize_case(case):
    person, giver = case.missing_person, case.giver
    verifier = getattr(case, "verified_by", None)
    return {
        "complaint_id": case.complaint_id,
        "status": case.status,
        "remarks": case.admin_remarks,
        "enquiry_result": getattr(case, "enquiry_result", None),
        "enquiry_notes": getattr(case, "enquiry_notes", None),
        "verified_by": {
            "id": verifier.id,
            "username": verifier.username,
            "email": verifier.email
        } if verifier else None,
        "verified_by_name": verifier.username if verifier else None,
        "verified_at": iso_india(case.verified_at),
        "created_at": iso_india(case.created_at),
        "complaint_giver": {
            "giver_id": giver.giver_id, "full_name": giver.full_name,
            "relationship": giver.relationship, "phone": giver.phone,
            "email": giver.email, "city": giver.city, "state": giver.state,
            "address": giver.address, "id_proof_type": giver.id_proof_type,
            "id_reference": giver.id_reference
        },
        "missing_person": {
            "missing_person_id": person.missing_person_id,
            "full_name": person.full_name, "age": person.age, "gender": person.gender,
            "height": person.height, "weight": person.weight, "complexion": person.complexion,
            "hair_details": person.hair_details, "eye_details": person.eye_details,
            "clothing": person.clothing, "accessories": person.accessories,
            "appearance_history": safe_json(person.appearance_history_json, []),
            "privacy_level": person.privacy_level,
            "identifying_marks": person.identifying_marks,
            "medical_information": person.medical_information,
            "last_seen_location": person.last_seen_location,
            "last_seen_date": person.last_seen_date, "last_seen_time": person.last_seen_time,
            "description": person.description, "photo_url": f"/uploads/{person.photo_path}",
            "verified": person.is_verified
        }
    }

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": ["http://127.0.0.1:5000", "http://localhost:5000"]}})
    db.init_app(app); JWTManager(app)
    # Ensure the SQLite directory and all upload directories exist before SQLAlchemy connects.
    (BASE_DIR / "database").mkdir(parents=True, exist_ok=True)
    Config.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    for folder in ["missing_persons", "search_images", "videos", "evidence", "temp_frames"]: (Config.UPLOAD_FOLDER / folder).mkdir(parents=True, exist_ok=True)
    with app.app_context():
        db.create_all()
        # FINAL BUILD: clear legacy notification rows exactly once.
        final_notification_marker = BASE_DIR / ".findme_final_notification_cleanup_v2"
        if not final_notification_marker.exists():
            try:
                Notification.query.delete(synchronize_session=False)
                db.session.commit()
                final_notification_marker.write_text("done", encoding="utf-8")
                print("[Find-Me] Final build: legacy notifications cleared once.")
            except Exception as cleanup_error:
                db.session.rollback()
                print(f"[Find-Me] Final notification cleanup skipped: {cleanup_error}")
        # V17 schema migration for existing SQLite databases.
        try:
            columns = {row[1] for row in db.session.execute(text("PRAGMA table_info(complaint_givers)")).fetchall()}
            if "preferred_contact" not in columns:
                db.session.execute(text("ALTER TABLE complaint_givers ADD COLUMN preferred_contact VARCHAR(20) DEFAULT 'Phone'"))
                db.session.commit()
        except Exception:
            db.session.rollback()
        # Lightweight schema upgrade for V6 multi-clue scoring. This keeps older
        # demo databases usable without requiring Alembic for an expo build.
        inspector = inspect(db.engine)
        columns = {c["name"] for c in inspector.get_columns("ai_match_results")}
        upgrades = {
            "overall_score": "ALTER TABLE ai_match_results ADD COLUMN overall_score FLOAT",
            "face_score": "ALTER TABLE ai_match_results ADD COLUMN face_score FLOAT",
            "clothing_score": "ALTER TABLE ai_match_results ADD COLUMN clothing_score FLOAT",
            "age_score": "ALTER TABLE ai_match_results ADD COLUMN age_score FLOAT",
            "location_score": "ALTER TABLE ai_match_results ADD COLUMN location_score FLOAT",
            "time_score": "ALTER TABLE ai_match_results ADD COLUMN time_score FLOAT",
            "score_breakdown_json": "ALTER TABLE ai_match_results ADD COLUMN score_breakdown_json TEXT",
            "camera_location": "ALTER TABLE video_searches ADD COLUMN camera_location VARCHAR(255)",
            "capture_date": "ALTER TABLE video_searches ADD COLUMN capture_date VARCHAR(30)",
            "capture_time": "ALTER TABLE video_searches ADD COLUMN capture_time VARCHAR(30)",
            "enquiry_result": "ALTER TABLE complaints ADD COLUMN enquiry_result VARCHAR(80)",
            "enquiry_notes": "ALTER TABLE complaints ADD COLUMN enquiry_notes TEXT",
            "reset_token_hash": "ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255)",
            "reset_token_expires_at": "ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME",
            "alert_reason": "ALTER TABLE emergency_alerts ADD COLUMN alert_reason TEXT",
            "appearance_history_json": "ALTER TABLE missing_persons ADD COLUMN appearance_history_json TEXT DEFAULT '[]'",
            "accessories": "ALTER TABLE missing_persons ADD COLUMN accessories TEXT",
            "privacy_level": "ALTER TABLE missing_persons ADD COLUMN privacy_level TEXT DEFAULT 'RESTRICTED'",
            "sha256": "ALTER TABLE evidence ADD COLUMN sha256 TEXT",
            "file_size": "ALTER TABLE evidence ADD COLUMN file_size INTEGER",
            "integrity_status": "ALTER TABLE evidence ADD COLUMN integrity_status TEXT DEFAULT 'VERIFIED'",
            "source_camera_id": "ALTER TABLE evidence ADD COLUMN source_camera_id INTEGER",
            "retention_until": "ALTER TABLE evidence ADD COLUMN retention_until DATETIME",
        }
        table_columns = {
            "ai_match_results": columns,
            "video_searches": {c["name"] for c in inspector.get_columns("video_searches")},
            "complaints": {c["name"] for c in inspector.get_columns("complaints")},
            "users": {c["name"] for c in inspector.get_columns("users")},
            "emergency_alerts": {c["name"] for c in inspector.get_columns("emergency_alerts")},
            "missing_persons": {c["name"] for c in inspector.get_columns("missing_persons")},
            "evidence": {c["name"] for c in inspector.get_columns("evidence")},
        }
        table_for_upgrade = {
            "overall_score": "ai_match_results", "face_score": "ai_match_results",
            "clothing_score": "ai_match_results", "age_score": "ai_match_results",
            "location_score": "ai_match_results", "time_score": "ai_match_results",
            "score_breakdown_json": "ai_match_results",
            "camera_location": "video_searches", "capture_date": "video_searches",
            "capture_time": "video_searches",
            "enquiry_result": "complaints", "enquiry_notes": "complaints",
            "reset_token_hash": "users", "reset_token_expires_at": "users", "alert_reason": "emergency_alerts",
            "appearance_history_json": "missing_persons", "accessories": "missing_persons", "privacy_level": "missing_persons",
            "sha256": "evidence", "file_size": "evidence", "integrity_status": "evidence", "source_camera_id": "evidence", "retention_until": "evidence",
        }
        for name, sql in upgrades.items():
            table = table_for_upgrade[name]
            if name not in table_columns[table]:
                db.session.execute(text(sql))
        db.session.commit()
        # V11 simulated camera network seed. Safe to run repeatedly.
        if Camera.query.count() == 0:
            demo_cameras = [
                ("CCTV-KPM-01", "Kanchipuram Bus Stand", "Kanchipuram", 12.8342, 79.7036, "NORTH", "SIMULATED_CCTV"),
                ("CCTV-CHN-01", "Chennai Central Approach", "Chennai", 13.0827, 80.2707, "CENTRAL", "SIMULATED_CCTV"),
                ("CCTV-CHN-02", "Chennai Market Junction", "Chennai", 13.0878, 80.2785, "CENTRAL", "SIMULATED_CCTV"),
                ("CCTV-TRY-01", "Trichy Central Junction", "Trichy", 10.7905, 78.7047, "SOUTH", "SIMULATED_CCTV"),
            ]
            for cid, name, loc, lat, lon, zone, source in demo_cameras:
                db.session.add(Camera(camera_id=cid, name=name, location=loc, latitude=lat, longitude=lon, zone=zone, source_type=source, status="ONLINE"))
            safe_commit()
        # This is the only demo seed and intentionally runs server-side; public registration cannot create it.
        if not User.query.filter_by(username="admin").first():
            db.session.add(User(username="admin", email="admin@findme.local", password_hash=generate_password_hash("FindMeAdmin@2026"), role="ADMIN", is_active=True)); safe_commit()

    def identity(): return User.query.get(int(get_jwt_identity()))
    def audit(action, description=""):
        current = identity(); db.session.add(AuditLog(user_id=current.id if current else None, action=action, description=description, ip_address=request.remote_addr))
    def role_required(role):
        def decorator(fn):
            @jwt_required()
            def wrapped(*args, **kwargs):
                current = identity()
                if not current or not current.is_active: return api_error("Authentication required", 401)
                if current.role != role: return api_error("Unauthorized administrative access", 403)
                return fn(*args, **kwargs)
            wrapped.__name__ = fn.__name__; return wrapped
        return decorator
    def save_upload(field, folder, kinds):
        file = request.files.get(field)
        if not file or not file.filename: raise ValueError(f"{field.replace('_', ' ').title()} is required.")
        extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if extension not in kinds: raise ValueError("Unsupported file format.")
        name = f"{uuid.uuid4().hex}.{extension}"; relative = f"{folder}/{name}"; file.save(Config.UPLOAD_FOLDER / relative); return relative
    def _send_real_email_async(recipient, subject, message):
        """Send a real email only when SMTP is configured.
        Never blocks the request/AI pipeline; failures are logged and the
        in-app notification remains available.
        """
        host = Config.SMTP_HOST
        username = Config.SMTP_USERNAME
        password = Config.SMTP_PASSWORD
        sender = Config.SMTP_FROM or username
        if not host or not username or not password or not recipient:
            return

        def worker():
            try:
                email = EmailMessage()
                email['From'] = sender
                email['To'] = recipient
                email['Subject'] = subject
                email.set_content(message)
                with smtplib.SMTP(host, Config.SMTP_PORT, timeout=12) as server:
                    server.ehlo()
                    if Config.SMTP_USE_TLS:
                        server.starttls()
                        server.ehlo()
                    server.login(username, password)
                    server.send_message(email)
            except Exception as exc:
                print(f'[Find-Me] Email delivery failed for {recipient}: {exc}')

        threading.Thread(target=worker, daemon=True).start()

    def add_notification(user_id, title, message):
        # Backend notifications are the source of truth for the citizen UI.
        # Flush immediately so the notification is guaranteed to be part of the
        # same committed transaction as the case-status change.
        if not user_id:
            print(f"[Find-Me] Notification skipped: missing recipient for {title}")
            return None
        notification = Notification(user_id=user_id, title=title, message=message)
        db.session.add(notification)
        db.session.flush()

        recipient = None
        should_email = False

        try:
            target_user = User.query.get(user_id)
            recipient = target_user.email if target_user else None

            # Administrators receive operational email notifications when
            # SMTP is configured. Citizen email delivery follows the
            # preferred-contact choice stored on their latest report.
            if target_user and target_user.role == "ADMIN":
                should_email = True
            elif target_user:
                latest_giver = (
                    ComplaintGiver.query
                    .filter_by(user_id=target_user.id)
                    .order_by(ComplaintGiver.id.desc())
                    .first()
                )
                preference = (
                    (latest_giver.preferred_contact if latest_giver else "Phone")
                    or "Phone"
                ).strip().lower()
                should_email = preference in {"email", "either"}

        except Exception as exc:
            print(f"[Find-Me] Notification preference lookup failed: {exc}")

        if should_email:
            _send_real_email_async(
                recipient,
                f'Find-Me: {title}',
                message
            )
        return notification
    def record(case, action, description, officer=None): db.session.add(InvestigationRecord(complaint_id=case.id, officer_id=officer, action=action, description=description))
    def create_emergency_alert(case, person, search, match, current_user):
        existing = EmergencyAlert.query.filter_by(video_search_id=search.id, missing_person_id=person.id).order_by(EmergencyAlert.created_at.desc()).first()
        if existing:
            return existing, False
        breakdown = match.get("score_breakdown") or {}
        overall = float(match.get("overall_score") or 0)
        severity = "HIGH" if overall >= 75 else "MEDIUM"
        alert = EmergencyAlert(
            alert_id=identifier("EA"), complaint_id=case.id, missing_person_id=person.id,
            video_search_id=search.id, ai_match_id=match.get("db_id"), severity=severity, status="OPEN",
            title="Possible Missing-Person Sighting Detected",
            message=f"AI candidate {person.full_name} scored {overall:.2f}% in CCTV evidence. Officer verification is required; identity is not confirmed.",
            alert_reason=(
                f"Candidate crossed the configured evidence gate with {overall:.2f}% overall score "
                f"and {int(match.get('repeated_observations') or 0)} repeated observation(s). "
                "Alert is a possible sighting lead, not a confirmed identity."
            ),
            camera_location=search.camera_location, capture_date=search.capture_date, capture_time=search.capture_time,
            overall_score=overall, face_score=breakdown.get("face_similarity"), clothing_score=breakdown.get("clothing_similarity"),
            age_score=breakdown.get("age_compatibility"), location_score=breakdown.get("location_relevance"),
            time_score=breakdown.get("time_relevance"), evidence_path=str(match.get("captured_frame") or "").replace("/uploads/", "", 1) or None,
        )
        db.session.add(alert)
        for admin in User.query.filter_by(role="ADMIN", is_active=True).all():
            add_notification(admin.id, "🚨 Emergency Alert: Possible Sighting", f"{person.full_name} / {case.complaint_id} — {overall:.2f}% candidate at {search.camera_location or 'unspecified camera location'}. Verify evidence.")
        if case.user_id:
            add_notification(case.user_id, "Possible sighting detected", f"A possible sighting was detected for {person.full_name}. Authorities are reviewing the evidence; this is not a confirmed identification.")
        record(case, "Emergency alert generated", f"{alert.alert_id}: {person.full_name}, {overall:.2f}%, {search.camera_location or 'location unavailable'}", current_user.id)
        return alert, True

    def queue_embedding(case_id):
        def worker():
            with app.app_context():
                try:
                    with _EMBEDDING_LOCK:
                        case = db.session.get(Complaint, case_id)
                        if not case or not case.missing_person or case.status not in ["Verified", "Under Investigation", "Possible Match", "Located", "Case Closed"]:
                            return
                        if case.missing_person.embeddings:
                            return
                        photo_path = Config.UPLOAD_FOLDER / case.missing_person.photo_path
                    db.session.remove()
                    vector = embedding_for(photo_path)
                    db.session.remove()
                    with _DB_WRITE_LOCK:
                        case = db.session.get(Complaint, case_id)
                        if not case or case.missing_person.embeddings:
                            db.session.rollback()
                            return
                        db.session.add(FaceEmbedding(missing_person_id=case.missing_person.id, complaint_id=case.id,
                                                     photo_path=case.missing_person.photo_path, vector_json=json.dumps(vector),
                                                     model_name=MODEL_NAME))
                        safe_commit()
                except Exception as error:
                    db.session.rollback()
                    print(f"[Find-Me] Background embedding skipped for case {case_id}: {error}")
        threading.Thread(target=worker, name=f"findme-embedding-{case_id}", daemon=True).start()

    @app.get("/")
    def home(): return send_from_directory(Path(app.root_path).parent / "frontend", "index.html")
    @app.get("/<path:asset>")
    def frontend(asset): return send_from_directory(Path(app.root_path).parent / "frontend", asset)
    @app.get("/uploads/<path:asset>")
    def uploads(asset): return send_from_directory(Config.UPLOAD_FOLDER, asset)
    @app.get("/api/health")
    def health(): return jsonify(success=True, status="online", database="connected")

    @app.post("/api/auth/register")
    def register():
        body = request.get_json(silent=True) or {}; username = str(body.get("username", "")).strip(); email = str(body.get("email", "")).strip().lower(); password = body.get("password", "")
        if len(username) < 3 or "@" not in email or len(password) < 8: return api_error("Username, valid email, and an 8-character password are required.")
        if body.get("password_confirmation", password) != password: return api_error("Passwords do not match.")
        if User.query.filter((User.username == username) | (User.email == email)).first(): return api_error("Username or email is already registered.", 409)
        user = User(username=username, email=email, password_hash=generate_password_hash(password), role="CITIZEN"); db.session.add(user); safe_commit()
        return jsonify(success=True, message="Citizen account created. Please log in."), 201
    def login(role):
        body = request.get_json(silent=True) or {}; account = str(body.get("username") or body.get("email") or "").strip().lower(); user = User.query.filter((User.username.ilike(account)) | (User.email.ilike(account))).first()
        if not user or not user.is_active or not check_password_hash(user.password_hash, body.get("password", "")): return api_error("Invalid username/email or password.", 401)
        if role and user.role != role: return api_error("Unauthorized administrative access", 403)
        token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        db.session.add(AuditLog(user_id=user.id, action="LOGIN", description=f"{user.role} login", ip_address=request.remote_addr))
        safe_commit()
        return jsonify(success=True, token=token, user=user_payload(user))
    @app.post("/api/auth/login")
    def citizen_login(): return login("CITIZEN")
    @app.post("/api/admin/login")
    def admin_login(): return login("ADMIN")
    @app.get("/api/auth/me")
    @jwt_required()
    def me():
        current = identity()
        if not current or not current.is_active: return api_error("Authentication required", 401)
        return jsonify(success=True, user=user_payload(current))

    @app.post("/api/auth/forgot-password")
    def forgot_password():
        body = request.get_json(silent=True) or {}
        account = str(body.get("email") or body.get("username") or body.get("account") or "").strip()
        if not account:
            return api_error("Enter your registered email or username.")
        user = User.query.filter((User.email.ilike(account)) | (User.username.ilike(account))).first()
        # Always return the same public response so account existence is not disclosed.
        if not user or user.role != "CITIZEN":
            return jsonify(success=True, message="If a citizen account exists for that email or username, a reset code has been generated.")
        code = f"{secrets.randbelow(1000000):06d}"
        user.reset_token_hash = hashlib.sha256(code.encode()).hexdigest()
        user.reset_token_expires_at = india_now() + timedelta(minutes=10)
        db.session.add(user)
        safe_commit()
        # Local/offline expo build: the code is returned to the caller instead of
        # requiring an external mail provider. Production deployments should send it
        # through a verified email/SMS provider and omit demo_code from the response.
        return jsonify(success=True, message="Reset code generated. It expires in 10 minutes.", demo_code=code)

    @app.post("/api/auth/reset-password")
    def reset_password():
        body = request.get_json(silent=True) or {}
        email = str(body.get("email") or "").strip().lower()
        code = str(body.get("code") or "").strip()
        password = str(body.get("password") or "")
        confirmation = str(body.get("password_confirmation") or password)
        if not email or len(code) != 6 or not code.isdigit():
            return api_error("Enter the email and 6-digit reset code.")
        if len(password) < 8:
            return api_error("New password must contain at least 8 characters.")
        if password != confirmation:
            return api_error("Passwords do not match.")
        user = User.query.filter(User.email.ilike(email)).first()
        if not user or not user.reset_token_hash or not user.reset_token_expires_at:
            return api_error("Invalid or expired reset code.", 400)
        if user.reset_token_expires_at < india_now():
            return api_error("Reset code has expired. Please request a new code.", 400)
        if not secrets.compare_digest(user.reset_token_hash, hashlib.sha256(code.encode()).hexdigest()):
            return api_error("Invalid or expired reset code.", 400)
        user.password_hash = generate_password_hash(password)
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        db.session.add(AuditLog(user_id=user.id, action="PASSWORD_RESET", description="Citizen password reset", ip_address=request.remote_addr))
        safe_commit()
        return jsonify(success=True, message="Password reset successfully. You can sign in now.")

    @app.post("/api/complaints")
    @jwt_required()
    def submit_complaint():
        current = identity()
        if not current or current.role != "CITIZEN":
            return api_error("Citizen authorization required", 403)

        try:
            photo = save_upload(
                "photo",
                "missing_persons",
                Config.ALLOWED_IMAGE_EXTENSIONS
            )
        except ValueError as error:
            return api_error(str(error))

        data = request.form
        required = [
            "giver_full_name",
            "relationship",
            "giver_phone",
            "full_name",
            "last_seen_location"
        ]
        if any(not data.get(key, "").strip() for key in required):
            return api_error(
                "Complete complaint-giver and last-seen details are required."
            )

        submitted_at = india_now()

        giver = ComplaintGiver(
            giver_id=identifier("CG"),
            user_id=current.id,
            full_name=data["giver_full_name"].strip(),
            relationship=data["relationship"].strip(),
            phone=data["giver_phone"].strip(),
            email=data.get("giver_email"),
            preferred_contact=data.get("preferred_contact", "Phone").strip() or "Phone",
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            id_proof_type=data.get("id_proof_type"),
            id_reference=data.get("id_reference")
        )

        case = Complaint(
            complaint_id=identifier("FM"),
            user_id=current.id,
            giver=giver,
            status="Under Verification",
            created_at=submitted_at,
            updated_at=submitted_at
        )

        person = MissingPerson(
            missing_person_id=identifier("MP"),
            full_name=data["full_name"].strip(),
            age=int(data["age"]) if data.get("age", "").isdigit() else None,
            gender=data.get("gender"),
            height=data.get("height"),
            weight=data.get("weight"),
            complexion=data.get("complexion"),
            hair_details=data.get("hair_details"),
            eye_details=data.get("eye_details"),
            clothing=data.get("clothing"),
            accessories=data.get("accessories"),
            appearance_history_json=json.dumps([{
                "date": data.get("last_seen_date"), "time": data.get("last_seen_time"),
                "clothing": data.get("clothing"), "accessories": data.get("accessories"),
                "location": data.get("last_seen_location"), "source": "Registered missing-person report"
            }]),
            identifying_marks=data.get("identifying_marks"),
            medical_information=data.get("medical_information"),
            last_seen_location=data["last_seen_location"].strip(),
            last_seen_date=data.get("last_seen_date"),
            last_seen_time=data.get("last_seen_time"),
            description=data.get("description"),
            photo_path=photo,
            status="Under Verification",
            created_at=submitted_at,
            updated_at=submitted_at
        )

        case.missing_person = person
        db.session.add(case)
        db.session.flush()

        record(
            case,
            "Complaint submitted",
            "Awaiting administration verification",
            current.id
        )

        for admin in User.query.filter_by(role="ADMIN", is_active=True):
            add_notification(
                admin.id,
                "New complaint",
                f"{case.complaint_id} requires verification."
            )

        # Save the complaint before running DeepFace. First-time model
        # initialization can take many seconds and must not delay the citizen.
        safe_commit()

        complaint_id = case.complaint_id
        photo_path = Config.UPLOAD_FOLDER / photo

        def process_ai_async():
            with app.app_context():
                try:
                    # Serialize model initialization/downloads so concurrent
                    # submissions cannot corrupt the same DeepFace weights.
                    with _EMBEDDING_LOCK:
                        submitted_vector = embedding_for(photo_path)

                    with db.session.no_autoflush:
                        background_case = Complaint.query.filter_by(
                            complaint_id=complaint_id
                        ).first()
                        if not background_case:
                            return

                        background_person = background_case.missing_person
                        if not background_person:
                            return

                        existing_embedding = FaceEmbedding.query.filter_by(
                            missing_person_id=background_person.id,
                            complaint_id=background_case.id
                        ).first()

                        if not existing_embedding:
                            db.session.add(
                                FaceEmbedding(
                                    missing_person_id=background_person.id,
                                    complaint_id=background_case.id,
                                    photo_path=background_person.photo_path,
                                    vector_json=json.dumps(submitted_vector),
                                    model_name=MODEL_NAME
                                )
                            )

                        duplicate_leads = []
                        for existing in MissingPerson.query.filter_by(
                            is_verified=True
                        ).all():
                            for existing_embedding in existing.embeddings:
                                score = similarity(
                                    existing_embedding.vector_json,
                                    submitted_vector
                                )
                                if score >= 88:
                                    duplicate_leads.append(
                                        (
                                            existing.missing_person_id,
                                            existing.complaint.complaint_id,
                                            round(score, 2)
                                        )
                                    )
                                    break

                        for _, existing_complaint_id, score in duplicate_leads:
                            add_notification(
                                background_case.user_id,
                                "Possible duplicate case",
                                f"{background_case.complaint_id} resembles "
                                f"{existing_complaint_id} with {score}% similarity. "
                                "Officer review is required."
                            )

                        if duplicate_leads:
                            background_case.admin_remarks = (
                                (background_case.admin_remarks or "")
                                + "\nAI duplicate screening completed; officer review required."
                            )

                        safe_commit()

                except Exception as error:
                    db.session.rollback()
                    # The complaint is already safely stored. Record the AI
                    # failure for administrators instead of turning it into a
                    # failed citizen submission.
                    try:
                        background_case = Complaint.query.filter_by(
                            complaint_id=complaint_id
                        ).first()
                        if background_case:
                            record(
                                background_case,
                                "AI processing pending",
                                f"Face embedding will be retried during verification: {error}",
                                None
                            )
                            safe_commit()
                    except Exception:
                        db.session.rollback()

        threading.Thread(
            target=process_ai_async,
            name=f"findme-ai-{complaint_id}",
            daemon=True
        ).start()

        return jsonify(
            success=True,
            message="Complaint submitted.",
            ids={
                "complaint_id": case.complaint_id,
                "complaint_giver_id": giver.giver_id,
                "missing_person_id": person.missing_person_id
            },
            duplicate_leads=[],
            complaint=serialize_case(case)
        ), 201

    @app.get("/api/complaints/my")
    @jwt_required()
    def my_cases():
        current = identity()
        cases = (
            Complaint.query
            .filter(
                Complaint.user_id == current.id,
                Complaint.status != "Deleted"
            )
            .order_by(Complaint.created_at.desc())
            .all()
        )
        return jsonify(
            success=True,
            complaints=[serialize_case(case) for case in cases]
        )

    @app.delete("/api/complaints/<complaint_id>")
    @jwt_required()
    def delete_complaint(complaint_id):
        current = identity()
        case = Complaint.query.filter_by(
            complaint_id=complaint_id
        ).first()

        if not case:
            return api_error("Complaint not found", 404)

        if current.role != "CITIZEN" or case.user_id != current.id:
            return api_error(
                "You are not authorized to delete this complaint.",
                403
            )

        if case.status == "Deleted":
            return jsonify(
                success=True,
                message="Complaint is already deleted.",
                complaint_id=case.complaint_id
            )

        original_status = case.status
        case.status = "Deleted"
        case.admin_remarks = (
            (case.admin_remarks or "")
            + "\nDeleted by citizen from My Reports."
        )
        case.updated_at = india_now()

        record(
            case,
            "CASE DELETED BY USER",
            f"Citizen deleted report while it was in status: {original_status}",
            current.id
        )
        add_notification(
            current.id,
            "Report Deleted",
            f"Your report {case.complaint_id} has been deleted successfully."
        )
        audit(
            "CASE DELETED BY USER",
            f"{case.complaint_id} deleted by citizen"
        )
        safe_commit()

        return jsonify(
            success=True,
            message="Report deleted successfully.",
            complaint_id=case.complaint_id
        )

    @app.get("/api/complaints/<complaint_id>")
    @jwt_required()
    def case_detail(complaint_id):
        case = Complaint.query.filter_by(complaint_id=complaint_id).first(); current = identity()
        if not case: return api_error("Complaint not found", 404)
        if current.role != "ADMIN" and case.user_id != current.id: return api_error("You are not authorized to view this complaint.", 403)
        timeline = InvestigationRecord.query.filter_by(complaint_id=case.id).order_by(InvestigationRecord.created_at).all()
        sightings = Sighting.query.filter_by(complaint_id=case.id).order_by(
            Sighting.sighting_date.asc(), Sighting.sighting_time.asc(), Sighting.created_at.asc()
        ).all()
        movement = [{
            "type": "last_seen",
            "location": case.missing_person.last_seen_location,
            "date": case.missing_person.last_seen_date,
            "time": case.missing_person.last_seen_time,
            "description": "Registered last-known location"
        }]
        movement.extend([{
            "type": "sighting",
            "location": item.location,
            "date": item.sighting_date,
            "time": item.sighting_time,
            "description": item.description,
            "status": item.status,
            "photo_url": f"/uploads/{item.photo_path}" if item.photo_path else None
        } for item in sightings])
        return jsonify(
            success=True,
            complaint=serialize_case(case),
            timeline=[{"action": item.action, "description": item.description, "created_at": iso_india(item.created_at)} for item in timeline],
            movement_timeline=movement,
            sightings=[{
                "location": item.location, "date": item.sighting_date, "time": item.sighting_time,
                "description": item.description, "status": item.status
            } for item in sightings]
        )

    @app.get("/api/admin/dashboard")
    @role_required("ADMIN")
    def dashboard():
        counts = {status: Complaint.query.filter_by(status=status).count() for status in STATUSES}; return jsonify(success=True, statistics={"total_cases": Complaint.query.count(), "pending_verification": counts["Under Verification"], "under_investigation": counts["Under Investigation"], "possible_matches": counts["Possible Match"], "located": counts["Located"], "closed": counts["Case Closed"], "sightings": Sighting.query.count()}, by_status=counts)
    @app.get("/api/admin/complaints")
    @role_required("ADMIN")
    def all_cases():
        query = Complaint.query.join(MissingPerson)
        for field in ["status"]:
            if request.args.get(field): query = query.filter(getattr(Complaint, field) == request.args[field])
        if request.args.get("q"):
            search = f"%{request.args['q']}%"; query = query.filter((Complaint.complaint_id.ilike(search)) | (MissingPerson.missing_person_id.ilike(search)) | (MissingPerson.full_name.ilike(search)) | (MissingPerson.last_seen_location.ilike(search)))
        return jsonify(success=True, complaints=[serialize_case(case) for case in query.order_by(Complaint.created_at.desc()).all()])
    @app.patch("/api/admin/complaints/<complaint_id>")
    @role_required("ADMIN")
    def update_case(complaint_id):
        case = Complaint.query.filter_by(complaint_id=complaint_id).first()
        body = request.get_json(silent=True) or {}
        current = identity()
        if not case:
            return api_error("Complaint not found", 404)

        status = str(body.get("status", case.status)).strip()
        if status not in STATUSES:
            return api_error("Invalid complaint status.")

        remarks = body.get("remarks")
        enquiry_notes = body.get("enquiry_notes")
        enquiry_result = body.get("enquiry_result")
        case.status = status
        case.missing_person.status = status
        # Keep verification/enquiry information in the backend source of truth.
        if remarks is not None and str(remarks).strip():
            case.admin_remarks = str(remarks).strip()
        if enquiry_notes is not None:
            case.enquiry_notes = str(enquiry_notes).strip() or None
            if case.enquiry_notes:
                case.admin_remarks = case.enquiry_notes
        if enquiry_result is not None and str(enquiry_result).strip():
            case.enquiry_result = str(enquiry_result).strip()
        elif status == "Verified":
            case.enquiry_result = "Verified"
        elif status == "Rejected":
            case.enquiry_result = "Rejected"

        if status in ["Verified", "Under Investigation", "Possible Match", "Located", "Case Closed"]:
            case.missing_person.is_verified = True

        case.verified_by_id = current.id
        case.verified_at = india_now()
        record(case, f"Status changed to {status}", case.admin_remarks or "Updated by administration", current.id)
        citizen_notification = add_notification(
            case.user_id,
            "Case status updated",
            f"Your complaint {case.complaint_id} is now {status}."
        )
        # Verified cases get a clear, separate notification so the citizen
        # account has an unmistakable confirmation rather than a generic update.
        if status == "Verified":
            add_notification(
                case.user_id,
                "Complaint verified",
                f"Your complaint {case.complaint_id} has been verified by authorized personnel."
            )
        audit("CASE_UPDATE", case.complaint_id)
        needs_embedding = status in ["Verified", "Under Investigation", "Possible Match", "Located", "Case Closed"] and not case.missing_person.embeddings
        safe_commit()

        # Never hold a SQLite transaction open while DeepFace downloads/loads
        # models. The AI job starts only after the status transaction is committed.
        if needs_embedding:
            queue_embedding(case.id)

        return jsonify(
            success=True,
            complaint=serialize_case(case),
            notification_created=bool(citizen_notification),
            notification_id=(citizen_notification.id if citizen_notification else None),
        )

    @app.post("/api/sightings")
    @jwt_required()
    def report_sighting():
        current = identity(); data = request.form; case = Complaint.query.filter_by(complaint_id=data.get("complaint_id", "")).first()
        if not case: return api_error("Valid Complaint ID is required.", 404)
        try: photo = save_upload("photo", "evidence", Config.ALLOWED_IMAGE_EXTENSIONS) if request.files.get("photo") else None
        except ValueError as error: return api_error(str(error))
        sighting = Sighting(complaint_id=case.id, reporter_id=current.id, location=data.get("location", "").strip(), sighting_date=data.get("date"), sighting_time=data.get("time"), description=data.get("description"), photo_path=photo)
        if not sighting.location: return api_error("Sighting location is required.")
        db.session.add(sighting); record(case, "Sighting reported", sighting.location, current.id)
        for admin in User.query.filter_by(role="ADMIN", is_active=True): add_notification(admin.id, "New sighting", f"Sighting received for {case.complaint_id}.")
        safe_commit(); return jsonify(success=True, message="Sighting reported for officer review."), 201
    @app.get("/api/email/status")
    @jwt_required()
    def email_status():
        current = identity()
        configured = bool(
            Config.SMTP_HOST and
            Config.SMTP_USERNAME and
            Config.SMTP_PASSWORD
        )
        return jsonify(
            success=True,
            configured=configured,
            recipient=current.email if current else "",
            provider=Config.SMTP_HOST or "Not configured",
            message=(
                "Real email notifications are configured."
                if configured
                else "Email preference is saved, but real SMTP delivery is not configured yet."
            )
        )

    @app.get("/api/notifications")
    @jwt_required()
    def notifications():
        current = identity(); rows = Notification.query.filter_by(user_id=current.id).order_by(Notification.created_at.desc()).all(); return jsonify(success=True, notifications=[{"id": row.id, "title": row.title, "message": row.message, "read": row.is_read, "created_at": iso_india(row.created_at)} for row in rows])

    @app.get("/api/notifications/summary")
    @jwt_required()
    def notifications_summary():
        current = identity()
        total = Notification.query.filter_by(user_id=current.id).count()
        unread = Notification.query.filter_by(user_id=current.id, is_read=False).count()
        return jsonify(success=True, total=total, unread=unread)

    @app.post("/api/notifications/clear")
    @jwt_required()
    def clear_notifications():
        """Delete all notifications belonging to the currently signed-in user."""
        current = identity()
        Notification.query.filter_by(user_id=current.id).delete(
            synchronize_session=False
        )
        safe_commit()
        return jsonify(success=True, message="Notifications cleared.")

    @app.post("/api/notifications/read-all")
    @jwt_required()
    def mark_notifications_read():
        current = identity()
        Notification.query.filter_by(user_id=current.id, is_read=False).update(
            {"is_read": True}, synchronize_session=False
        )
        safe_commit()
        return jsonify(success=True)

    @app.get("/api/emergency-alerts")
    @role_required("ADMIN")
    def emergency_alerts():
        status = (request.args.get("status") or "").strip().upper()
        query = EmergencyAlert.query
        if status and status != "ALL":
            query = query.filter_by(status=status)
        rows = query.order_by(EmergencyAlert.created_at.desc()).all()
        return jsonify(success=True, alerts=[{
            "id": row.id, "alert_id": row.alert_id, "status": row.status, "severity": row.severity,
            "title": row.title, "message": row.message, "alert_reason": row.alert_reason,
            "complaint_id": row.complaint.complaint_id if getattr(row, "complaint", None) else None,
            "person_name": row.missing_person.full_name if getattr(row, "missing_person", None) else None,
            "missing_person_id": row.missing_person.missing_person_id if getattr(row, "missing_person", None) else None,
            "camera_location": row.camera_location, "capture_date": row.capture_date, "capture_time": row.capture_time,
            "overall_score": row.overall_score, "face_score": row.face_score, "clothing_score": row.clothing_score,
            "age_score": row.age_score, "location_score": row.location_score, "time_score": row.time_score,
            "evidence_path": f"/uploads/{row.evidence_path}" if row.evidence_path else None,
            "created_at": iso_india(row.created_at), "acknowledged_at": iso_india(row.acknowledged_at),
            "resolved_at": iso_india(row.resolved_at), "dismissed_at": iso_india(row.dismissed_at),
        } for row in rows])

    @app.patch("/api/emergency-alerts/<alert_id>")
    @role_required("ADMIN")
    def update_emergency_alert(alert_id):
        alert = EmergencyAlert.query.filter_by(alert_id=alert_id).first()
        if not alert:
            return api_error("Emergency alert not found.", 404)
        status = str((request.get_json(silent=True) or {}).get("status", "")).strip().upper()
        if status not in {"OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"}:
            return api_error("Invalid emergency alert status.")
        current = identity()
        alert.status = status
        if status == "ACKNOWLEDGED":
            alert.acknowledged_by_id = current.id; alert.acknowledged_at = india_now()
        elif status == "RESOLVED":
            alert.resolved_at = india_now()
        elif status == "DISMISSED":
            alert.dismissed_at = india_now()
        case = Complaint.query.get(alert.complaint_id)
        if case:
            record(case, f"Emergency alert {status.lower()}", alert.alert_id, current.id)
            if case.user_id and status in {"RESOLVED", "DISMISSED"}:
                add_notification(case.user_id, "Emergency alert updated", f"Alert {alert.alert_id} has been marked {status.lower()} by authorized personnel.")
        audit("EMERGENCY_ALERT_UPDATE", f"{alert.alert_id}: {status}")
        safe_commit()
        return jsonify(success=True, alert={"alert_id": alert.alert_id, "status": alert.status})

    @app.post("/api/search/image")
    @role_required("ADMIN")
    def image_search():
        try: uploaded = save_upload("image", "search_images", Config.ALLOWED_IMAGE_EXTENSIONS); vector = embedding_for(Config.UPLOAD_FOLDER / uploaded)
        except (ValueError, RuntimeError) as error: return api_error(str(error))
        current = identity(); search = ImageSearch(search_id=identifier("IS"), officer_id=current.id, image_path=uploaded); db.session.add(search); db.session.flush(); matches = []
        for person in MissingPerson.query.filter_by(is_verified=True).all():
            embeddings = FaceEmbedding.query.filter_by(missing_person_id=person.id).all()
            if not embeddings: continue
            score = max(similarity(item.vector_json, vector) for item in embeddings)
            if score >= 55:
                match = AIMatchResult(missing_person_id=person.id, image_search_id=search.id, similarity=score, confidence=confidence(score)); db.session.add(match); matches.append({"missing_person_id": person.missing_person_id, "complaint_id": person.complaint.complaint_id, "name": person.full_name, "similarity": round(score, 2), "confidence": confidence(score), "status": person.status, "last_seen_location": person.last_seen_location, "photo_url": f"/uploads/{person.photo_path}", "view_case": f"/api/complaints/{person.complaint.complaint_id}", "review_match": match.id, "result": "POSSIBLE MATCH"})
        audit("IMAGE_SEARCH", search.search_id); safe_commit(); return jsonify(success=True, message="Matches are AI leads requiring officer verification.", search_id=search.search_id, uploaded_image=f"/uploads/{uploaded}", matches=sorted(matches, key=lambda row: row["similarity"], reverse=True))
    def _video_metadata(search):
        return {
            "camera_location": getattr(search, "camera_location", None),
            "capture_date": getattr(search, "capture_date", None),
            "capture_time": getattr(search, "capture_time", None),
        }

    @app.post("/api/videos/upload")
    @role_required("ADMIN")
    def upload_video():
        try: uploaded = save_upload("video", "videos", Config.ALLOWED_VIDEO_EXTENSIONS)
        except ValueError as error: return api_error(str(error))
        search = VideoSearch(
            search_id=identifier("VS"), officer_id=identity().id, video_path=uploaded,
            camera_location=(request.form.get("camera_location") or "").strip() or None,
            capture_date=(request.form.get("capture_date") or "").strip() or None,
            capture_time=(request.form.get("capture_time") or "").strip() or None,
        )
        db.session.add(search); safe_commit()
        return jsonify(success=True, filename=Path(uploaded).name, search_id=search.search_id, metadata=_video_metadata(search))
    def _annotate_candidate_frame(frame, facial_area, label=""):
        """V25: preserve the original CCTV evidence frame.

        No red box/circle or POSSIBLE MATCH overlay is burned into evidence.
        Identity is represented by the candidate result and score instead of
        a potentially misleading visual highlight.
        """
        return frame.copy() if frame is not None else frame


    @app.post("/api/videos/process-async")
    @role_required("ADMIN")
    def process_video_async():
        """Queue CPU-heavy video analysis and return immediately."""
        body = request.get_json(silent=True) or {}
        filename = secure_filename(str(body.get("filename", "")))
        if not filename:
            return api_error("Video filename is required.")

        search = VideoSearch.query.filter(
            VideoSearch.video_path.like(f"%/{filename}")
        ).order_by(VideoSearch.created_at.desc()).first()
        if not search:
            return api_error("Uploaded video was not found.", 404)

        job_id = identifier("JOB")
        auth_header = request.headers.get("Authorization", "")
        with _VIDEO_JOBS_LOCK:
            _VIDEO_JOBS[job_id] = {
                "job_id": job_id,
                "status": "queued",
                "filename": filename,
                "started_at": time.time(),
                "finished_at": None,
                "result": None,
                "error": None,
            }

        def worker():
            try:
                with _VIDEO_JOBS_LOCK:
                    if job_id in _VIDEO_JOBS:
                        _VIDEO_JOBS[job_id]["status"] = "processing"

                # Re-enter the existing authenticated processor in its own
                # Flask request context. This keeps the browser request short
                # without duplicating the large tested processing pipeline.
                with app.test_request_context(
                    "/api/videos/process",
                    method="POST",
                    json=body,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                    },
                ):
                    response = process_video()
                    if isinstance(response, tuple):
                        response_obj = response[0]
                        status_code = int(response[1]) if len(response) > 1 else 200
                    else:
                        response_obj = response
                        status_code = getattr(response_obj, "status_code", 200)
                    payload = response_obj.get_json(silent=True) if hasattr(response_obj, "get_json") else None

                if not isinstance(payload, dict):
                    payload = {"success": False, "message": "AI processing returned an invalid response."}

                with _VIDEO_JOBS_LOCK:
                    job = _VIDEO_JOBS.get(job_id)
                    if job is not None:
                        job["status"] = "completed" if status_code < 400 and payload.get("success", True) else "failed"
                        job["result"] = payload
                        job["error"] = None if job["status"] == "completed" else payload.get("message")
                        job["finished_at"] = time.time()
            except Exception as exc:
                print(f"[Find-Me] Async video job {job_id} failed: {exc}")
                with _VIDEO_JOBS_LOCK:
                    job = _VIDEO_JOBS.get(job_id)
                    if job is not None:
                        job["status"] = "failed"
                        job["error"] = str(exc)
                        job["result"] = {"success": False, "message": str(exc)}
                        job["finished_at"] = time.time()

        threading.Thread(
            target=worker,
            name=f"findme-video-{job_id}",
            daemon=True,
        ).start()

        return jsonify(
            success=True,
            job_id=job_id,
            status="queued",
            message="Video accepted. AI processing is running in the background.",
        ), 202

    @app.get("/api/videos/process-status/<job_id>")
    @role_required("ADMIN")
    def video_process_status(job_id):
        with _VIDEO_JOBS_LOCK:
            job = _VIDEO_JOBS.get(job_id)

        if not job:
            return api_error("AI processing job was not found.", 404)

        payload = {
            "success": True,
            "job_id": job["job_id"],
            "status": job["status"],
            "filename": job["filename"],
            "elapsed_seconds": round(
                ((job["finished_at"] or time.time()) - job["started_at"]), 1
            ),
        }

        if job["status"] == "completed":
            payload["result"] = job["result"]
        elif job["status"] == "failed":
            payload["success"] = False
            payload["message"] = job["error"] or "AI video processing failed."

        return jsonify(payload)

    @app.post("/api/videos/process")
    @role_required("ADMIN")
    def process_video():
        body = request.get_json(silent=True) or {}
        filename = secure_filename(str(body.get("filename", "")))
        search = VideoSearch.query.filter(VideoSearch.video_path.like(f"%/{filename}")).order_by(VideoSearch.created_at.desc()).first()
        if not search:
            return api_error("Uploaded video was not found.", 404)

        # V6 accepts investigation context at processing time too, so videos
        # uploaded by the older screens can still participate in multi-clue scoring.
        if body.get("camera_location") is not None:
            search.camera_location = str(body.get("camera_location") or "").strip() or None
        if body.get("capture_date") is not None:
            search.capture_date = str(body.get("capture_date") or "").strip() or None
        if body.get("capture_time") is not None:
            search.capture_time = str(body.get("capture_time") or "").strip() or None
        safe_commit()

        processing_started = time.perf_counter()
        video_path = Config.UPLOAD_FOLDER / search.video_path
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            return api_error("Unable to decode the uploaded video. Try MP4/H.264 or another supported video format.")

        fps = capture.get(cv2.CAP_PROP_FPS) or 25
        total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if total <= 0:
            capture.release()
            return api_error("The uploaded video contains no readable frames.")

        # Adaptive CCTV sampling: short clips keep the higher-evidence 1.25s
        # cadence, while long clips use a wider cadence so CPU-only FaceNet
        # processing does not become impractically slow. Every sampled frame
        # still goes through face detection + quality filtering + identity
        # scoring; this changes sampling density, not the identity gate.
        duration_seconds = total / max(float(fps), 1.0)
        # Speed/coverage balance: keep roughly 20-24 recognition frames for
        # short/medium clips. This avoids the expensive 11-frame RetinaFace +
        # ArcFace path that could take nearly two minutes on CPU, while still
        # giving the detector enough temporal coverage to catch a moving face.
        if duration_seconds <= 20:
            sample_interval = 1.0
        elif duration_seconds <= 60:
            sample_interval = max(1.5, duration_seconds / 24.0)
        elif duration_seconds <= 120:
            sample_interval = max(2.5, duration_seconds / 24.0)
        elif duration_seconds <= 300:
            sample_interval = 4.0
        elif duration_seconds <= 600:
            sample_interval = 6.0
        else:
            sample_interval = 8.0
        step = max(int(round(fps * sample_interval)), 1)
        results = []
        frame_number = 0
        frames_extracted = 0
        frames_with_faces = 0
        faces_detected = 0
        detector_errors = 0
        best_observed_score = 0.0
        best_observed_face_score = 0.0
        best_observed_person = None
        best_observed_frame = None
        best_observed_breakdown = None
        best_observed_evidence = None
        best_observed_face_area = None
        candidate_history = {}
        candidate_analysis = {}
        fast_exit = False
        current = identity()

        # V23: track each detected face across sampled frames. This prevents a
        # single high-scoring false positive from deciding the evidence when a
        # different person becomes clearer later in the clip.
        face_tracks = {}
        next_track_id = 1

        def _bbox_iou(a, b):
            try:
                ax1, ay1 = int(a.get("x", 0)), int(a.get("y", 0))
                ax2, ay2 = ax1 + int(a.get("w", 0)), ay1 + int(a.get("h", 0))
                bx1, by1 = int(b.get("x", 0)), int(b.get("y", 0))
                bx2, by2 = bx1 + int(b.get("w", 0)), by1 + int(b.get("h", 0))
                ix1, iy1, ix2, iy2 = max(ax1, bx1), max(ay1, by1), min(ax2, bx2), min(ay2, by2)
                iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
                inter = iw * ih
                ua = max(0, ax2-ax1) * max(0, ay2-ay1)
                ub = max(0, bx2-bx1) * max(0, by2-by1)
                return inter / float(max(ua + ub - inter, 1))
            except Exception:
                return 0.0

        def _assign_face_track(area, frame_index):
            nonlocal next_track_id
            if not area:
                return None
            best_id, best_metric = None, 0.0
            ax = float(area.get("x", 0)) + float(area.get("w", 0))/2.0
            ay = float(area.get("y", 0)) + float(area.get("h", 0))/2.0
            aw = max(float(area.get("w", 1)), 1.0)
            ah = max(float(area.get("h", 1)), 1.0)
            for tid, track in list(face_tracks.items()):
                if frame_index - int(track.get("last_frame", frame_index)) > max(4, int(round(fps * 2))):
                    continue
                prev = track.get("area") or {}
                iou = _bbox_iou(area, prev)
                px = float(prev.get("x", 0)) + float(prev.get("w", 0))/2.0
                py = float(prev.get("y", 0)) + float(prev.get("h", 0))/2.0
                dist = ((ax-px)**2 + (ay-py)**2) ** 0.5
                norm = max((aw + ah) * 0.9, 30.0)
                proximity = max(0.0, 1.0 - dist/norm)
                metric = max(iou, proximity * 0.72)
                if metric > best_metric:
                    best_metric, best_id = metric, tid
            if best_id is None or best_metric < 0.28:
                best_id = next_track_id
                next_track_id += 1
                face_tracks[best_id] = {
                    "last_frame": frame_index, "area": dict(area),
                    "observations": [], "best": None, "scores": {},
                }
            else:
                face_tracks[best_id]["last_frame"] = frame_index
                face_tracks[best_id]["area"] = dict(area)
            return best_id

        # A video match is intentionally restricted to verified missing-person
        # records. The registration embedding is generated separately and stored
        # in face_embeddings.
        # Build the verified reference set. If a verified case is missing an
        # embedding (for example because its first background AI job failed),
        # generate it now from the registered photo. This makes verification
        # self-healing and prevents a valid case from becoming invisible to
        # video matching.
        verified = []
        embedding_repair_count = 0
        for person in MissingPerson.query.filter_by(is_verified=True).all():
            # Only use embeddings produced by the CURRENT FaceNet512 model.
            # Older Find-Me databases may contain Facenet/other-model vectors;
            # comparing those with a 512-dimensional FaceNet512 vector gives a
            # silent zero score because the vector shapes differ.
            compatible = []
            for embedding in list(person.embeddings):
                try:
                    vector = json.loads(embedding.vector_json) if isinstance(embedding.vector_json, str) else embedding.vector_json
                    if embedding.model_name == MODEL_NAME and len(vector) == 512:
                        compatible.append(embedding)
                except Exception:
                    continue

            embeddings = compatible
            if not embeddings and person.photo_path:
                try:
                    photo_path = Config.UPLOAD_FOLDER / person.photo_path
                    with _EMBEDDING_LOCK:
                        reference_vector = embedding_for(photo_path)
                    repaired = FaceEmbedding(
                        missing_person_id=person.id,
                        complaint_id=person.complaint.id,
                        photo_path=person.photo_path,
                        vector_json=json.dumps(reference_vector),
                        model_name=MODEL_NAME,
                    )
                    db.session.add(repaired)
                    db.session.flush()
                    embeddings = [repaired]
                    embedding_repair_count += 1
                    print(f"[Find-Me] Created/repaired FaceNet512 embedding for {person.missing_person_id}")
                except Exception as error:
                    print(f"[Find-Me] Could not create/repaired FaceNet512 embedding for {person.missing_person_id}: {error}")

            # V27: keep the stored embedding as the fast baseline, but attach
            # a lazy reference-template list to each verified person. The extra
            # templates are generated only when that person becomes a serious
            # CCTV candidate, so accuracy improves without making every video
            # start with a large FaceNet warm-up cost.
            reference_templates = []
            arcface_templates = []
            efficientnet_templates = []
            for embedding in embeddings:
                verified.append((person, embedding, reference_templates, arcface_templates, efficientnet_templates))

        if not verified:
            capture.release()
            db.session.rollback()
            return jsonify(
                success=True,
                message=(
                    "Video was decoded, but no verified missing-person face "
                    "embedding could be generated from the registered records."
                ),
                video=filename,
                total_frames=total,
                frames_extracted=0,
                frames_with_faces=0,
                faces_detected=0,
                matches_found=0,
                embedding_repairs=embedding_repair_count,
                matches=[],
            )

        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                current_frame_number = frame_number
                frame_number += 1
                if current_frame_number % step != 0:
                    continue

                frames_extracted += 1
                try:
                    face_regions = face_regions_for(frame)
                    faces = []
                    for area in face_regions:
                        track_id = _assign_face_track(area, current_frame_number)
                        track = face_tracks.get(track_id) if track_id is not None else None
                        vector = None
                        # Reuse the FaceNet512 embedding for the same tracked
                        # person across nearby sampled frames. A fresh embedding
                        # is taken periodically so pose/lighting changes can
                        # still improve the identity score.
                        refresh_after = max(step * 3, 1)
                        if track and track.get("embedding") is not None and (
                            current_frame_number - int(track.get("embedding_frame", -10**9)) < refresh_after
                        ):
                            vector = track.get("embedding")
                        else:
                            vector = face_embedding_from_crop(frame, area)
                            if vector is not None and track is not None:
                                track["embedding"] = vector
                                track["embedding_frame"] = current_frame_number
                        if vector:
                            faces.append({
                                "embedding": vector,
                                "facial_area": area,
                                "detector_confidence": 0.90,
                                "_track_id": track_id,
                            })
                    # Fast CPU path: Haar proposals are used first. RetinaFace
                    # remains a targeted refinement for the strongest candidate.
                except (ValueError, RuntimeError) as error:
                    detector_errors += 1
                    faces = []

                if faces:
                    frames_with_faces += 1
                    faces_detected += len(faces)

                for face_index, face in enumerate(faces, start=1):
                    # V9 face-quality gate: calculate quality for every observation
                    # before matching. Weak/tiny/blurred faces are excluded from
                    # candidate scoring rather than lowering the face threshold.
                    quality = face_quality(
                        frame,
                        face.get("facial_area"),
                        face.get("detector_confidence") or face.get("confidence"),
                    )
                    if not quality.get("usable", False):
                        print(
                            f"[Find-Me] Skipping low-quality face {face_index} at frame {frame_number}: "
                            f"{quality.get('score', 0):.2f}% {quality.get('reasons', [])}"
                        )
                        continue
                    vector = face["embedding"]
                    crop_vector = None
                    aligned_vector = None

                    # FAST PATH: the first ranking pass uses only the already
                    # computed FaceNet512 vector. Augmented views are generated
                    # only after the top candidate is known, so we do not run
                    # several extra FaceNet inferences for every person/frame.
                    aligned_vector = None
                    query_vectors = [vector]

                    # V23: compare against several reference templates and use a
                    # robust top-template aggregate instead of a single lucky
                    # cosine maximum. This reduces false positives while keeping
                    # genuine pose/lighting variants useful.
                    best_person = None
                    best_face_score = 0.0
                    best_arcface_score = None
                    best_face_quality = quality
                    best_reference_templates = None

                    # Multi-view FaceNet512 identity pass: compare the detected face and
                    # controlled augmented views against every verified person's
                    # reference templates. This improves genuine matches when
                    # the CCTV view differs from the registration photo.
                    preliminary_candidates = []
                    for person, embedding, reference_templates, arcface_templates, efficientnet_templates in verified:
                        refs = list(reference_templates or [])
                        try:
                            stored = json.loads(embedding.vector_json) if isinstance(embedding.vector_json, str) else embedding.vector_json
                        except Exception:
                            stored = None
                        if stored is not None:
                            refs.append(stored)
                        # Score EVERY available query representation. The previous
                        # implementation calculated all scores but then used only
                        # scores[0], so an aligned/refined query could never improve
                        # the preliminary ranking.
                        scores = [
                            float(robust_face_similarity(refs, qv))
                            for qv in query_vectors
                        ]
                        scores = [float(v) for v in scores if v > 0]
                        if not scores:
                            continue
                        face_score = max(scores)
                        preliminary_candidates.append(
                            (float(face_score), person, embedding, reference_templates, arcface_templates, efficientnet_templates)
                        )

                    preliminary_candidates.sort(key=lambda item: item[0], reverse=True)

                    # ACCURACY + SPEED: only the strongest candidate gets the
                    # expensive augmentation, EfficientNet-B0 and RetinaFace
                    # alignment passes. FaceNet512 remains the primary identity
                    # model; the extra views are used to recover genuine higher
                    # similarity under lighting, blur and lower-face masking.
                    for candidate_index, (preliminary_score, person, embedding, reference_templates, arcface_templates, efficientnet_templates) in enumerate(preliminary_candidates[:1]):
                        if not reference_templates and person.photo_path and preliminary_score >= 55.0:
                            try:
                                photo_path = Config.UPLOAD_FOLDER / person.photo_path
                                with _EMBEDDING_LOCK:
                                    extra_templates = reference_embeddings_for(photo_path)
                                if extra_templates:
                                    reference_templates.extend(extra_templates)
                            except Exception as template_error:
                                print(
                                    f"[Find-Me] Reference-template enhancement skipped for "
                                    f"{person.missing_person_id}: {template_error}"
                                )

                        # Generate controlled augmented FaceNet views only for
                        # the leading candidate. This is the main accuracy boost
                        # without multiplying CPU work for every database record.
                        try:
                            augmented_query_vectors = face_augmented_embeddings_from_crop(
                                frame, face.get("facial_area")
                            )
                            for qv in augmented_query_vectors:
                                refined_candidate_score = float(robust_face_similarity(
                                    list(reference_templates or []) + [
                                        json.loads(embedding.vector_json) if isinstance(embedding.vector_json, str) else embedding.vector_json
                                    ], qv
                                ))
                                preliminary_score = max(float(preliminary_score), refined_candidate_score)
                        except Exception as augmentation_error:
                            print(f"[Find-Me] Query augmentation skipped: {augmentation_error}")

                        # EfficientNet-B0 transfer-learning corroboration: use
                        # ImageNet-pretrained visual features only for candidate
                        # ranking. FaceNet512 remains the identity-specialized
                        # primary score and is never replaced or artificially
                        # boosted by this model. The B0 model runs only for the
                        # top two FaceNet candidates, keeping the video path fast.
                        efficientnet_score = 0.0
                        if candidate_index == 0 and preliminary_score >= 55.0:
                            try:
                                if not efficientnet_templates and person.photo_path:
                                    photo_path = Config.UPLOAD_FOLDER / person.photo_path
                                    with _EMBEDDING_LOCK:
                                        extra_visual_templates = efficientnet_b0_reference_embeddings_for(photo_path)
                                    if extra_visual_templates:
                                        efficientnet_templates.extend(extra_visual_templates)
                                visual_query = efficientnet_b0_embedding_from_crop(
                                    frame, face.get("facial_area")
                                )
                                efficientnet_score = efficientnet_similarity(
                                    efficientnet_templates, visual_query
                                )
                            except Exception as visual_error:
                                print(f"[Find-Me] EfficientNet-B0 corroboration skipped for {person.missing_person_id}: {visual_error}")

                        # Accuracy refinement: only the strongest candidate gets
                        # one RetinaFace-aligned FaceNet query. This preserves a
                        # chance to recover a genuine high similarity without
                        # running a second detector/model for every face/candidate.
                        # Accuracy refinement: compute one aligned FaceNet score only
                        # for the top candidates. Keep it local to this candidate so
                        # an undefined/stale score can never leak into the matcher.
                        refined_score = float(preliminary_score)
                        if preliminary_score >= 58.0:
                            try:
                                aligned_vector = aligned_face_embedding_from_crop(
                                    frame, face.get("facial_area")
                                )
                                if aligned_vector:
                                    refined_score = max(
                                        refined_score,
                                        float(robust_face_similarity(
                                            list(reference_templates or []), aligned_vector
                                        ))
                                    )
                            except Exception:
                                pass

                        # FaceNet remains the primary identity score. The aligned
                        # query is corroborating evidence from the same model; no
                        # artificial cross-model boost is introduced.
                        # Hybrid ranking score is only a tie-breaker/ranking aid:
                        # 80% FaceNet identity similarity + 20% EfficientNet visual
                        # corroboration. The displayed/gated face score remains the
                        # real FaceNet score. This prevents a generic visual model
                        # from turning an unrelated person into an identity match.
                        hybrid_rank = (0.80 * float(refined_score)) + (0.20 * float(efficientnet_score or 0.0))
                        current_rank = (0.80 * float(best_face_score)) + (0.20 * float(getattr(best_person, "_findme_effnet_score", 0.0) or 0.0)) if best_person is not None else -1.0
                        if hybrid_rank > current_rank:
                            best_person = person
                            best_face_score = float(refined_score)
                            best_arcface_score = None
                            best_reference_templates = reference_templates
                            try:
                                best_person._findme_effnet_score = float(efficientnet_score)
                            except Exception:
                                pass

                    best_score = 0.0
                    best_clothing_score = 50.0
                    best_age_score = 50.0
                    best_location_score = 50.0
                    best_time_score = 50.0
                    best_observed_age = None
                    if best_person is not None:
                        best_clothing_score = clothing_similarity(
                            best_person.photo_path, frame, face.get("facial_area"), Config.UPLOAD_FOLDER
                        )
                        # V25 speed mode: age estimation is disabled during
                        # live CCTV screening because DeepFace age analysis is
                        # expensive. Age remains a neutral supporting clue.
                        best_observed_age = None
                        best_age_score = 50.0
                        best_location_score = location_relevance(best_person.last_seen_location, search.camera_location)
                        best_time_score = time_relevance(best_person.last_seen_date, best_person.last_seen_time, search.capture_date, search.capture_time)
                        best_score = combined_score(
                            best_face_score, best_clothing_score, best_age_score,
                            best_location_score, best_time_score
                        )

                    track_id = face.get("_track_id") or _assign_face_track(face.get("facial_area"), current_frame_number)
                    track = face_tracks.get(track_id) if track_id is not None else None
                    if track is not None and best_person is not None:
                        pid_for_track = best_person.missing_person_id
                        track_scores = track.setdefault("scores", {}).setdefault(pid_for_track, [])
                        track_scores.append(float(best_face_score))
                        track_scores[:] = sorted(track_scores, reverse=True)[:8]
                        top_track = track_scores[:min(4, len(track_scores))]
                        track_face_score = sum(top_track) / len(top_track)
                        track["observations"].append({
                            "frame": current_frame_number,
                            "pid": pid_for_track,
                            "face_score": float(best_face_score),
                            "track_face_score": float(track_face_score),
                            "area": dict(face.get("facial_area") or {}),
                            "quality": dict(best_face_quality or {}),
                            "overall": float(best_score),
                        })
                        # Use the accumulated track score for evidence selection.
                        # The actual evidence image still uses the exact current
                        # face box, so the marker cannot drift to another person.
                        selection_face_score = float(track_face_score)
                    else:
                        selection_face_score = float(best_face_score)

                    # V25: identity-first candidate/evidence selection. The strongest
                    # facial evidence determines the candidate. Supporting clues
                    # never select identity, and the saved evidence remains an
                    # unmodified CCTV frame with no visual face highlight.
                    should_promote_evidence = bool(best_person) and (
                        selection_face_score > best_observed_face_score + 0.01
                        or (abs(selection_face_score - best_observed_face_score) <= 0.01 and best_face_score > best_observed_face_score + 0.01)
                        or (abs(selection_face_score - best_observed_face_score) <= 0.01 and abs(best_face_score - best_observed_face_score) <= 0.01 and best_score > best_observed_score)
                    )
                    if should_promote_evidence:
                        best_observed_score = best_score
                        best_observed_face_score = selection_face_score
                        best_observed_person = best_person
                        best_observed_frame = frame_number
                        best_observed_face_area = dict(face.get("facial_area") or {})
                        best_observed_breakdown = {
                            "face_similarity": round(best_face_score, 2),
                            "arcface_similarity": round(best_arcface_score, 2) if best_arcface_score is not None else None,
                            "track_face_similarity": round(selection_face_score, 2),
                            "clothing_similarity": round(best_clothing_score, 2),
                            "age_compatibility": round(best_age_score, 2),
                            "location_relevance": round(best_location_score, 2),
                            "time_relevance": round(best_time_score, 2),
                            "overall_candidate_score": round(best_score, 2),
                            "estimated_video_age": best_observed_age,
                            "location_context": location_context(best_person.last_seen_location, search.camera_location),
                            "clothing_context": clothing_context(best_person.clothing, best_clothing_score),
                            "face_quality": best_face_quality,
                        }
                        try:
                            closest_name = f"closest_{search.search_id}_frame_{current_frame_number}.jpg"
                            closest_rel = f"evidence/{closest_name}"
                            closest_path = Config.UPLOAD_FOLDER / closest_rel
                            closest_path.parent.mkdir(parents=True, exist_ok=True)
                            # FINAL BUILD: preserve the original CCTV evidence frame.
                            # No red box, circle or AI label is burned into evidence.
                            if cv2.imwrite(str(closest_path), frame):
                                best_observed_evidence = f"/uploads/{closest_rel}"
                        except Exception:
                            best_observed_evidence = None
                        print(
                            f"[Find-Me] Best video similarity so far: {best_score:.2f}% "
                            f"for {best_person.missing_person_id if best_person else 'none'} "
                            f"at frame {current_frame_number}"
                        )

                    if best_person:
                        pid = best_person.missing_person_id
                        history = candidate_history.setdefault(pid, [])
                        history.append(float(best_score))
                        history[:] = sorted(history, reverse=True)[:10]
                        top_two_average = (sum(history[:2]) / min(2, len(history))) if history else 0.0
                        # V20 early-stop: once the same candidate has strong
                        # repeated evidence, there is no need to decode the
                        # remainder of the clip. The saved evidence remains
                        # available for officer review.
                        if (best_face_score >= 84.0 and len(history) >= 2 and top_two_average >= 76.0) or (best_score >= 80.0 and len(history) >= 3 and top_two_average >= 74.0):
                            fast_exit = True
                        analysis = candidate_analysis.setdefault(pid, {
                            "missing_person_id": pid,
                            "complaint_id": best_person.complaint.complaint_id,
                            "name": best_person.full_name,
                            "observation_count": 0,
                            "best_overall_score": 0.0,
                            "best_face_similarity": 0.0,
                            "best_frame": None,
                            "best_timestamp_seconds": None,
                            "best_score_breakdown": None,
                            "best_evidence": None,
                            "best_face_area": None,
                            "best_face_quality": None,
                        })
                        analysis["observation_count"] += 1
                        if (
                            float(best_face_score) > float(analysis.get("best_face_similarity", 0.0)) + 0.01
                            or (abs(float(best_face_score) - float(analysis.get("best_face_similarity", 0.0))) <= 0.01
                                and float(best_score) > float(analysis["best_overall_score"]))
                        ):
                            analysis["best_overall_score"] = round(float(best_score), 2)
                            analysis["best_face_similarity"] = round(float(best_face_score), 2)
                            analysis["best_frame"] = frame_number
                            analysis["best_timestamp_seconds"] = round(frame_number / fps, 2)
                            analysis["best_face_area"] = dict(face.get("facial_area") or {})
                            analysis["best_score_breakdown"] = {
                                "face_similarity": round(best_face_score, 2),
                                "arcface_similarity": round(best_arcface_score, 2) if best_arcface_score is not None else None,
                                "track_face_similarity": round(selection_face_score, 2),
                                "clothing_similarity": round(best_clothing_score, 2),
                                "age_compatibility": round(best_age_score, 2),
                                "location_relevance": round(best_location_score, 2),
                                "time_relevance": round(best_time_score, 2),
                                "overall_candidate_score": round(best_score, 2),
                                "estimated_video_age": best_observed_age,
                                "location_context": location_context(best_person.last_seen_location, search.camera_location),
                                "clothing_context": clothing_context(best_person.clothing, best_clothing_score),
                                "face_quality": best_face_quality,
                            }
                            # Save a dedicated best-evidence frame for this candidate.
                            try:
                                candidate_name = f"candidate_{search.search_id}_{pid}_frame_{current_frame_number}.jpg"
                                candidate_rel = f"evidence/{candidate_name}"
                                candidate_path = Config.UPLOAD_FOLDER / candidate_rel
                                candidate_path.parent.mkdir(parents=True, exist_ok=True)
                                annotated = _annotate_candidate_frame(frame, face.get("facial_area"), "")
                                if cv2.imwrite(str(candidate_path), annotated):
                                    analysis["best_evidence"] = f"/uploads/{candidate_rel}"
                            except Exception:
                                analysis["best_evidence"] = None
                            analysis["best_face_quality"] = best_face_quality
                        # V5 possible-match gate: a single weak 60s score is not
                        # enough. Repeated evidence or a stronger score is required.
                        # Identity gate: overall context alone must never turn a weak face embedding into an identity candidate.
                        # A strong face signal is required, with repeated evidence as the fallback.
                        qualifies = (
                            (best_face_score >= 80.0)
                            or (best_face_score >= 74.0 and len(history) >= 2 and top_two_average >= 72.0)
                        )

                        # V11: persist every usable candidate observation so the
                        # investigator can inspect evidence over time, not only
                        # the final possible-match rows.
                        try:
                            observation = CandidateObservation(
                                video_search_id=search.id,
                                missing_person_id=best_person.id,
                                frame_number=current_frame_number,
                                timestamp_seconds=round(current_frame_number / fps, 2),
                                face_score=round(best_face_score, 2),
                                clothing_score=round(best_clothing_score, 2),
                                age_score=round(best_age_score, 2),
                                location_score=round(best_location_score, 2),
                                time_score=round(best_time_score, 2),
                                overall_score=round(best_score, 2),
                                face_quality_score=float(best_face_quality.get("score", 0) if isinstance(best_face_quality, dict) else 0),
                                analysis_json=json.dumps({
                                    "face_quality": best_face_quality,
                                    "track_face_similarity": round(selection_face_score, 2),
                                    "estimated_video_age": best_observed_age,
                                    "age_reliability": "supporting_only_cctv_estimate",
                                    "location_context": location_context(best_person.last_seen_location, search.camera_location),
                                    "clothing_context": clothing_context(best_person.clothing, best_clothing_score),
                                }),
                                passed_gate=bool(qualifies),
                            )
                            db.session.add(observation)
                        except Exception as observation_error:
                            print(f"[Find-Me] Observation persistence skipped: {observation_error}")
                    else:
                        pid = None
                        history = []
                        top_two_average = 0.0
                        qualifies = False

                    if best_person and qualifies:
                        evidence_name = f"{uuid.uuid4().hex}_frame_{frame_number}.jpg"
                        relative = f"temp_frames/{evidence_name}"
                        evidence_path = Config.UPLOAD_FOLDER / relative
                        evidence_path.parent.mkdir(parents=True, exist_ok=True)
                        evidence_label = (
                            f"POSSIBLE MATCH • {best_face_score:.1f}% FACE"
                            if best_score >= 62.0 else
                            f"AI CANDIDATE • {best_face_score:.1f}% FACE"
                        )
                        annotated = _annotate_candidate_frame(frame, face.get("facial_area"), "")
                        cv2.imwrite(str(evidence_path), annotated)
                        evidence_hash = file_sha256(evidence_path) if evidence_path.exists() else None
                        evidence_size = evidence_path.stat().st_size if evidence_path.exists() else None
                        source_camera = None
                        if search.camera_location:
                            source_camera = Camera.query.filter(Camera.location.ilike(f"%{search.camera_location}%")).first()

                        breakdown = {
                            "face_similarity": round(best_face_score, 2),
                            "arcface_similarity": round(best_arcface_score, 2) if best_arcface_score is not None else None,
                            "clothing_similarity": round(best_clothing_score, 2),
                            "age_compatibility": round(best_age_score, 2),
                            "location_relevance": round(best_location_score, 2),
                            "time_relevance": round(best_time_score, 2),
                            "overall_candidate_score": round(best_score, 2),
                            "face_quality": best_face_quality,
                            "weights": {"face": 0.40, "clothing": 0.20, "age": 0.15, "location": 0.15, "time": 0.10},
                            "estimated_video_age": best_observed_age,
                            "location_context": location_context(best_person.last_seen_location, search.camera_location),
                            "clothing_context": clothing_context(best_person.clothing, best_clothing_score),
                        }
                        match = AIMatchResult(
                            missing_person_id=best_person.id,
                            video_search_id=search.id,
                            similarity=best_face_score,
                            confidence=confidence(best_score),
                            overall_score=best_score,
                            face_score=best_face_score,
                            clothing_score=best_clothing_score,
                            age_score=best_age_score,
                            location_score=best_location_score,
                            time_score=best_time_score,
                            score_breakdown_json=json.dumps(breakdown),
                            frame_path=relative,
                            timestamp_seconds=round(current_frame_number / fps, 2),
                            frame_number=current_frame_number,
                        )
                        db.session.add(match)
                        db.session.add(Evidence(
                            complaint_id=best_person.complaint.id,
                            officer_id=current.id,
                            evidence_type="CCTV possible match",
                            file_path=relative,
                            sha256=evidence_hash,
                            file_size=evidence_size,
                            integrity_status="VERIFIED",
                            source_camera_id=source_camera.id if source_camera else None,
                            notes=f"{filename}; frame {frame_number}; face {face_index}; overall {best_score:.2f}% | face {best_face_score:.2f}% | clothing {best_clothing_score:.2f}% | age {best_age_score:.2f}% | location {best_location_score:.2f}% | time {best_time_score:.2f}%",
                        ))
                        record(
                            best_person.complaint,
                            "CCTV possible match",
                            f"{filename}, frame {frame_number}, face {face_index}: {best_score:.2f}%",
                            current.id,
                        )
                        results.append({
                            "result": "POSSIBLE MATCH",
                            "face_number": face_index,
                            "track_id": track_id,
                            "name": best_person.full_name,
                            "missing_person_id": best_person.missing_person_id,
                            "complaint_id": best_person.complaint.complaint_id,
                            "photo": f"/uploads/{best_person.photo_path}" if best_person.photo_path else None,
                            "similarity": round(best_face_score, 2),
                            "confidence": confidence(best_score),
                            "overall_score": round(best_score, 2),
                            "score_breakdown": {
                                "face_similarity": round(best_face_score, 2),
                                "arcface_similarity": round(best_arcface_score, 2) if best_arcface_score is not None else None,
                                "clothing_similarity": round(best_clothing_score, 2),
                                "age_compatibility": round(best_age_score, 2),
                                "location_relevance": round(best_location_score, 2),
                                "time_relevance": round(best_time_score, 2),
                                "location_context": location_context(best_person.last_seen_location, search.camera_location),
                                "clothing_context": clothing_context(best_person.clothing, best_clothing_score),
                                "face_quality": best_face_quality,
                            },
                            "estimated_video_age": best_observed_age,
                            "weights": {"face": 40, "clothing": 20, "age": 15, "location": 15, "time": 10},
                            "match_level": "STRONG POSSIBLE MATCH" if best_score >= 70 else "POSSIBLE MATCH — OFFICER REVIEW",
                            "supporting_detections": len(history),
                            "repeated_observations": max(0, len(history) - 1),
                            "top_two_average": round(top_two_average, 2),
                            "video": filename,
                            "timestamp_seconds": round(frame_number / fps, 2),
                            "frame_number": frame_number,
                            "captured_frame": f"/uploads/{relative}",
                            "status": best_person.status,
                        })

                    if fast_exit:
                        break

                if fast_exit:
                    break

                frame_number += step
        finally:
            capture.release()

        audit("VIDEO_SEARCH", search.search_id)
        safe_commit()

        # De-duplicate exact frame/face observations, then aggregate all
        # observations belonging to the same missing person/case. The UI gets
        # one unique candidate card with its best evidence, while raw detections
        # remain available for investigation/audit.
        unique = {}
        for item in results:
            key = (item["missing_person_id"], item["frame_number"], item["face_number"])
            if key not in unique or item["overall_score"] > unique[key]["overall_score"]:
                unique[key] = item
        detection_results = sorted(unique.values(), key=lambda row: row["overall_score"], reverse=True)

        candidate_groups = {}
        for item in detection_results:
            pid = item.get("missing_person_id")
            if not pid:
                continue
            group = candidate_groups.setdefault(pid, {
                "missing_person_id": pid,
                "complaint_id": item.get("complaint_id"),
                "name": item.get("name"),
                "photo": None,
                "detection_count": 0,
                "repeated_observations": 0,
                "best_overall_score": 0.0,
                "best_face_similarity": 0.0,
                "best_evidence": None,
                "best_frame": None,
                "best_timestamp_seconds": None,
                "best_score_breakdown": None,
                "observations": [],
                "result": "ANALYZED CANDIDATE",
                "match_level": item.get("match_level"),
                "status": item.get("status"),
                "photo": item.get("photo"),
            })
            group["detection_count"] += 1
            if item.get("photo"):
                group["photo"] = item.get("photo")
            group["repeated_observations"] = max(group["repeated_observations"], int(item.get("repeated_observations") or max(0, int(item.get("supporting_detections") or 1) - 1)))
            group["observations"].append({
                "frame_number": item.get("frame_number"),
                "timestamp_seconds": item.get("timestamp_seconds"),
                "overall_score": item.get("overall_score"),
                "face_similarity": item.get("similarity"),
                "face_quality": item.get("face_quality"),
                "captured_frame": item.get("captured_frame"),
            })
            if float(item.get("overall_score") or 0) > group["best_overall_score"]:
                group["best_overall_score"] = float(item.get("overall_score") or 0)
                group["best_face_similarity"] = float(item.get("similarity") or 0)
                group["best_evidence"] = item.get("captured_frame")
                group["best_frame"] = item.get("frame_number")
                group["best_timestamp_seconds"] = item.get("timestamp_seconds")
                group["best_score_breakdown"] = item.get("score_breakdown")
                group["match_level"] = item.get("match_level")
        candidate_groups = sorted(
            candidate_groups.values(),
            key=lambda row: row["best_overall_score"],
            reverse=True
        )
        for group in candidate_groups:
            group["detection_count"] = int(group["detection_count"])
            group["unique_candidate"] = True
            group["observations"] = sorted(
                group["observations"],
                key=lambda row: float(row.get("overall_score") or 0),
                reverse=True
            )[:10]

        # Internal performance cache is never exposed through the API.
        candidate_analysis.pop("_age_cache", None)

        # V12: every analyzed candidate gets a persistent evidence record for
        # its strongest observation, even when it is below the possible-match
        # gate. This keeps the Evidence Gallery consistent with Observation
        # History and gives officers a real file to inspect.
        existing_evidence = {(e.complaint_id, e.file_path) for e in Evidence.query.all()}
        for pid, analysis in candidate_analysis.items():
            try:
                person = MissingPerson.query.filter_by(missing_person_id=pid).first()
                evidence_url = analysis.get("best_evidence")
                if not person or not person.complaint or not evidence_url:
                    continue
                rel = str(evidence_url).replace("/uploads/", "", 1)
                path = Config.UPLOAD_FOLDER / rel
                if not path.exists() or (person.complaint.id, rel) in existing_evidence:
                    continue
                digest = file_sha256(path)
                size = path.stat().st_size
                best_bd = analysis.get("best_score_breakdown") or {}
                db.session.add(Evidence(
                    complaint_id=person.complaint.id,
                    officer_id=current.id,
                    evidence_type="CCTV candidate observation",
                    file_path=rel,
                    sha256=digest,
                    file_size=size,
                    integrity_status="VERIFIED",
                    notes=(
                        f"Candidate observation; frame {analysis.get('best_frame')}; "
                        f"overall {analysis.get('best_overall_score', 0):.2f}% | "
                        f"face {analysis.get('best_face_similarity', 0):.2f}% | "
                        f"age clue {best_bd.get('age_compatibility', 50):.2f}% | "
                        f"observations {analysis.get('observation_count', 0)} | "
                        f"below/above gate based on configured evidence criteria"
                    ),
                ))
                existing_evidence.add((person.complaint.id, rel))
            except Exception as evidence_error:
                print(f"[Find-Me] Persistent candidate evidence skipped: {evidence_error}")
        safe_commit()

        # Generate one persistent emergency alert per unique candidate only
        # after the same evidence gate used by candidate detection is met.
        # Alerts are never generated from a weak single observation.
        alert_candidates = {}
        for group in candidate_groups:
            repeated = int(group.get("repeated_observations") or 0)
            score = float(group.get("best_overall_score") or 0)
            qualifies = (
                (float((group.get("best_face_similarity") or 0)) >= 80.0)
                or (float((group.get("best_face_similarity") or 0)) >= 74.0 and repeated >= 2)
            )
            if qualifies:
                alert_candidates[group["missing_person_id"]] = group
        for group in alert_candidates.values():
            person = MissingPerson.query.filter_by(missing_person_id=group["missing_person_id"]).first()
            if not person or not person.complaint:
                continue
            db_match = AIMatchResult.query.filter_by(
                video_search_id=search.id,
                missing_person_id=person.id
            ).order_by(AIMatchResult.overall_score.desc()).first()
            best_item = {
                "overall_score": group["best_overall_score"],
                "score_breakdown": group.get("best_score_breakdown") or {},
                "captured_frame": group.get("best_evidence"),
                "db_id": db_match.id if db_match else None,
                "repeated_observations": group.get("repeated_observations", 0),
                "detection_count": group.get("detection_count", 0),
            }
            try:
                create_emergency_alert(person.complaint, person, search, best_item, identity())
            except Exception as alert_error:
                print(f"[Find-Me] Emergency alert creation skipped: {alert_error}")

        safe_commit()

        # Public possible-match gate: a strong FaceNet512 score is enough to
        # surface a POSSIBLE MATCH lead for officer review. Supporting clues
        # remain visible in the breakdown and never act as identity proof.
        candidate_history_for_public_gate = []
        if best_observed_person is not None:
            candidate_history_for_public_gate = candidate_history.get(best_observed_person.missing_person_id, []) or []
        # Use the raw FaceNet similarity for the public possible-match gate.
        # `best_observed_face_score` may be a smoothed track score, which can be
        # lower than the actual strongest FaceNet observation shown to the officer.
        # A strong raw FaceNet result (80%+) is therefore allowed to create a
        # POSSIBLE MATCH lead without requiring the weighted contextual score.
        raw_public_face_score = float(
            (best_observed_breakdown or {}).get("face_similarity") or best_observed_face_score or 0.0
        )
        identity_reliable = bool(
            best_observed_person and (
                raw_public_face_score >= 80.0
                or (raw_public_face_score >= 74.0 and len(candidate_history_for_public_gate) >= 2)
            )
        )
        public_best_person = best_observed_person.full_name if identity_reliable else None
        public_best_missing_id = best_observed_person.missing_person_id if identity_reliable else None
        public_best_evidence = best_observed_evidence
        if not public_best_evidence and candidate_analysis:
            strongest_analysis = max(
                candidate_analysis.values(),
                key=lambda row: float(row.get("best_face_similarity") or 0.0)
            )
            public_best_evidence = strongest_analysis.get("best_evidence")

        # Final evidence fallback: if the strongest candidate was analyzed but
        # the promotion snapshot path was lost, expose the candidate's saved
        # evidence path from investigation history instead of hiding the image.
        if not public_best_evidence and best_observed_person is not None:
            candidate_row = candidate_analysis.get(best_observed_person.missing_person_id)
            if candidate_row:
                public_best_evidence = candidate_row.get("best_evidence")
        public_best_photo = (
            f"/uploads/{best_observed_person.photo_path}"
            if identity_reliable and best_observed_person and best_observed_person.photo_path
            else None
        )

        # Only candidates that actually crossed the same gate used for
        # emergency alerts are returned in `matches`. All analyzed candidates
        # remain in `candidate_analysis` for audit/history, but the UI must not
        # render an unrelated person's name as a match.
        possible_candidate_groups = []
        for group in candidate_groups:
            repeated = int(group.get("repeated_observations") or 0)
            score = float(group.get("best_overall_score") or 0)
            face_score = float(group.get("best_face_similarity") or 0)
            # FaceNet identity evidence is the primary gate. Clothing, age,
            # location and time are supporting investigation clues and must not
            # suppress a strong facial lead by forcing a separate overall-score
            # threshold.
            qualifies = (
                face_score >= 80.0
                or (face_score >= 74.0 and repeated >= 2)
            )
            if qualifies:
                group["result"] = "POSSIBLE MATCH"
                group["match_level"] = (
                    "STRONG POSSIBLE MATCH — OFFICER REVIEW" if face_score >= 80.0
                    else "POSSIBLE MATCH — OFFICER REVIEW"
                )
                possible_candidate_groups.append(group)
            else:
                group["result"] = "ANALYZED CANDIDATE — NOT QUALIFIED"
                group["match_level"] = "NOT A POSSIBLE MATCH"

        qualified_ids = {g["missing_person_id"] for g in possible_candidate_groups}
        qualified_observations = [
            item for item in detection_results
            if item.get("missing_person_id") in qualified_ids
        ]

        return jsonify(
            success=True,
            message=(
                "CCTV analysis completed. Each result is a possible match "
                "requiring officer review."
            ),
            video=filename,
            search_id=search.search_id,
            total_frames=total,
            frames_extracted=frames_extracted,
            frames_with_faces=frames_with_faces,
            faces_detected=faces_detected,
            face_observations=faces_detected,
            unique_face_tracks=len(face_tracks),
            detector_errors=detector_errors,
            sampling_fps=round(float(fps), 2),
            sampling_strategy=f"Adaptive CPU screening: one sampled frame every {sample_interval:.2f} seconds for this video ({duration_seconds/60:.1f} min); Haar proposal + tracked FaceNet512 embedding reuse + targeted RetinaFace alignment, sequential decode",
            processing_seconds=round(time.perf_counter() - processing_started, 2),
            realtime_ratio=round((total / max(float(fps), 1.0)) / max(time.perf_counter() - processing_started, 0.01), 2),
            embedding_repairs=embedding_repair_count,
            best_similarity=round((best_observed_breakdown or {}).get("face_similarity", 0.0), 2),
            best_similarity_person=(best_observed_person.full_name if identity_reliable else None),
            best_similarity_missing_person_id=(public_best_missing_id if identity_reliable else None),
            best_similarity_frame=best_observed_frame,
            best_candidate_score=round(best_observed_score, 2),
            best_candidate_person=public_best_person,
            best_candidate_missing_person_id=public_best_missing_id,
            best_candidate_breakdown=best_observed_breakdown,
            best_candidate_evidence=public_best_evidence,
            best_candidate_face_score=round(best_observed_face_score, 2),
            evidence_selection="facial similarity first; supporting clues break ties only; no visual face highlighting",
            matches_found=len(qualified_observations),
            unique_candidates=len(possible_candidate_groups),
            analyzed_unique_candidates=len(candidate_groups),
            candidates_analyzed=len(candidate_analysis),
            candidates_screened=len(candidate_analysis),
            candidate_analysis=sorted(candidate_analysis.values(), key=lambda row: row["best_overall_score"], reverse=True),
            camera_network=[{"camera_id": c.camera_id, "name": c.name, "location": c.location, "latitude": c.latitude, "longitude": c.longitude, "status": c.status, "zone": c.zone} for c in Camera.query.order_by(Camera.name).all()],
            detection_matches=detection_results,
            faces_checked=faces_detected > 0,
            matching_engine="Hybrid transfer-learning screening: FaceNet512 multi-view identity + occlusion/augmentation robustness + EfficientNet-B0 visual corroboration + targeted RetinaFace alignment; supporting clues do not confirm identity",
            scoring_formula="Identity face score is primary; overall case score remains Face 40% + Clothing 20% + Age 15% + Location 15% + Time 10%",
            possible_match_threshold=74,
            strong_match_threshold=80,
            identity_face_threshold=74,
            identity_strong_face_threshold=80,
            quality_filter="Face size + sharpness + exposure + detector confidence; weak observations are excluded. Matching also uses controlled lighting, flip, blur and lower-face occlusion augmentation.",
            investigation_context=_video_metadata(search),
            matches=possible_candidate_groups,
            candidates=candidate_groups,
            alerts_generated=len(alert_candidates),
            best_candidate_photo=public_best_photo,
        )


    # ============================================================
    # V11 ADVANCED INVESTIGATION INTELLIGENCE APIs
    # ============================================================

    @app.get("/api/v11/video-searches")
    @role_required("ADMIN")
    def v11_video_searches():
        rows=VideoSearch.query.order_by(VideoSearch.created_at.desc()).limit(100).all()
        return jsonify(success=True, searches=[{"search_id":x.search_id,"camera_location":x.camera_location,"capture_date":x.capture_date,"capture_time":x.capture_time,"created_at":iso_india(x.created_at),"video_path":x.video_path} for x in rows])

    @app.get("/api/v11/cameras")
    @role_required("ADMIN")
    def v11_cameras():
        rows = Camera.query.order_by(Camera.name.asc()).all()
        return jsonify(success=True, cameras=[{
            "id": row.id, "camera_id": row.camera_id, "name": row.name,
            "location": row.location, "latitude": row.latitude, "longitude": row.longitude,
            "status": row.status, "zone": row.zone, "source_type": row.source_type
        } for row in rows])

    @app.post("/api/v11/cameras")
    @role_required("ADMIN")
    def v11_camera_create():
        data = request.get_json(silent=True) or {}
        name = str(data.get("name") or "").strip()
        location = str(data.get("location") or "").strip()
        if not name or not location:
            return api_error("Camera name and location are required.")
        camera = Camera(
            camera_id=str(data.get("camera_id") or identifier("CCTV")), name=name,
            location=location, latitude=data.get("latitude"), longitude=data.get("longitude"),
            zone=data.get("zone"), source_type=data.get("source_type") or "SIMULATED_CCTV",
            status=data.get("status") or "ONLINE"
        )
        db.session.add(camera)
        audit("CAMERA_CREATED", f"{camera.camera_id}: {name} / {location}")
        safe_commit()
        return jsonify(success=True, camera={"id": camera.id, "camera_id": camera.camera_id, "name": camera.name, "location": camera.location}), 201

    @app.get("/api/v11/case-index")
    @role_required("ADMIN")
    def v11_case_index():
        """Admin investigation case list with real AI activity counts.

        The UI uses these counts to avoid making two same-name cases look
        interchangeable and to default to the case that actually has AI
        investigation activity.
        """
        cases = Complaint.query.order_by(Complaint.created_at.asc()).all()
        rows = []
        for case in cases:
            if not case.missing_person:
                continue
            person = case.missing_person
            obs_count = CandidateObservation.query.filter_by(missing_person_id=person.id).count()
            match_count = AIMatchResult.query.filter_by(missing_person_id=person.id).count()
            evidence_count = Evidence.query.filter_by(complaint_id=case.id).count()
            alert_count = EmergencyAlert.query.filter_by(complaint_id=case.id).count()
            search_ids = []
            seen = set()
            for o in CandidateObservation.query.filter_by(missing_person_id=person.id).order_by(CandidateObservation.created_at.desc()).limit(30).all():
                if o.video_search and o.video_search.search_id not in seen:
                    seen.add(o.video_search.search_id)
                    search_ids.append(o.video_search.search_id)
            for m in AIMatchResult.query.filter_by(missing_person_id=person.id).order_by(AIMatchResult.created_at.desc()).limit(30).all():
                if m.video_search and m.video_search.search_id not in seen:
                    seen.add(m.video_search.search_id)
                    search_ids.append(m.video_search.search_id)
            rows.append({
                "complaint_id": case.complaint_id,
                "missing_person_id": person.missing_person_id,
                "name": person.full_name,
                "status": case.status,
                "created_at": iso_india(case.created_at),
                "ai_observations": obs_count,
                "ai_matches": match_count,
                "evidence": evidence_count,
                "alerts": alert_count,
                "ai_searches": len(search_ids),
                "latest_ai_search": search_ids[0] if search_ids else None,
                "has_ai_activity": bool(obs_count or match_count or evidence_count or alert_count),
            })
        # Investigation priority follows complaint-received order. AI activity
        # is displayed as context but never silently moves a newer complaint
        # ahead of an older one.
        rows.sort(key=lambda x: x["created_at"] or "9999-12-31T23:59:59+05:30")
        for index, row in enumerate(rows, start=1):
            row["priority"] = index
        return jsonify(success=True, cases=rows)

    @app.get("/api/v11/investigation/<complaint_id>")
    @role_required("ADMIN")
    def v11_investigation_workspace(complaint_id):
        case = Complaint.query.filter_by(complaint_id=complaint_id).first()
        if not case or not case.missing_person:
            return api_error("Case not found.", 404)
        person = case.missing_person
        sightings = Sighting.query.filter_by(complaint_id=case.id).order_by(Sighting.created_at.asc()).all()
        records = InvestigationRecord.query.filter_by(complaint_id=case.id).order_by(InvestigationRecord.created_at.asc()).all()
        evidence = Evidence.query.filter_by(complaint_id=case.id).order_by(Evidence.created_at.desc()).all()
        alerts = EmergencyAlert.query.filter_by(complaint_id=case.id).order_by(EmergencyAlert.created_at.desc()).all()
        matches = AIMatchResult.query.filter_by(missing_person_id=person.id).order_by(AIMatchResult.overall_score.desc()).all()
        observations = CandidateObservation.query.filter_by(missing_person_id=person.id).order_by(CandidateObservation.created_at.asc()).all()
        history = safe_json(person.appearance_history_json, [])
        movement = []
        if person.last_seen_location:
            movement.append({"type":"last_seen","location":person.last_seen_location,"date":person.last_seen_date,"time":person.last_seen_time,"score":None,"source":"Registered case"})
        for item in sightings:
            movement.append({"type":"sighting","location":item.location,"date":item.sighting_date,"time":item.sighting_time,"score":None,"source":"Citizen sighting","description":item.description})
        grouped_ai = {}
        for item in observations:
            search = item.video_search
            key = (search.id, search.camera_location or "Unknown location", search.capture_date or "", search.capture_time or "")
            group = grouped_ai.setdefault(key, {
                "type":"ai_sighting", "location":search.camera_location, "date":search.capture_date,
                "time":search.capture_time, "score":0.0, "face_score":0.0,
                "source":"AI CCTV sighting", "video":search.search_id, "observation_count":0, "observations":[]
            })
            group["observation_count"] += 1
            group["score"] = max(float(group["score"] or 0), float(item.overall_score or 0))
            group["face_score"] = max(float(group["face_score"] or 0), float(item.face_score or 0))
            group["observations"].append({
                "frame":item.frame_number, "timestamp_seconds":item.timestamp_seconds,
                "overall_score":item.overall_score, "face_score":item.face_score,
                "quality":item.face_quality_score,
            })
        for group in grouped_ai.values():
            group["observations"].sort(key=lambda x: float(x.get("overall_score") or 0), reverse=True)
            group["description"] = (
                f"{group['observation_count']} AI observation(s) grouped from one CCTV search; "
                f"best candidate score {float(group['score'] or 0):.2f}%."
            )
            movement.append(group)
        def evidence_payload(item):
            return {"id":item.id,"type":item.evidence_type,"path":("/uploads/" + item.file_path) if item.file_path else None,"notes":item.notes,"sha256":item.sha256,"file_size":item.file_size,"integrity_status":item.integrity_status,"created_at":iso_india(item.created_at)}
        return jsonify(success=True, workspace={
            "case": serialize_case(case),
            "person": {"id":person.missing_person_id,"name":person.full_name,"age":person.age,"gender":person.gender,"height":person.height,"clothing":person.clothing,"accessories":person.accessories,"last_seen_location":person.last_seen_location,"last_seen_date":person.last_seen_date,"last_seen_time":person.last_seen_time,"appearance_history":history,"privacy_level":person.privacy_level},
            "movement": sorted(movement, key=lambda x: ((x.get("date") or ""), (x.get("time") or ""), x.get("source") or "")),
            "matches":[{"id":m.id,"search_id":m.video_search.search_id if m.video_search else None,"overall_score":m.overall_score,"face_score":m.face_score or m.similarity,"clothing_score":m.clothing_score,"age_score":m.age_score,"location_score":m.location_score,"time_score":m.time_score,"frame":m.frame_number,"timestamp_seconds":m.timestamp_seconds,"evidence":("/uploads/" + m.frame_path) if m.frame_path else None,"breakdown":safe_json(m.score_breakdown_json,{})} for m in matches[:50]],
            "observations":[{"id":o.id,"search_id":o.video_search.search_id if o.video_search else None,"frame":o.frame_number,"timestamp_seconds":o.timestamp_seconds,"overall_score":o.overall_score,"face_score":o.face_score,"clothing_score":o.clothing_score,"age_score":o.age_score,"location_score":o.location_score,"time_score":o.time_score,"face_quality_score":o.face_quality_score,"evidence":o.evidence_path and (o.evidence_path if str(o.evidence_path).startswith("/") else "/uploads/"+str(o.evidence_path)),"passed_gate":bool(o.passed_gate),"analysis":safe_json(o.analysis_json,{})} for o in observations[-100:]],
            "evidence":[evidence_payload(e) for e in evidence[:100]],
            "sightings":[{"id":x.id,"location":x.location,"date":x.sighting_date,"time":x.sighting_time,"description":x.description,"photo":("/uploads/"+x.photo_path) if x.photo_path else None,"status":x.status} for x in sightings],
            "alerts":[{"alert_id":a.alert_id,"status":a.status,"severity":a.severity,"overall_score":a.overall_score,"camera_location":a.camera_location,"capture_date":a.capture_date,"capture_time":a.capture_time,"reason":a.alert_reason,"evidence":("/uploads/"+a.evidence_path) if a.evidence_path else None} for a in alerts],
            "audit_timeline":[{"action":r.action,"description":r.description,"created_at":iso_india(r.created_at)} for r in records]
        })

    @app.get("/api/v11/candidate-compare")
    @role_required("ADMIN")
    def v11_candidate_compare():
        search_id = request.args.get("search_id")
        rows = []
        if search_id:
            search = VideoSearch.query.filter_by(search_id=search_id).first()
            if not search: return api_error("Video search not found.", 404)
            matches = AIMatchResult.query.filter_by(video_search_id=search.id).order_by(AIMatchResult.overall_score.desc()).all()
            # Also include analyzed candidates that did not cross the gate.
            obs = CandidateObservation.query.filter_by(video_search_id=search.id).all()
            grouped = {}
            for o in obs:
                g = grouped.setdefault(o.missing_person_id, {"observations":0,"best":None})
                g["observations"] += 1
                if g["best"] is None or (o.overall_score or 0) > (g["best"].overall_score or 0): g["best"] = o
            for m in matches:
                person=m.missing_person
                rows.append({"name":person.full_name,"missing_person_id":person.missing_person_id,"complaint_id":person.complaint.complaint_id,"overall_score":m.overall_score,"face_score":m.face_score or m.similarity,"clothing_score":m.clothing_score,"age_score":m.age_score,"location_score":m.location_score,"time_score":m.time_score,"observations":grouped.get(person.id,{}).get("observations",0),"evidence":"/uploads/"+m.frame_path if m.frame_path else None,"breakdown":safe_json(m.score_breakdown_json,{})})
            for pid,g in grouped.items():
                if any(r["missing_person_id"] == g["best"].missing_person.missing_person_id for r in rows if g["best"]): continue
                o=g["best"]; person=o.missing_person
                rows.append({"name":person.full_name,"missing_person_id":person.missing_person_id,"complaint_id":person.complaint.complaint_id,"overall_score":o.overall_score,"face_score":o.face_score,"clothing_score":o.clothing_score,"age_score":o.age_score,"location_score":o.location_score,"time_score":o.time_score,"observations":g["observations"],"evidence":None,"breakdown":safe_json(o.analysis_json,{})})
        return jsonify(success=True, candidates=sorted(rows,key=lambda x:x.get("overall_score") or 0,reverse=True)[:20])

    @app.get("/api/v11/security-center")
    @role_required("ADMIN")
    def v11_security_center():
        logs=AuditLog.query.order_by(AuditLog.created_at.desc()).limit(100).all()
        users=User.query.order_by(User.created_at.desc()).all()
        evidence=Evidence.query.order_by(Evidence.created_at.desc()).limit(100).all()
        return jsonify(success=True, security={
            "controls":[
                {"name":"JWT authentication","status":"ACTIVE"},{"name":"Role-based access control","status":"ACTIVE"},
                {"name":"Password hashing","status":"ACTIVE"},{"name":"Protected evidence endpoints","status":"ACTIVE"},
                {"name":"Audit logging","status":"ACTIVE"},{"name":"Upload size/type validation","status":"ACTIVE"},
                {"name":"SQLite WAL + busy timeout","status":"ACTIVE"},{"name":"Human-in-the-loop identity confirmation","status":"ACTIVE"}
            ],
            "audit_logs":[{"action":x.action,"description":x.description,"ip":x.ip_address,"created_at":iso_india(x.created_at)} for x in logs],
            "users":[{"username":u.username,"role":u.role,"active":u.is_active,"created_at":iso_india(u.created_at)} for u in users],
            "evidence_integrity":{"total":len(evidence),"verified":sum(1 for e in evidence if e.integrity_status=="VERIFIED"),"failed":sum(1 for e in evidence if e.integrity_status=="FAILED")}
        })

    @app.post("/api/v11/evidence/<int:evidence_id>/verify")
    @role_required("ADMIN")
    def v11_verify_evidence(evidence_id):
        item=Evidence.query.get(evidence_id)
        if not item or not item.file_path: return api_error("Evidence file not found.",404)
        path=Config.UPLOAD_FOLDER / item.file_path
        if not path.exists(): item.integrity_status="FAILED"; safe_commit(); return jsonify(success=True,verified=False,status="FAILED",message="Evidence file is missing.")
        current=file_sha256(path)
        item.integrity_status="VERIFIED" if not item.sha256 or current==item.sha256 else "FAILED"
        if not item.sha256: item.sha256=current
        audit("EVIDENCE_INTEGRITY_CHECK", f"Evidence {item.id}: {item.integrity_status}")
        safe_commit()
        return jsonify(success=True,verified=item.integrity_status=="VERIFIED",status=item.integrity_status,sha256=current)

    @app.get("/api/v11/evaluation")
    @role_required("ADMIN")
    def v11_evaluation():
        searches=VideoSearch.query.order_by(VideoSearch.created_at.desc()).all()
        observations=CandidateObservation.query.all()
        matches=AIMatchResult.query.all()
        alerts=EmergencyAlert.query.all()
        return jsonify(success=True,evaluation={
            "video_searches":len(searches),"observations":len(observations),"possible_match_records":len(matches),"alerts_generated":len(alerts),
            "faces_observed":sum(1 for _ in observations),
            "gate_pass_rate":round((sum(1 for o in observations if o.passed_gate)/len(observations)*100),2) if observations else None,
            "avg_candidate_score":round(sum((o.overall_score or 0) for o in observations)/len(observations),2) if observations else None,
            "measured_note":"Metrics are computed from this application's recorded prototype activity; no unmeasured accuracy claim is generated."
        })

    @app.post("/api/v11/appearance/<complaint_id>")
    @role_required("ADMIN")
    def v11_add_appearance(complaint_id):
        case=Complaint.query.filter_by(complaint_id=complaint_id).first()
        if not case or not case.missing_person: return api_error("Case not found.",404)
        data=request.get_json(silent=True) or {}
        entry={"date":data.get("date") or india_now().date().isoformat(),"time":data.get("time") or india_now().strftime("%H:%M"),"clothing":data.get("clothing"),"accessories":data.get("accessories"),"location":data.get("location"),"source":data.get("source") or "Officer observation","notes":data.get("notes")}
        history=safe_json(case.missing_person.appearance_history_json,[])
        history.append(entry); case.missing_person.appearance_history_json=json.dumps(history[-50:])
        if entry.get("accessories"): case.missing_person.accessories=entry["accessories"]
        record(case,"Appearance history updated",json.dumps(entry),identity()); audit("APPEARANCE_HISTORY",case.complaint_id); safe_commit()
        return jsonify(success=True,appearance_history=history[-50:])
    @app.errorhandler(Exception)
    def api_exception(error):
        # Never return an HTML error page to API clients. Frontend fetch calls
        # expect JSON, while the full traceback remains visible in the Flask terminal.
        if request.path.startswith("/api/"):
            app.logger.exception("Unhandled API exception")
            return api_error(f"Server error while processing the request: {error}", 500)
        raise error

    @app.errorhandler(413)
    def large_file(_): return api_error("File exceeds the 1 GB upload limit.", 413)
    @app.errorhandler(404)
    def not_found(_): return api_error("Endpoint not found.", 404)
    return app
