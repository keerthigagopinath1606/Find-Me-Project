"""DeepFace/FaceNet embedding and controlled verified-record matching.

No upload-folder sweep is used: routes pass only embeddings belonging to verified
missing-person records from the database. Results remain officer-review leads.
"""
from pathlib import Path
import json
import numpy as np

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DeepFace = None
    DEEPFACE_AVAILABLE = False

MODEL_NAME = "Facenet512"
ARC_MODEL_NAME = "ArcFace"
DETECTOR = "retinaface"

# V20 performance caches: keep model/reference work out of the per-frame hot path.
_REFERENCE_TEMPLATE_CACHE = {}
_ARCFACE_REFERENCE_CACHE = {}
_EFFICIENTNET_MODEL = None
_EFFICIENTNET_REFERENCE_CACHE = {}
_FAST_FACE_CASCADE = None
_FAST_PROFILE_CASCADE = None

def _require_engine():
    if not DEEPFACE_AVAILABLE:
        raise RuntimeError("DeepFace is unavailable. Install requirements.txt to enable FaceNet analysis.")

def embeddings_for(path, allow_multiple=False):
    """Return FaceNet vectors, rejecting ambiguous single-photo registrations."""
    _require_engine()
    records = DeepFace.represent(img_path=str(Path(path)), model_name=MODEL_NAME,
                                 detector_backend=DETECTOR, enforce_detection=True, align=True)
    if not records:
        raise ValueError("No face detected in the uploaded image.")
    if len(records) > 1 and not allow_multiple:
        raise ValueError("Multiple faces detected. Upload a clear photo containing one person.")
    return [record["embedding"] for record in records]

def face_regions_for(image):
    """Return fast CCTV face regions without running FaceNet.

    Video analysis uses this detector-only step first, then FaceNet512 is
    evaluated only when a tracked face needs a fresh identity embedding.
    This keeps FaceNet512 as the identity model while avoiding repeated model
    inference for the same person across nearby CCTV frames.
    """
    _require_engine()
    import cv2

    global _FAST_FACE_CASCADE, _FAST_PROFILE_CASCADE
    if _FAST_FACE_CASCADE is None:
        _FAST_FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    if _FAST_PROFILE_CASCADE is None:
        _FAST_PROFILE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )

    if image is None or getattr(image, "size", 0) == 0:
        return []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = image.shape[:2]
    scale = 1.0
    detect_img = gray
    longest = max(h, w)
    if longest > 900:
        scale = 900.0 / longest
        detect_img = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    raw_boxes = list(_FAST_FACE_CASCADE.detectMultiScale(
        detect_img, scaleFactor=1.10, minNeighbors=5, minSize=(28, 28)
    ))
    if not raw_boxes:
        raw_boxes = list(_FAST_PROFILE_CASCADE.detectMultiScale(
            detect_img, scaleFactor=1.10, minNeighbors=4, minSize=(28, 28)
        ))

    regions = []
    seen = set()
    for x, y, bw, bh in raw_boxes:
        x, y = int(x / scale), int(y / scale)
        bw, bh = int(bw / scale), int(bh / scale)
        area = {"x": x, "y": y, "w": bw, "h": bh}
        key = (round(x / 8), round(y / 8), round(bw / 8), round(bh / 8))
        if key in seen:
            continue
        seen.add(key)
        regions.append(area)

    # Accurate detector is a fallback only when the fast detector misses all
    # faces in a sampled frame. It is never used as the normal hot path.
    if not regions:
        try:
            accurate = DeepFace.represent(
                img_path=image, model_name=MODEL_NAME, detector_backend=DETECTOR,
                enforce_detection=False, align=True,
            ) or []
            for record in accurate:
                area = record.get("facial_area") or {}
                try:
                    x = int(area.get("x", 0)); y = int(area.get("y", 0))
                    bw = int(area.get("w", 0)); bh = int(area.get("h", 0))
                except Exception:
                    continue
                if bw > 0 and bh > 0:
                    regions.append({"x": x, "y": y, "w": bw, "h": bh})
        except Exception:
            pass
    return regions


