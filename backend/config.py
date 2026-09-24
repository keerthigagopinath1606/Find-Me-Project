from datetime import timedelta
from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.getenv("FINDME_SECRET_KEY", "change-this-demo-secret-before-production")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + str(BASE_DIR / "database" / "findme.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"timeout": 30, "check_same_thread": False}
    }
    JWT_SECRET_KEY = os.getenv("FINDME_JWT_SECRET", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    MAX_CONTENT_LENGTH = 1024 * 1024 * 1024
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
    SMTP_HOST = os.getenv("FINDME_SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("FINDME_SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("FINDME_SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("FINDME_SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("FINDME_SMTP_FROM", SMTP_USERNAME)
    SMTP_USE_TLS = os.getenv("FINDME_SMTP_USE_TLS", "true").lower() == "true"
