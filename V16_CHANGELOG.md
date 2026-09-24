# FIND-ME AI — V16 CHANGELOG

## AI processing speed
- Removed the second FaceNet crop inference from every detected face.
- Primary FaceNet512 embedding is now used as the first shortlist.
- Crop-based refinement runs only for promising face candidates.
- Expensive age estimation is cached per candidate instead of being repeated
  for every matching frame.
- Age remains a supporting clue and is not used as an identity confirmation.
- Existing FaceNet512 similarity, multi-clue weights, evidence selection and
  human-in-the-loop verification remain intact.
- Sampling remains around 2 frames/second with sequential video decoding.

## Animation fix
- Fixed the V15 CSS/JavaScript class-name mismatch:
  JavaScript uses `fm-v15-page-motion` / `fm-v15-card-motion`, and CSS now
  uses the exact same class names.
- Page and card animations therefore trigger when Find-Me replaces page DOM.
- Emergency Alert Center animation is included.
- Existing AI processing/result animations are retained.

## Safety / scoring
- No face similarity values are fabricated or increased.
- No verification threshold is removed.
- Possible matches remain candidates requiring authorized review.