def face_records_for(image):
    """Fast CCTV face proposals + FaceNet512 embeddings.

    The video hot path intentionally uses OpenCV Haar proposals instead of
    RetinaFace on every sampled frame. RetinaFace is still available through
    the targeted refinement pass for the strongest candidate. This keeps CPU
    processing fast while preserving a high-quality FaceNet identity check.
    """
    _require_engine()
    import cv2

    global _FAST_FACE_CASCADE, _FAST_PROFILE_CASCADE
    if _FAST_FACE_CASCADE is None:
        _FAST_FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    if _FAST_PROFILE_CASCADE is None:
        _FAST_PROFILE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = image.shape[:2]
    scale = 1.0
    detect_img = gray
    longest = max(h, w)
    if longest > 900:
        scale = 900.0 / longest
        detect_img = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    raw_boxes = list(_FAST_FACE_CASCADE.detectMultiScale(
        detect_img, scaleFactor=1.10, minNeighbors=5, minSize=(28, 28)
    ))
    if not raw_boxes:
        raw_boxes = list(_FAST_PROFILE_CASCADE.detectMultiScale(
            detect_img, scaleFactor=1.10, minNeighbors=4, minSize=(28, 28)
        ))

    records = []
    seen = set()
    for x, y, bw, bh in raw_boxes:
        x, y = int(x / scale), int(y / scale)
        bw, bh = int(bw / scale), int(bh / scale)
        area = {"x": x, "y": y, "w": bw, "h": bh}
        key = (round(x / 8), round(y / 8), round(bw / 8), round(bh / 8))
        if key in seen:
            continue
        seen.add(key)
        try:
            vector = face_embedding_from_crop(image, area)
        except Exception:
            vector = None
        if vector:
            records.append({
                "embedding": vector,
                "facial_area": area,
                "detector_confidence": 0.90,
            })

    # If the fast detector misses everything, use the accurate detector once
    # rather than silently returning no candidates.
    if not records:
        try:
            accurate = DeepFace.represent(
                img_path=image, model_name=MODEL_NAME, detector_backend=DETECTOR,
                enforce_detection=False, align=True,
            ) or []
            for record in accurate:
                vector = record.get("embedding")
                area = record.get("facial_area") or {}
                if not isinstance(vector, (list, tuple)) or len(vector) != 512:
                    continue
                try:
                    x = int(area.get("x", 0)); y = int(area.get("y", 0))
                    bw = int(area.get("w", 0)); bh = int(area.get("h", 0))
                except Exception:
                    continue
                if bw > 0 and bh > 0:
                    records.append({
                        "embedding": vector,
                        "facial_area": {"x": x, "y": y, "w": bw, "h": bh},
                        "detector_confidence": float(record.get("face_confidence", 0.95) or 0.95),
                    })
        except Exception as error:
            print(f"[Find-Me] Accurate fallback detection failed: {error}")

    return records


def refine_face_records_for(image):
    """Accurate second-pass face detection for frames containing multiple people.

    V20 uses Haar for fast screening. When several faces are present, Haar
    boxes can be imprecise, which can make the evidence marker point at the
    wrong person. This function uses RetinaFace only as a targeted second pass
    on those ambiguous frames. It returns FaceNet512 embeddings and accurate
    facial areas for the final candidate/evidence selection.
    """
    _require_engine()
    try:
        records = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True,
            align=True,
        )
    except Exception:
        return []
    refined = []
    for record in records or []:
        vector = record.get("embedding")
        area = record.get("facial_area") or {}
        if not isinstance(vector, (list, tuple)) or len(vector) != 512:
            continue
        try:
            x = int(area.get("x", 0)); y = int(area.get("y", 0))
            w = int(area.get("w", 0)); h = int(area.get("h", 0))
        except Exception:
            continue
        if w <= 0 or h <= 0:
            continue
        refined.append({
            "embedding": vector,
            "facial_area": {"x": x, "y": y, "w": w, "h": h},
            "detector_confidence": float(record.get("face_confidence", 0.95) or 0.95),
        })
    return refined


def face_quality(image, facial_area, detector_confidence=None):
    """Return an explainable 0-100 quality score for a CCTV face observation."""
    try:
        import cv2
        import numpy as np
        if image is None or not facial_area:
            return {"score": 0.0, "usable": False, "reasons": ["missing face region"]}
        h, w = image.shape[:2]
        x = int(facial_area.get("x", 0)); y = int(facial_area.get("y", 0))
        fw = int(facial_area.get("w", 0)); fh = int(facial_area.get("h", 0))
        if fw <= 0 or fh <= 0 or w <= 0 or h <= 0:
            return {"score": 0.0, "usable": False, "reasons": ["invalid face region"]}
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w, x + fw), min(h, y + fh)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return {"score": 0.0, "usable": False, "reasons": ["empty face crop"]}

        reasons = []
        size_score = min(100.0, max(0.0, (min(fw, fh) - 35.0) / 1.65))
        if min(fw, fh) < 40:
            reasons.append("face too small")
        area_ratio = (fw * fh) / float(w * h)
        if area_ratio < 0.0007:
            reasons.append("very small face area")
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        sharp_score = min(100.0, max(0.0, sharpness / 2.5))
        if sharpness < 18:
            reasons.append("motion/compression blur")
        brightness = float(np.mean(gray))
        exposure_score = 100.0 if 55 <= brightness <= 205 else max(0.0, 100.0 - abs(brightness - 130) * 1.2)
        if brightness < 35 or brightness > 235:
            reasons.append("poor exposure")
        confidence_score = 100.0
        if detector_confidence is not None:
            try:
                c = float(detector_confidence)
                if c <= 1:
                    c *= 100
                confidence_score = max(0.0, min(100.0, c))
                if confidence_score < 45:
                    reasons.append("low detector confidence")
            except Exception:
                pass

        score = 0.35 * size_score + 0.35 * sharp_score + 0.15 * exposure_score + 0.15 * confidence_score
        usable = score >= 32.0 and min(fw, fh) >= 32 and area_ratio >= 0.00045
        if not usable and not reasons:
            reasons.append("insufficient visual quality")
        return {
            "score": round(float(score), 2),
            "usable": bool(usable),
            "reasons": reasons[:4],
            "face_width": fw,
            "face_height": fh,
            "sharpness": round(sharpness, 2),
            "brightness": round(brightness, 2),
            "detector_confidence": round(confidence_score, 2),
        }
    except Exception as error:
        return {"score": 50.0, "usable": True, "reasons": [f"quality fallback: {error}"]}


