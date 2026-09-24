# Find-Me Accuracy Matching Fix

## Changes
- FaceNet512 preliminary screening now scores every available query representation instead of accidentally using only the first score.
- FaceNet512 reference-template comparison now preserves the strongest real template similarity rather than artificially lowering it through weighted template averaging.
- Top-two candidates receive optional ArcFace reference/query corroboration. ArcFace is reported separately and is not used as an arbitrary score boost.
- The existing identity safety gate remains in place; thresholds were not lowered.
- Human/officer review remains required for possible matches.

## Safety
A high raw similarity is still only candidate evidence. Identity is not automatically confirmed.
