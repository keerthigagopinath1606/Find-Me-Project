# FIND-ME V12 CHANGELOG

## V12 goals
V12 focuses on the issues found during the V11 expo test: confusing investigation terminology, empty Evidence Gallery despite analyzed observations, duplicated movement timeline entries for frames from one CCTV search, noisy age estimates, insufficiently clear AI explanations, and a visually static investigation interface.

## Investigation clarity
- Candidate observations are explicitly explained as multiple video-frame observations of one candidate, not multiple people.
- Movement Reconstruction groups observations from the same CCTV search/location/time into one CCTV sighting with nested frame observations.
- Observation History remains available for frame-level review.
- Evidence Gallery now persists the strongest analyzed candidate frame even when the candidate is below the possible-match gate.
- Evidence integrity SHA-256 verification remains available.
- AI Evaluation text explicitly distinguishes candidate score from accuracy.

## AI scoring changes
- CCTV age compatibility now uses broad supporting bands rather than heavily penalizing a noisy age estimate.
- Age is displayed as an uncertain AI clue, never as an identity fact.
- Video sampling is increased to approximately two frames per second for more opportunities to capture a usable face while remaining practical for an expo demo.
- Existing FaceNet512 reference-template matching, face-quality filtering, multi-frame candidate grouping, movement-aware location handling, clothing-as-supporting-evidence, and human-in-the-loop gate are retained.
- No score is artificially inflated and no identity is automatically confirmed.

## UI / animation
- V12 investigation workspace adds progressive reveal animations, animated score bars, timeline node motion, evidence-card hover motion, processing-state animation, and improved explanatory panels.
- Reduced-motion preference is respected.
- Existing dashboard arrangement is preserved; the V12 layer is additive.

## Important limitation
Higher face similarity cannot be guaranteed for arbitrary CCTV footage. It depends on the quality, pose, resolution, lighting, occlusion, and the registered reference image. V12 improves sampling and evidence handling but does not manufacture a match.