def face_embedding_from_crop(image, facial_area):
    """Generate a FaceNet512 embedding directly from a detected face crop.

    This avoids running a second detector on a small CCTV face and keeps the
    comparison focused on the actual detected face region.
    """
    _require_engine()
    import cv2
    if not facial_area:
        return None
    try:
        x = int(facial_area.get("x", 0))
        y = int(facial_area.get("y", 0))
        w = int(facial_area.get("w", 0))
        h = int(facial_area.get("h", 0))
    except Exception:
        return None
    if w <= 0 or h <= 0:
        return None
    ih, iw = image.shape[:2]
    x1 = max(0, min(iw - 1, x))
    y1 = max(0, min(ih - 1, y))
    x2 = max(x1 + 1, min(iw, x + w))
    y2 = max(y1 + 1, min(ih, y + h))
    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
    records = DeepFace.represent(
        img_path=crop,
        model_name=MODEL_NAME,
        detector_backend="skip",
        enforce_detection=False,
        align=False,
    )
    if not records:
        return None
    vector = records[0].get("embedding")
    return vector if isinstance(vector, (list, tuple)) else None



def _face_augmented_variants(crop):
    """Return controlled face augmentations for pose/lighting/occlusion robustness.

    These are used only for embedding generation. They are not displayed to the
    user and are never treated as separate people.
    """
    import cv2
    if crop is None or getattr(crop, "size", 0) == 0:
        return []
    base = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
    variants = [base, cv2.flip(base, 1)]

    # Mild lighting/contrast changes.
    variants.append(cv2.convertScaleAbs(base, alpha=1.08, beta=6))
    variants.append(cv2.convertScaleAbs(base, alpha=0.92, beta=-4))

    # Mild blur makes the embedding less sensitive to CCTV softness.
    variants.append(cv2.GaussianBlur(base, (3, 3), 0))

    # Lower-face occlusion augmentation.  This helps when a mask, scarf,
    # hand, shadow, or compression artifact hides the mouth/chin area.
    masked = base.copy()
    y0 = int(masked.shape[0] * 0.56)
    masked[y0:, :] = cv2.GaussianBlur(masked[y0:, :], (21, 21), 0)
    variants.append(masked)

    neutral_mask = base.copy()
    y0 = int(neutral_mask.shape[0] * 0.58)
    lower = neutral_mask[y0:, :]
    if lower.size:
        mean_pixel = np.mean(lower, axis=(0, 1), keepdims=True).astype(np.uint8)
        neutral_mask[y0:, :] = mean_pixel
    variants.append(neutral_mask)

    # De-duplicate by image content.
    unique = []
    for v in variants:
        if not any(np.array_equal(v, old) for old in unique):
            unique.append(v)
    return unique


def face_augmented_embeddings_from_crop(image, facial_area):
    """Create FaceNet512 embeddings for original + controlled augmented crops.

    The first embedding is the normal face representation. Additional embeddings
    make matching more tolerant to lighting, mild blur, horizontal pose changes,
    and lower-face occlusion. The best genuine similarity is selected later.
    """
    _require_engine()
    import cv2
    if image is None or not facial_area:
        return []
    try:
        x = int(facial_area.get("x", 0)); y = int(facial_area.get("y", 0))
        w = int(facial_area.get("w", 0)); h = int(facial_area.get("h", 0))
        ih, iw = image.shape[:2]
        if w <= 0 or h <= 0:
            return []
        pad_x, pad_y = max(2, int(w * 0.12)), max(2, int(h * 0.15))
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(iw, x + w + pad_x), min(ih, y + h + pad_y)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or min(crop.shape[:2]) < 28:
            return []

        vectors = []
        for variant in _face_augmented_variants(crop):
            try:
                reps = DeepFace.represent(
                    img_path=variant,
                    model_name=MODEL_NAME,
                    detector_backend="skip",
                    enforce_detection=False,
                    align=False,
                ) or []
                if reps:
                    vec = reps[0].get("embedding")
                    if isinstance(vec, (list, tuple)) and len(vec) == 512:
                        vectors.append(vec)
            except Exception:
                continue

        # Keep numerical duplicates out of the query set.
        unique = []
        for vec in vectors:
            arr = np.asarray(vec, dtype=float)
            if not any(np.allclose(arr, np.asarray(old, dtype=float), atol=1e-8) for old in unique):
                unique.append(vec)
        return unique
    except Exception as error:
        print(f"[Find-Me] Face augmentation query failed: {error}")
        return []

