# AI Accuracy / Masking / Augmentation Update

## What changed

- FaceNet512 remains the primary identity model.
- Added controlled multi-view query augmentation:
  - original face
  - horizontal flip
  - mild brightness increase/decrease
  - mild blur for CCTV softness
  - lower-face blur/occlusion
  - lower-face neutral occlusion
- Added the same occlusion-aware augmentation family to registered reference templates.
- The matcher now compares the detected face against multiple compatible FaceNet512 views.
- EfficientNet-B0 remains the secondary ImageNet transfer-learning visual corroboration model.
- RetinaFace remains the targeted accurate face detector/alignment path.
- Existing identity thresholds and human-verification safeguards were preserved; the system does not simply lower thresholds to create matches.
- Existing transitions, notifications and speed-oriented caching/model reuse remain unchanged.

## Important

Augmentation improves robustness but cannot guarantee a high similarity for every poor-quality CCTV frame. A genuinely low-resolution, heavily occluded, side-profile or very distant face may still need officer verification.
