# EfficientNet-B0 transfer-learning update

- Added ImageNet-pretrained EfficientNet-B0 as a secondary visual embedding model.
- FaceNet512 remains the primary identity-specialized face score.
- EfficientNet-B0 is used only for top-candidate visual corroboration/ranking; it does not artificially raise the FaceNet identity score.
- Reference photo variants use original, horizontal flip, brightness and contrast augmentation.
- Video query is computed only for the top two FaceNet candidates to preserve the short-video speed target.
- UI exposes EfficientNet-B0 visual corroboration separately from FaceNet identity similarity.
- Identity gates remain unchanged and require strong/repeated FaceNet evidence.