def reference_embeddings_for(path):
    """Build several compatible FaceNet512 templates from one registration photo.

    Results are cached by file path/mtime because reference-template generation
    is independent of the CCTV frame being processed.


    The registration photo is normalized using the same detected-face crop path
    used for video frames. Multiple templates reduce sensitivity to background,
    detector alignment and small pose/lighting differences.
    """
    _require_engine()
    import cv2
    cache_key = str(Path(path).resolve())
    try:
        cache_key = f"{cache_key}:{Path(path).stat().st_mtime_ns}"
        if cache_key in _REFERENCE_TEMPLATE_CACHE:
            return _REFERENCE_TEMPLATE_CACHE[cache_key]
    except Exception:
        pass
    image = cv2.imread(str(Path(path)))
    if image is None:
        raise ValueError("Unable to read the registered photograph.")

    records = DeepFace.represent(
        img_path=image, model_name=MODEL_NAME, detector_backend=DETECTOR,
        enforce_detection=True, align=True,
    )
    if not records:
        raise ValueError("No face detected in the registered photograph.")
    if len(records) != 1:
        raise ValueError("The registered photograph must contain exactly one face.")

    templates = []
    primary = records[0].get("embedding")
    if isinstance(primary, (list, tuple)) and len(primary) == 512:
        templates.append(primary)

    area = records[0].get("facial_area") or {}
    try:
        x, y = int(area.get("x", 0)), int(area.get("y", 0))
        w, h = int(area.get("w", 0)), int(area.get("h", 0))
    except Exception:
        x = y = w = h = 0
    ih, iw = image.shape[:2]
    if w > 0 and h > 0:
        # Add a small context margin while keeping the face centered.
        pad_x, pad_y = int(w * 0.18), int(h * 0.22)
        x1, y1 = max(0, x-pad_x), max(0, y-pad_y)
        x2, y2 = min(iw, x+w+pad_x), min(ih, y+h+pad_y)
        crop = image[y1:y2, x1:x2]
        if crop.size:
            crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
            variants = _face_augmented_variants(crop)
            for variant in variants:
                try:
                    reps = DeepFace.represent(
                        img_path=variant, model_name=MODEL_NAME, detector_backend="skip",
                        enforce_detection=False, align=False,
                    )
                    if reps:
                        vec = reps[0].get("embedding")
                        if isinstance(vec, (list, tuple)) and len(vec) == 512:
                            templates.append(vec)
                except Exception:
                    pass

    # De-duplicate numerically identical templates.
    unique = []
    for vec in templates:
        arr = np.asarray(vec, dtype=float)
        if not any(np.allclose(arr, np.asarray(old, dtype=float), atol=1e-8) for old in unique):
            unique.append(vec)
    try:
        _REFERENCE_TEMPLATE_CACHE[cache_key] = unique
    except Exception:
        pass
    return unique



def efficientnet_b0_model():
    """Load an ImageNet-pretrained EfficientNet-B0 transfer model once.

    EfficientNet-B0 is used as a secondary visual embedding/corroboration
    model. FaceNet512 remains the identity-specialized primary score.
    """
    global _EFFICIENTNET_MODEL
    if _EFFICIENTNET_MODEL is not None:
        return _EFFICIENTNET_MODEL
    try:
        from tensorflow.keras.applications import EfficientNetB0
        _EFFICIENTNET_MODEL = EfficientNetB0(
            include_top=False, weights="imagenet", pooling="avg"
        )
        return _EFFICIENTNET_MODEL
    except Exception as error:
        print(f"[Find-Me] EfficientNet-B0 unavailable; continuing with FaceNet512: {error}")
        return None


def efficientnet_b0_embedding_from_crop(image, facial_area):
    """Create a 1280-D EfficientNet-B0 transfer-learning embedding for a face crop."""
    import cv2
    model = efficientnet_b0_model()
    if model is None or image is None or not facial_area:
        return None
    try:
        x = int(facial_area.get("x", 0)); y = int(facial_area.get("y", 0))
        w = int(facial_area.get("w", 0)); h = int(facial_area.get("h", 0))
        ih, iw = image.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(iw, x + w), min(ih, y + h)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or x2 <= x1 or y2 <= y1:
            return None
        crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype("float32")
        batch = np.expand_dims(rgb, axis=0)
        vector = model.predict(batch, verbose=0)[0]
        norm = np.linalg.norm(vector)
        if norm <= 1e-12:
            return None
        return (vector / norm).astype("float32").tolist()
    except Exception as error:
        print(f"[Find-Me] EfficientNet-B0 query embedding failed: {error}")
        return None


