# Accuracy + Detection Final Fix

- RetinaFace is now the primary detector for sampled CCTV frames.
- Detection and FaceNet512 embedding are produced in one DeepFace call, avoiding a loose Haar crop followed by a second embedding pass.
- Haar/profile detection remains only as a fallback when RetinaFace cannot decode a frame.
- Registered references continue to use FaceNet512 with multiple genuine image variants (original, flip, brightness/contrast variants).
- The strongest real template similarity is preserved; no artificial score boost is applied.
- The video path avoids ArcFace and repeated RetinaFace refinement, keeping CPU processing practical for the under-one-minute target on short clips.
- The existing repeated-evidence identity gate remains in place.
- Notification changes from the preceding build are preserved.
