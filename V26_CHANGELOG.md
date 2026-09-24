# Find-Me V26

## Fixes

### Fast but reliable CCTV face detection
- Increased CCTV sampling from V25's ~2-second interval to ~1.25 seconds.
- Kept lightweight OpenCV detection as the primary path.
- Added OpenCV profile-face fallback and mirrored profile detection when frontal Haar finds nothing.
- Lowered detector minimum face size to retain small CCTV faces.
- FaceNet512 runs only after a face is detected.
- No red box/circle/visual identity highlighting is used.
- Actual processing time remains measured; no artificial timer.

### Admin dashboard Verified & Active count
- Backend status `Verified` is normalized to the dashboard's `verified-active` state.
- Dashboard also accepts legacy/cache values `Verified`, `Active`, and `verified-active`.
- Existing backend synchronization remains the source of truth.

