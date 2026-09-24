# Find-Me V13 — AI Matching + Motion Upgrade

## Main changes
- Added a visible six-stage AI investigation animation on the AI Identification page.
- Added animated processing orb, progress scanner, stage transitions and completion reveal.
- Added result-card entrance animations, count-up statistics, score-meter animation, row reveals and evidence image reveals.
- Added responsive and prefers-reduced-motion support.
- Increased adaptive video sampling from about 2 FPS to about 3 FPS while retaining face-quality filtering.
- Added explicit repeated-observation counts to candidate results.
- Candidate grouping now reports repeated observations consistently from supporting detections.
- Age compatibility is capped at 75 and described as supporting-only because CCTV age estimation is uncertain.
- Kept the human-in-the-loop gate and did not manufacture higher face similarity values.
- Preserved persistent candidate evidence and SHA-256 integrity workflow from V12.

## Important
Face similarity is still a measured AI output. V13 does not hard-code or artificially raise it. Better similarity depends on the registration photo, CCTV quality, pose, lighting and the embedding model.