def efficientnet_b0_reference_embeddings_for(path):
    """Create original + mild augmented EfficientNet-B0 reference embeddings."""
    import cv2
    cache_key = str(Path(path).resolve())
    try:
        cache_key = f"{cache_key}:{Path(path).stat().st_mtime_ns}"
        if cache_key in _EFFICIENTNET_REFERENCE_CACHE:
            return _EFFICIENTNET_REFERENCE_CACHE[cache_key]
    except Exception:
        pass
    model = efficientnet_b0_model()
    if model is None:
        return []
    image = cv2.imread(str(Path(path)))
    if image is None:
        return []
    try:
        records = DeepFace.represent(
            img_path=image, model_name=MODEL_NAME, detector_backend=DETECTOR,
            enforce_detection=True, align=True,
        ) or []
        if len(records) != 1:
            return []
        area = records[0].get("facial_area") or {}
        x, y = int(area.get("x", 0)), int(area.get("y", 0))
        w, h = int(area.get("w", 0)), int(area.get("h", 0))
        ih, iw = image.shape[:2]
        pad_x, pad_y = int(w * 0.12), int(h * 0.16)
        x1, y1 = max(0, x-pad_x), max(0, y-pad_y)
        x2, y2 = min(iw, x+w+pad_x), min(ih, y+h+pad_y)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return []
        crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_AREA)
        variants = [
            crop,
            cv2.flip(crop, 1),
            cv2.convertScaleAbs(crop, alpha=1.08, beta=6),
            cv2.convertScaleAbs(crop, alpha=0.92, beta=-4),
        ]
        vectors = []
        for variant in variants:
            rgb = cv2.cvtColor(variant, cv2.COLOR_BGR2RGB).astype("float32")
            vec = model.predict(np.expand_dims(rgb, 0), verbose=0)[0]
            norm = np.linalg.norm(vec)
            if norm > 1e-12:
                vectors.append((vec / norm).astype("float32").tolist())
        _EFFICIENTNET_REFERENCE_CACHE[cache_key] = vectors
        return vectors
    except Exception as error:
        print(f"[Find-Me] EfficientNet-B0 reference embedding failed: {error}")
        return []


def efficientnet_similarity(reference_vectors, query_vector):
    """Return a 0-100 cosine similarity for EfficientNet-B0 visual corroboration."""
    if not reference_vectors or query_vector is None:
        return 0.0
    q = _normalize_embedding(query_vector)
    if q is None:
        return 0.0
    best = 0.0
    for ref in reference_vectors:
        r = _normalize_embedding(ref)
        if r is None or r.shape != q.shape:
            continue
        cosine = float(np.dot(r, q))
        score = max(0.0, min(100.0, ((cosine + 1.0) / 2.0) * 100.0))
        best = max(best, score)
    return round(float(best), 4)

def embedding_for(path):
    return embeddings_for(path, allow_multiple=False)[0]

def similarity(first_json, second_vector):
    first = np.asarray(json.loads(first_json) if isinstance(first_json, str) else first_json, dtype=float)
    second = np.asarray(second_vector, dtype=float)
    if first.shape != second.shape:
        return 0.0
    denominator = max(float(np.linalg.norm(first) * np.linalg.norm(second)), 1e-12)
    return max(0.0, min(100.0, ((float(np.dot(first, second) / denominator) + 1.0) / 2.0) * 100.0))

def _normalize_embedding(vector):
    arr = np.asarray(vector, dtype=float)
    norm = float(np.linalg.norm(arr))
    if norm <= 1e-12:
        return None
    return arr / norm


def robust_face_similarity(reference_vectors, query_vector):
    """Compare a CCTV face against multiple reference templates robustly.

    A single maximum cosine score can occasionally produce a false positive from
    one noisy template. Use the strongest few template similarities and combine
    them, while still preserving the strongest genuine match.
    """
    if not reference_vectors or query_vector is None:
        return 0.0
    q = _normalize_embedding(query_vector)
    if q is None:
        return 0.0
    scores = []
    for ref in reference_vectors:
        r = _normalize_embedding(ref)
        if r is None or r.shape != q.shape:
            continue
        cosine = float(np.dot(r, q))
        scores.append(max(0.0, min(100.0, ((cosine + 1.0) / 2.0) * 100.0)))
    if not scores:
        return 0.0
    scores.sort(reverse=True)
    # The primary face score must remain an actual similarity observation.
    # Earlier versions averaged several augmented templates and could suppress
    # a genuine best match by several points even when one verified reference
    # template matched strongly. Consensus is still handled by repeated CCTV
    # observations and the identity gate in app.py, so do not manufacture a
    # lower score here.
    return round(float(max(scores)), 4)


