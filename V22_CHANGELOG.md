# V22 Change Log

## Multi-person CCTV identity-first evidence fix

- When a CCTV frame contains multiple people, FaceNet512 facial similarity is now the primary signal for selecting the evidence face.
- Global best evidence is no longer promoted merely because its combined clothing/age/location/time score is higher.
- Supporting clues are used only to break a facial-similarity tie.
- Candidate-specific best evidence uses the same identity-first rule.
- The exact face coordinates used for FaceNet matching remain the coordinates used for the red evidence marker.
- Added API metadata explaining the evidence selection rule.
- Preserved V21 speed optimizations and RetinaFace refinement for multi-person frames.
