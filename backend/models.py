
from datetime import datetime
from zoneinfo import ZoneInfo

INDIA_TZ = ZoneInfo("Asia/Kolkata")

def app_now():
    return datetime.now(INDIA_TZ).replace(tzinfo=None)
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


# ============================================================
# TIMESTAMP MIXIN
# ============================================================

class TimestampMixin:
    created_at = db.Column(
        db.DateTime,
        default=app_now,
        nullable=False
    )

    updated_at = db.Column(
        db.DateTime,
        default=app_now,
        onupdate=app_now,
        nullable=False
    )


# ============================================================
# USER
# ============================================================

class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    username = db.Column(
        db.String(80),
        unique=True,
        nullable=False,
        index=True
    )

    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(20),
        nullable=False,
        default="CITIZEN"
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    # V9 password-recovery fields. Tokens/codes are stored hashed and expire quickly.
    reset_token_hash = db.Column(db.String(255))
    reset_token_expires_at = db.Column(db.DateTime)

    # --------------------------------------------------------
    # Complaints created by this user
    # IMPORTANT:
    # Complaint has TWO foreign keys to users.id:
    #   - user_id
    #   - verified_by_id
    # So foreign_keys must be specified.
    # --------------------------------------------------------

    complaints = db.relationship(
        "Complaint",
        foreign_keys="Complaint.user_id",
        backref=db.backref("citizen", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Complaints verified by this user/admin
    # --------------------------------------------------------

    verified_complaints = db.relationship(
        "Complaint",
        foreign_keys="Complaint.verified_by_id",
        backref=db.backref("verified_by", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Complaint-giver records belonging to this user
    # --------------------------------------------------------

    complaint_givers = db.relationship(
        "ComplaintGiver",
        foreign_keys="ComplaintGiver.user_id",
        backref=db.backref("user", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Image searches performed by this officer
    # --------------------------------------------------------

    image_searches = db.relationship(
        "ImageSearch",
        foreign_keys="ImageSearch.officer_id",
        backref=db.backref("officer", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Video searches performed by this officer
    # --------------------------------------------------------

    video_searches = db.relationship(
        "VideoSearch",
        foreign_keys="VideoSearch.officer_id",
        backref=db.backref("officer", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Sightings reported by this user
    # --------------------------------------------------------

    sightings = db.relationship(
        "Sighting",
        foreign_keys="Sighting.reporter_id",
        backref=db.backref("reporter", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Evidence uploaded by this officer
    # --------------------------------------------------------

    evidence_records = db.relationship(
        "Evidence",
        foreign_keys="Evidence.officer_id",
        backref=db.backref("officer", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Notifications
    # --------------------------------------------------------

    notifications = db.relationship(
        "Notification",
        foreign_keys="Notification.user_id",
        backref=db.backref("user", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    # --------------------------------------------------------
    # Audit logs
    # --------------------------------------------------------

    audit_logs = db.relationship(
        "AuditLog",
        foreign_keys="AuditLog.user_id",
        backref=db.backref("user", lazy=True),
        lazy=True
    )

    # --------------------------------------------------------
    # Investigation records created by this officer
    # --------------------------------------------------------

    investigation_records = db.relationship(
        "InvestigationRecord",
        foreign_keys="InvestigationRecord.officer_id",
        backref=db.backref("officer", lazy=True),
        lazy=True
    )


# ============================================================
# COMPLAINT GIVER
# ============================================================

class ComplaintGiver(TimestampMixin, db.Model):
    __tablename__ = "complaint_givers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    giver_id = db.Column(
        db.String(30),
        unique=True,
        nullable=False,
        index=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    full_name = db.Column(
        db.String(160),
        nullable=False
    )

    relationship = db.Column(
        db.String(100),
        nullable=False
    )

    phone = db.Column(
        db.String(30),
        nullable=False
    )

    email = db.Column(
        db.String(255)
    )

    preferred_contact = db.Column(
        db.String(20),
        default="Phone"
    )

    address = db.Column(
        db.Text
    )

    city = db.Column(
        db.String(100)
    )

    state = db.Column(
        db.String(100)
    )

    id_proof_type = db.Column(
        db.String(80)
    )

    id_reference = db.Column(
        db.String(120)
    )


# ============================================================
# COMPLAINT
# ============================================================

class Complaint(TimestampMixin, db.Model):
    __tablename__ = "complaints"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    complaint_id = db.Column(
        db.String(30),
        unique=True,
        nullable=False,
        index=True
    )

    # Citizen who submitted the complaint
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # Complaint giver record
    giver_id = db.Column(
        db.Integer,
        db.ForeignKey("complaint_givers.id"),
        nullable=False
    )

    status = db.Column(
        db.String(40),
        nullable=False,
        default="Reported"
    )

    admin_remarks = db.Column(
        db.Text
    )

    # Admin/officer who verified the complaint
    verified_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    verified_at = db.Column(
        db.DateTime
    )

    # V9 explicit verification/enquiry audit fields.
    enquiry_result = db.Column(db.String(80))
    enquiry_notes = db.Column(db.Text)

    # Explicit relationship to ComplaintGiver
    giver = db.relationship(
        "ComplaintGiver",
        foreign_keys=[giver_id],
        lazy=True
    )

    # One missing-person record per complaint
    missing_person = db.relationship(
        "MissingPerson",
        foreign_keys="MissingPerson.complaint_id",
        backref=db.backref("complaint", lazy=True),
        uselist=False,
        cascade="all, delete-orphan"
    )

    # Face embeddings belonging to this complaint
    face_embeddings = db.relationship(
        "FaceEmbedding",
        foreign_keys="FaceEmbedding.complaint_id",
        backref=db.backref("complaint", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    # Sightings for this complaint
    sightings = db.relationship(
        "Sighting",
        foreign_keys="Sighting.complaint_id",
        backref=db.backref("complaint", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    # Evidence for this complaint
    evidence_records = db.relationship(
        "Evidence",
        foreign_keys="Evidence.complaint_id",
        backref=db.backref("complaint", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    # Investigation history
    investigation_records = db.relationship(
        "InvestigationRecord",
        foreign_keys="InvestigationRecord.complaint_id",
        backref=db.backref("complaint", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )


# ============================================================
# MISSING PERSON
# ============================================================

class MissingPerson(TimestampMixin, db.Model):
    __tablename__ = "missing_persons"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    missing_person_id = db.Column(
        db.String(30),
        unique=True,
        nullable=False,
        index=True
    )

    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaints.id"),
        nullable=False
    )

    full_name = db.Column(
        db.String(160),
        nullable=False,
        index=True
    )

    age = db.Column(
        db.Integer
    )

    gender = db.Column(
        db.String(30)
    )

    height = db.Column(
        db.String(40)
    )

    weight = db.Column(
        db.String(40)
    )

    complexion = db.Column(
        db.String(100)
    )

    hair_details = db.Column(
        db.String(200)
    )

    eye_details = db.Column(
        db.String(100)
    )

    clothing = db.Column(
        db.Text
    )

    identifying_marks = db.Column(
        db.Text
    )

    medical_information = db.Column(
        db.Text
    )

    last_seen_location = db.Column(
        db.String(255),
        nullable=False,
        index=True
    )

    last_seen_date = db.Column(
        db.String(30)
    )

    last_seen_time = db.Column(
        db.String(30)
    )

    description = db.Column(
        db.Text
    )

    photo_path = db.Column(
        db.String(400),
        nullable=False
    )

    # V11 investigation intelligence metadata
    appearance_history_json = db.Column(db.Text, default="[]")
    accessories = db.Column(db.Text)
    privacy_level = db.Column(db.String(30), default="RESTRICTED")

    status = db.Column(
        db.String(40),
        nullable=False,
        default="Reported"
    )

    is_verified = db.Column(
        db.Boolean,
        nullable=False,
        default=False
    )

    # Face embeddings
    embeddings = db.relationship(
        "FaceEmbedding",
        foreign_keys="FaceEmbedding.missing_person_id",
        backref=db.backref("missing_person", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    # AI match results
    ai_match_results = db.relationship(
        "AIMatchResult",
        foreign_keys="AIMatchResult.missing_person_id",
        backref=db.backref("missing_person", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )


# ============================================================
# FACE EMBEDDING
# ============================================================

class FaceEmbedding(TimestampMixin, db.Model):
    __tablename__ = "face_embeddings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    missing_person_id = db.Column(
        db.Integer,
        db.ForeignKey("missing_persons.id"),
        nullable=False,
        index=True
    )

    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaints.id"),
        nullable=False,
        index=True
    )

    photo_path = db.Column(
        db.String(400),
        nullable=False
    )

    vector_json = db.Column(
        db.Text,
        nullable=False
    )

    model_name = db.Column(
        db.String(100),
        nullable=False,
        default="Facenet512"
    )


# ============================================================
# IMAGE SEARCH
# ============================================================

class ImageSearch(TimestampMixin, db.Model):
    __tablename__ = "image_searches"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    search_id = db.Column(
        db.String(30),
        unique=True,
        nullable=False
    )

    officer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    image_path = db.Column(
        db.String(400),
        nullable=False
    )

    # AI results generated from this image search
    match_results = db.relationship(
        "AIMatchResult",
        foreign_keys="AIMatchResult.image_search_id",
        backref=db.backref("image_search", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )


# ============================================================
# VIDEO SEARCH
# ============================================================

class VideoSearch(TimestampMixin, db.Model):
    __tablename__ = "video_searches"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    search_id = db.Column(
        db.String(30),
        unique=True,
        nullable=False
    )

    officer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    video_path = db.Column(
        db.String(400),
        nullable=False
    )

    # Investigation context used by the V6 multi-clue scoring layer.
    camera_location = db.Column(db.String(255))
    capture_date = db.Column(db.String(30))
    capture_time = db.Column(db.String(30))

    # AI results generated from this video search
    match_results = db.relationship(
        "AIMatchResult",
        foreign_keys="AIMatchResult.video_search_id",
        backref=db.backref("video_search", lazy=True),
        lazy=True,
        cascade="all, delete-orphan"
    )

    observations = db.relationship(
        "CandidateObservation",
        foreign_keys="CandidateObservation.video_search_id",
        lazy=True,
        cascade="all, delete-orphan"
    )


# ============================================================
# AI MATCH RESULT
# ============================================================

class AIMatchResult(TimestampMixin, db.Model):
    __tablename__ = "ai_match_results"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    missing_person_id = db.Column(
        db.Integer,
        db.ForeignKey("missing_persons.id"),
        nullable=False
    )

    image_search_id = db.Column(
        db.Integer,
        db.ForeignKey("image_searches.id")
    )

    video_search_id = db.Column(
        db.Integer,
        db.ForeignKey("video_searches.id")
    )

    similarity = db.Column(
        db.Float,
        nullable=False
    )

    # V6 multi-clue candidate scoring. similarity remains the face clue for
    # backwards compatibility; overall_score is the ranked candidate score.
    overall_score = db.Column(db.Float)
    face_score = db.Column(db.Float)
    clothing_score = db.Column(db.Float)
    age_score = db.Column(db.Float)
    location_score = db.Column(db.Float)
    time_score = db.Column(db.Float)
    score_breakdown_json = db.Column(db.Text)

    confidence = db.Column(
        db.String(20),
        nullable=False
    )

    frame_path = db.Column(
        db.String(400)
    )

    timestamp_seconds = db.Column(
        db.Float
    )

    frame_number = db.Column(
        db.Integer
    )

    review_status = db.Column(
        db.String(40),
        default="Possible Match"
    )


# ============================================================
# EMERGENCY ALERT
# ============================================================

class EmergencyAlert(TimestampMixin, db.Model):
    __tablename__ = "emergency_alerts"

    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False)
    missing_person_id = db.Column(db.Integer, db.ForeignKey("missing_persons.id"), nullable=False)
    video_search_id = db.Column(db.Integer, db.ForeignKey("video_searches.id"))
    ai_match_id = db.Column(db.Integer, db.ForeignKey("ai_match_results.id"))
    severity = db.Column(db.String(20), nullable=False, default="MEDIUM")
    status = db.Column(db.String(30), nullable=False, default="OPEN")
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    alert_reason = db.Column(db.Text)
    camera_location = db.Column(db.String(255))
    capture_date = db.Column(db.String(30))
    capture_time = db.Column(db.String(30))
    overall_score = db.Column(db.Float)
    face_score = db.Column(db.Float)
    clothing_score = db.Column(db.Float)
    age_score = db.Column(db.Float)
    location_score = db.Column(db.Float)
    time_score = db.Column(db.Float)
    evidence_path = db.Column(db.String(400))
    acknowledged_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    acknowledged_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)
    dismissed_at = db.Column(db.DateTime)

    complaint = db.relationship("Complaint", foreign_keys=[complaint_id], lazy=True)
    missing_person = db.relationship("MissingPerson", foreign_keys=[missing_person_id], lazy=True)
    video_search = db.relationship("VideoSearch", foreign_keys=[video_search_id], lazy=True)
    ai_match = db.relationship("AIMatchResult", foreign_keys=[ai_match_id], lazy=True)



# ============================================================
# SIGHTING
# ============================================================

class Sighting(TimestampMixin, db.Model):
    __tablename__ = "sightings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaints.id"),
        nullable=False
    )

    reporter_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    location = db.Column(
        db.String(255),
        nullable=False
    )

    sighting_date = db.Column(
        db.String(30)
    )

    sighting_time = db.Column(
        db.String(30)
    )

    description = db.Column(
        db.Text
    )

    photo_path = db.Column(
        db.String(400)
    )

    video_path = db.Column(
        db.String(400)
    )

    status = db.Column(
        db.String(40),
        default="Reported"
    )


# ============================================================
# EVIDENCE
# ============================================================

class Evidence(TimestampMixin, db.Model):
    __tablename__ = "evidence"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaints.id"),
        nullable=False
    )

    officer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    evidence_type = db.Column(
        db.String(50),
        nullable=False
    )

    file_path = db.Column(
        db.String(400)
    )

    notes = db.Column(
        db.Text
    )

    # V11 evidence integrity metadata
    sha256 = db.Column(db.String(64), index=True)
    file_size = db.Column(db.Integer)
    integrity_status = db.Column(db.String(30), default="VERIFIED")
    source_camera_id = db.Column(db.Integer, db.ForeignKey("cameras.id"))
    retention_until = db.Column(db.DateTime)


# ============================================================
# CAMERA NETWORK
# ============================================================

class Camera(TimestampMixin, db.Model):
    __tablename__ = "cameras"

    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    status = db.Column(db.String(30), default="ONLINE")
    zone = db.Column(db.String(120))
    source_type = db.Column(db.String(40), default="SIMULATED_CCTV")

    evidence = db.relationship("Evidence", foreign_keys="Evidence.source_camera_id", lazy=True)


# ============================================================
# RAW AI OBSERVATION
# ============================================================

class CandidateObservation(TimestampMixin, db.Model):
    __tablename__ = "candidate_observations"

    id = db.Column(db.Integer, primary_key=True)
    video_search_id = db.Column(db.Integer, db.ForeignKey("video_searches.id"), nullable=False, index=True)
    missing_person_id = db.Column(db.Integer, db.ForeignKey("missing_persons.id"), nullable=False, index=True)
    frame_number = db.Column(db.Integer)
    timestamp_seconds = db.Column(db.Float)
    face_score = db.Column(db.Float)
    clothing_score = db.Column(db.Float)
    age_score = db.Column(db.Float)
    location_score = db.Column(db.Float)
    time_score = db.Column(db.Float)
    overall_score = db.Column(db.Float)
    face_quality_score = db.Column(db.Float)
    evidence_path = db.Column(db.String(400))
    analysis_json = db.Column(db.Text)
    passed_gate = db.Column(db.Boolean, default=False)

    video_search = db.relationship("VideoSearch", foreign_keys=[video_search_id], lazy=True)
    missing_person = db.relationship("MissingPerson", foreign_keys=[missing_person_id], lazy=True)


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(TimestampMixin, db.Model):
    __tablename__ = "notifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False
    )


# ============================================================
# AUDIT LOG
# ============================================================

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    action = db.Column(
        db.String(120),
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    ip_address = db.Column(
        db.String(80)
    )

    created_at = db.Column(
        db.DateTime,
        default=app_now,
        nullable=False
    )


# ============================================================
# INVESTIGATION RECORD
# ============================================================

class InvestigationRecord(db.Model):
    __tablename__ = "investigation_records"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    complaint_id = db.Column(
        db.Integer,
        db.ForeignKey("complaints.id"),
        nullable=False
    )

    officer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    action = db.Column(
        db.String(160),
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=app_now,
        nullable=False
    )
