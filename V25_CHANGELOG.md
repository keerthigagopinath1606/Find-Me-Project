# Find-Me V25 Changelog

## Fast CCTV screening + clean evidence

- Removed the red box/circle/POSSIBLE MATCH visual overlay from CCTV evidence snapshots.
- Evidence snapshots now preserve the original CCTV frame.
- Removed RetinaFace second-pass detection from the live video hot path.
- Removed aligned FaceNet second embeddings from the live video hot path.
- Removed ArcFace verification from the live video hot path.
- Removed expensive age estimation from the live video hot path; age remains a neutral supporting clue.
- Removed per-search generation of multiple FaceNet/ArcFace reference templates; the stored verified FaceNet512 registration embedding is used directly.
- CCTV screening samples approximately one frame every 2 seconds instead of one frame per second.
- FaceNet512 remains the identity engine for detected face crops.
- Sequential decoding is retained.
- Candidate results and officer-review workflow are retained.
- The system reports actual `processing_seconds` and `realtime_ratio`; no artificial timer is used.

### Goal
For a 1-minute CCTV clip, the fast screening path is designed to target approximately real-time or faster on a typical CPU laptop. Actual time depends on CPU, video resolution, number of faces, and number of verified cases.
