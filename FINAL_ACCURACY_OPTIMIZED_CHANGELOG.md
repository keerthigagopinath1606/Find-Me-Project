# Find-Me Final Stable — Accuracy Optimized

## Purpose
Improve genuine same-person CCTV matching without fabricating or artificially inflating similarity scores.

## Changes
- Added an aligned FaceNet512 refinement pass for the top two preliminary candidates even when the CCTV frame contains a single face.
- Kept the identity/evidence gates unchanged: a higher displayed score is only produced when the embedding evidence genuinely supports it.
- Kept the multi-clue formula unchanged: Face 40% + Clothing 20% + Age 15% + Location 15% + Time 10%.
- Kept weak/unrelated candidates out of Possible Match results.
- Renamed the UI concept from Candidates Analyzed to Candidates Screened for clarity, while retaining API compatibility.
- No red face boxes, circles, or artificial match labels were added.
