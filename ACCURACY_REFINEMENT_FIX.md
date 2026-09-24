# Accuracy Refinement Fix

The AI video matcher now uses Haar only as a fast face proposal stage. For sampled frames where Haar detects a face, the pipeline runs the stronger RetinaFace detector on that same frame and uses its aligned FaceNet512 embedding when available.

Why this matters:
- A loose Haar crop can lower an otherwise genuine FaceNet similarity for the missing person.
- The previous build could repeatedly score the same genuine person around 70% even when the face was visible.
- The new path improves the face crop/alignment before identity comparison instead of lowering thresholds or artificially boosting similarity.

Safety remains unchanged: supporting clues do not select identity, and the possible-match gate still requires strong face evidence and repeated evidence for the lower branch.