def aligned_face_embedding_from_crop(image, facial_area):
    """Optional higher-quality FaceNet embedding for an already detected face.

    Used only for the strongest candidate on a sampled frame. RetinaFace performs
    a targeted alignment without becoming the main per-frame detector.
    """
    _require_engine()
    import cv2
    if image is None or not facial_area:
        return None
    try:
        x = int(facial_area.get("x", 0)); y = int(facial_area.get("y", 0))
        w = int(facial_area.get("w", 0)); h = int(facial_area.get("h", 0))
        ih, iw = image.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(iw, x + w), min(ih, y + h)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or min(crop.shape[:2]) < 28:
            return None
        # A small margin gives the detector enough context for alignment.
        pad_x, pad_y = max(2, int(w * 0.12)), max(2, int(h * 0.15))
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(iw, x + w + pad_x), min(ih, y + h + pad_y)
        crop = image[y1:y2, x1:x2]
        records = DeepFace.represent(
            img_path=crop, model_name=MODEL_NAME, detector_backend=DETECTOR,
            enforce_detection=False, align=True,
        )
        if not records:
            return None
        vector = records[0].get("embedding")
        if isinstance(vector, (list, tuple)) and len(vector) == 512:
            return vector
    except Exception:
        return None
    return None




def arcface_embedding_from_crop(image, facial_area):
    """Generate an ArcFace embedding for an already detected CCTV face crop."""
    _require_engine()
    import cv2
    if image is None or not facial_area:
        return None
    try:
        x = int(facial_area.get("x", 0)); y = int(facial_area.get("y", 0))
        w = int(facial_area.get("w", 0)); h = int(facial_area.get("h", 0))
        ih, iw = image.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(iw, x + w), min(ih, y + h)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or min(crop.shape[:2]) < 28:
            return None
        pad_x, pad_y = max(2, int(w * 0.10)), max(2, int(h * 0.12))
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(iw, x + w + pad_x), min(ih, y + h + pad_y)
        crop = image[y1:y2, x1:x2]
        records = DeepFace.represent(
            img_path=crop, model_name=ARC_MODEL_NAME, detector_backend="skip",
            enforce_detection=False, align=False, normalization="base"
        )
        if not records:
            return None
        vector = records[0].get("embedding")
        return vector if isinstance(vector, (list, tuple)) else None
    except Exception:
        return None


def arcface_reference_embeddings_for(path):
    """Build cached ArcFace reference templates from a verified registration photo."""
    _require_engine()
    import cv2
    cache_key = str(Path(path).resolve())
    try:
        cache_key = f"{cache_key}:{Path(path).stat().st_mtime_ns}"
        if cache_key in _ARCFACE_REFERENCE_CACHE:
            return _ARCFACE_REFERENCE_CACHE[cache_key]
    except Exception:
        pass
    image = cv2.imread(str(Path(path)))
    if image is None:
        return []
    try:
        records = DeepFace.represent(
            img_path=image, model_name=ARC_MODEL_NAME, detector_backend=DETECTOR,
            enforce_detection=True, align=True, normalization="base"
        )
    except Exception:
        return []
    if not records or len(records) != 1:
        return []
    templates = []
    primary = records[0].get("embedding")
    if isinstance(primary, (list, tuple)):
        templates.append(primary)
    area = records[0].get("facial_area") or {}
    try:
        x, y = int(area.get("x", 0)), int(area.get("y", 0))
        w, h = int(area.get("w", 0)), int(area.get("h", 0))
        ih, iw = image.shape[:2]
        if w > 0 and h > 0:
            px, py = int(w * 0.18), int(h * 0.22)
            x1, y1 = max(0, x - px), max(0, y - py)
            x2, y2 = min(iw, x + w + px), min(ih, y + h + py)
            crop = image[y1:y2, x1:x2]
            if crop.size:
                crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
                variants = [crop, cv2.flip(crop, 1), cv2.convertScaleAbs(crop, alpha=1.08, beta=6)]
                for variant in variants:
                    try:
                        reps = DeepFace.represent(
                            img_path=variant, model_name=ARC_MODEL_NAME, detector_backend="skip",
                            enforce_detection=False, align=False, normalization="base"
                        )
                        if reps and isinstance(reps[0].get("embedding"), (list, tuple)):
                            templates.append(reps[0]["embedding"])
                    except Exception:
                        pass
    except Exception:
        pass
    unique = []
    for vec in templates:
        arr = np.asarray(vec, dtype=float)
        if not any(arr.shape == np.asarray(old, dtype=float).shape and np.allclose(arr, np.asarray(old, dtype=float), atol=1e-8) for old in unique):
            unique.append(vec)
    try:
        _ARCFACE_REFERENCE_CACHE[cache_key] = unique
    except Exception:
        pass
    return unique

def confidence(score):
    return "HIGH" if score >= 88 else "MEDIUM" if score >= 76 else "LOW"


# ---------------------------------------------------------------------------
# V6 MULTI-CLUE SCORING
# ---------------------------------------------------------------------------

def _clip(value):
    try:
        return max(0.0, min(100.0, float(value)))
    except Exception:
        return 0.0


