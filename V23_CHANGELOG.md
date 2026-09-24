# Find-Me V23 Changelog

## Main fix: multi-person CCTV recognition

V23 focuses on the reported false-highlight problem where a CCTV frame contains three people and the wrong face is selected.

### Recognition changes
- Added multi-frame face tracking across sampled CCTV frames.
- Added a targeted RetinaFace alignment embedding for ambiguous multi-person frames.
- Added robust multi-template FaceNet512 similarity instead of relying on one maximum template score.
- Added additional reference-photo variants (mirrored and mild exposure/contrast variants).
- Track-level face evidence is accumulated over multiple observations before promoting evidence.
- The exact face region used for recognition remains the region used for the red evidence marker.
- Clothing, age, location and time remain supporting clues and do not directly choose a different face in a multi-person frame.

### Performance
- The normal V22 fast screening path is preserved.
- The additional alignment pass is limited to ambiguous multi-person frames.
- Reference templates remain cached.

### Important limitation
Face recognition can still fail when a target face is extremely small, blurred, occluded, or visually ambiguous. V23 therefore treats the result as a candidate for authorized officer review, not automatic identification.
