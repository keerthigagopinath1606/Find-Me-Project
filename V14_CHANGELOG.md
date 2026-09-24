# Find-Me V14 Changelog

## Performance
- Reduced CCTV sampling from ~3 frames/second to a smart ~2 frames/second baseline.
- Replaced random `VideoCapture.set()` seeking with sequential decoding and frame skipping.
- Changed CCTV detector preference to OpenCV first with RetinaFace fallback for faster normal processing.
- Optimized candidate scoring: facial similarity is evaluated against all verified references first; expensive contextual clues are calculated only for the strongest face candidate in each frame.
- DeepFace age analysis is now invoked only for reasonably promising face candidates (face similarity >= 55%).
- Added backend `processing_seconds` measurement to every completed video analysis response.

## UX / Animation
- Added restrained application-wide page-entry transitions for major Find-Me pages.
- Added staggered dashboard KPI and command-card entrance motion.
- Preserved the existing V13 AI processing animation and evidence/result animations.
- Motion remains project-relevant: navigation, investigation state, evidence, status and AI workflow.
- Added reduced-motion support.

## AI behavior retained
- Face similarity is never artificially increased.
- Multi-clue scoring remains Face 40% + Clothing 20% + Age 15% + Location 15% + Time 10%.
- Age remains a supporting clue capped at 75%.
- Candidate grouping, repeated observations, evidence persistence, SHA-256 integrity, emergency alert gates and human-in-the-loop review remain enabled.