def clothing_similarity(reference_photo_path, frame, facial_area, upload_root):
    """Prototype clothing/appearance similarity using HSV color distributions.

    The comparison deliberately uses the upper-body/context area rather than
    the face. It is an appearance clue, not clothing identity recognition.
    """
    try:
        import cv2
        ref = cv2.imread(str(Path(upload_root) / reference_photo_path))
        if ref is None or frame is None or not facial_area:
            return 50.0
        x, y = int(facial_area.get("x", 0)), int(facial_area.get("y", 0))
        w, h = int(facial_area.get("w", 0)), int(facial_area.get("h", 0))
        if w <= 0 or h <= 0:
            return 50.0

        def context_crop(img, area):
            xx, yy, ww, hh = area
            ih, iw = img.shape[:2]
            # Use the region below/around the face, approximately upper body.
            x1 = max(0, xx - int(ww * 0.9))
            x2 = min(iw, xx + int(ww * 1.9))
            y1 = max(0, yy + int(hh * 0.45))
            y2 = min(ih, yy + int(hh * 3.2))
            if y2 <= y1 or x2 <= x1:
                return None
            crop = img[y1:y2, x1:x2]
            return crop if crop.size else None

        # Registration and CCTV coordinates are unrelated. Use the lower half
        # of the registered portrait as the reference clothing appearance.
        rh, rw = ref.shape[:2]
        ref_crop = ref[int(rh * 0.45):int(rh * 0.95), int(rw * 0.15):int(rw * 0.85)]
        vid_crop = context_crop(frame, (x, y, w, h))
        if ref_crop is None or vid_crop is None or ref_crop.size == 0 or vid_crop.size == 0:
            return 50.0

        def hist(img):
            hsv = cv2.cvtColor(cv2.resize(img, (96, 128)), cv2.COLOR_BGR2HSV)
            hst = cv2.calcHist([hsv], [0, 1], None, [12, 8], [0, 180, 0, 256])
            cv2.normalize(hst, hst)
            return hst

        a, b = hist(ref_crop), hist(vid_crop)
        corr = float(cv2.compareHist(a, b, cv2.HISTCMP_CORREL))
        score = _clip((corr + 1.0) * 50.0)
        # Clothing is a temporary appearance clue. If the face evidence is
        # strong, a changed shirt/outer layer should not collapse the candidate
        # to an artificial zero. The caller still weights this clue only at 20%.
        return score
    except Exception:
        return 50.0


def estimate_age_from_face(image, facial_area):
    """Estimate age with DeepFace's age analyzer when its model is available.

    Returns None when the optional age model cannot be loaded; callers then use
    an explicitly neutral age clue rather than fabricating an estimate.
    """
    if not DEEPFACE_AVAILABLE or image is None or not facial_area:
        return None
    try:
        import cv2
        x, y = int(facial_area.get("x", 0)), int(facial_area.get("y", 0))
        w, h = int(facial_area.get("w", 0)), int(facial_area.get("h", 0))
        if w <= 0 or h <= 0:
            return None
        ih, iw = image.shape[:2]
        pad_x, pad_y = int(w * 0.25), int(h * 0.35)
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(iw, x + w + pad_x), min(ih, y + h + pad_y)
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return None
        crop = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_CUBIC)
        analyzed = DeepFace.analyze(
            img_path=crop, actions=["age"], detector_backend="skip",
            enforce_detection=False, silent=True,
        )
        item = analyzed[0] if isinstance(analyzed, list) and analyzed else analyzed
        age = item.get("age") if isinstance(item, dict) else None
        return float(age) if age is not None else None
    except Exception:
        return None


def age_compatibility(reference_age, observed_age):
    """Weak supporting age clue for imperfect CCTV age estimates.

    CCTV age estimation is noisy and must never create a perfect-looking
    compatibility score. V13 caps this clue at 75 and keeps missing/uncertain
    estimates neutral so age cannot dominate the candidate ranking.
    """
    if reference_age is None or observed_age is None:
        return 50.0
    try:
        diff = abs(float(reference_age) - float(observed_age))
        if diff <= 5:
            return 75.0
        if diff <= 10:
            return 65.0
        if diff <= 15:
            return 55.0
        if diff <= 20:
            return 40.0
        return 25.0
    except Exception:
        return 50.0


def _tokens(text):
    import re
    return {t for t in re.findall(r"[a-z0-9]+", str(text or "").lower()) if len(t) >= 3}


