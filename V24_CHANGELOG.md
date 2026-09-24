# Find-Me V24

## Recognition correction
- Added targeted ArcFace verification for ambiguous multi-person CCTV observations.
- FaceNet512 remains the fast screening model; ArcFace is invoked only for weak multi-face observations.
- Reference ArcFace templates are cached per verified registration photo.
- The exact face crop used for verification remains the source of the evidence marker.
- Added ArcFace score to saved evidence breakdowns for explainability.
- Below-gate evidence is labeled as an AI candidate rather than implying a confirmed possible match.
- Existing tracking, human review, speed optimizations, and multi-clue supporting evidence are preserved.
