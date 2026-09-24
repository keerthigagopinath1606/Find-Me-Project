# AI Speed + Notification Fix

- Removed per-frame RetinaFace replacement from the hot path. Haar remains the fast proposal detector.
- Kept targeted RetinaFace-aligned FaceNet refinement only for the strongest candidate on a sampled frame.
- Removed per-candidate ArcFace work from the video hot path because it substantially increased CPU processing time without improving the tested result.
- Adaptive sampling now targets roughly 20-24 recognition frames for short/medium clips, with wider intervals for long clips.
- Added `face_observations` and `unique_face_tracks` to video results so repeated detections are not presented as separate people.
- Citizen dashboard notification count now displays unread backend notifications.
- Admin case-status updates now create backend citizen notifications in the same transaction, with a separate explicit `Complaint verified` notification when status becomes Verified.
- The PATCH response reports whether a citizen notification was created and its ID.
- No identity threshold was lowered and no similarity score was artificially boosted.