def _known_place(text):
    """Return a known Indian place name and approximate coordinates when available.

    This is deliberately a small offline prototype dictionary so the expo build
    does not depend on an external geocoding service. Unknown places fall back
    to text-context scoring instead of being treated as a hard mismatch.
    """
    import re
    places = {
        "kanchipuram": (12.8342, 79.7036), "chennai": (13.0827, 80.2707),
        "chengalpattu": (12.6819, 79.9888), "tambaram": (12.9249, 80.1000),
        "vellore": (12.9165, 79.1325), "tiruvallur": (13.1437, 79.9083),
        "pondicherry": (11.9416, 79.8083), "puducherry": (11.9416, 79.8083),
        "salem": (11.6643, 78.1460), "coimbatore": (11.0168, 76.9558),
        "madurai": (9.9252, 78.1198), "trichy": (10.7905, 78.7047),
        "tiruchirappalli": (10.7905, 78.7047), "dindigul": (10.3673, 77.9803),
        "thanjavur": (10.7870, 79.1378), "erode": (11.3410, 77.7172),
        "tiruppur": (11.1085, 77.3411), "tirunelveli": (8.7139, 77.7567),
        "bengaluru": (12.9716, 77.5946), "bangalore": (12.9716, 77.5946),
        "hyderabad": (17.3850, 78.4867), "mumbai": (19.0760, 72.8777),
        "delhi": (28.6139, 77.2090), "new delhi": (28.6139, 77.2090),
        "kolkata": (22.5726, 88.3639), "jaipur": (26.9124, 75.7873),
        "ahmedabad": (23.0225, 72.5714), "pune": (18.5204, 73.8567),
    }
    text = str(text or "").lower()
    for name, coords in sorted(places.items(), key=lambda x: -len(x[0])):
        if re.search(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", text):
            return name, coords
    return None, None

def _haversine_km(a, b):
    import math
    lat1, lon1 = a; lat2, lon2 = b
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))

def location_relevance(last_seen_location, camera_location):
    """Movement-aware location relevance. A different location is not a hard mismatch.

    Same-place sightings score highest. When both places are recognized, the
    score reflects geographic distance so a Kanchipuram -> Chennai sighting is
    treated as plausible movement rather than rejected. Unknown places use
    conservative text-context scoring.
    """
    if not last_seen_location or not camera_location:
        return 50.0
    a, b = _tokens(last_seen_location), _tokens(camera_location)
    la, lb = str(last_seen_location).lower(), str(camera_location).lower()
    if la == lb or la in lb or lb in la:
        return 100.0
    city_a, coords_a = _known_place(last_seen_location)
    city_b, coords_b = _known_place(camera_location)
    if coords_a and coords_b:
        if city_a == city_b:
            return 100.0
        distance = _haversine_km(coords_a, coords_b)
        if distance <= 15: return 95.0
        if distance <= 50: return 85.0
        if distance <= 100: return 75.0
        if distance <= 200: return 68.0
        if distance <= 400: return 58.0
        if distance <= 800: return 50.0
        return 45.0
    if a and b:
        overlap = len(a & b) / max(1, len(a | b))
        if overlap >= 0.5: return 90.0
        if overlap >= 0.25: return 75.0
        # Different/unknown locations remain a neutral contextual clue rather
        # than a rejection because missing people can move.
        return 55.0
    return 50.0


def location_context(last_seen_location, camera_location):
    if not last_seen_location or not camera_location:
        return "Location context unavailable; officer should consider movement evidence."
    city_a, coords_a = _known_place(last_seen_location)
    city_b, coords_b = _known_place(camera_location)
    if city_a and city_b:
        if city_a == city_b:
            return "Same broad location as the last-known sighting."
        distance = _haversine_km(coords_a, coords_b)
        return f"Different location ({city_a.title()} → {city_b.title()}, about {distance:.0f} km); treated as possible movement context, not an automatic rejection."
    return "Different/uncertain location; treated as movement context rather than an automatic rejection."

def clothing_context(reference_clothing, visual_score):
    if not reference_clothing:
        return "No registered clothing description; clothing remains a supporting visual clue."
    return "Clothing is supporting evidence only; a change of clothing does not eliminate a face candidate."

def _parse_datetime(date_text, time_text):
    from datetime import datetime
    if not date_text:
        return None
    raw = str(date_text).strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M", "%d/%m/%Y %H:%M", "%Y-%m-%d"):
        try:
            if "%H" in fmt:
                return datetime.strptime(f"{raw} {(time_text or '00:00')}", fmt)
            return datetime.strptime(raw, fmt)
        except Exception:
            continue
    return None


def time_relevance(last_date, last_time, capture_date, capture_time):
    if not last_date or not capture_date:
        return 50.0
    a = _parse_datetime(last_date, last_time)
    b = _parse_datetime(capture_date, capture_time)
    if not a or not b:
        return 50.0
    hours = abs((b - a).total_seconds()) / 3600.0
    if hours <= 6:
        return 100.0
    if hours <= 24:
        return 90.0
    if hours <= 72:
        return 75.0
    if hours <= 168:
        return 60.0
    if hours <= 720:
        return 40.0
    return 20.0


def combined_score(face, clothing, age, location, time):
    """PPT-aligned weighted candidate score, all inputs on a 0-100 scale."""
    return _clip(
        _clip(face) * 0.40 +
        _clip(clothing) * 0.20 +
        _clip(age) * 0.15 +
        _clip(location) * 0.15 +
        _clip(time) * 0.10
    )
