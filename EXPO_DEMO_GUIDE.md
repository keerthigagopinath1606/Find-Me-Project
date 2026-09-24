# FIND-ME V6 Expo Demo Guide

## 1. Start

```powershell
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python run.py
```

Open `http://127.0.0.1:5000` on the PC.

## 2. Citizen flow

1. Register a citizen account.
2. Login.
3. Submit a missing-person complaint with complaint-giver information, ID-proof reference, missing-person details, photo and last-seen details.
4. Note the generated Complaint ID and Missing-Person ID.

## 3. Officer flow

1. Login with the demo administrator account.
2. Open the case.
3. Verify the case so its FaceNet512 reference can be used by the investigation engine.
4. Open Investigation Center → AI Identification.

## 4. Multi-clue investigation

Upload CCTV/phone footage and enter:
- Camera/CCTV location
- Capture date
- Capture time

The system ranks candidates using:
- Face similarity — 40%
- Clothing similarity — 20%
- Age compatibility — 15%
- Location relevance — 15%
- Time relevance — 10%

The result includes an evidence frame and an explainable score breakdown.

## 5. Important wording for the expo

Say **"possible match for investigator review"**, not **"the AI confirmed the person"**. The system is designed as a decision-support and candidate-ranking prototype.

## Emergency Alert demonstration
1. Verify a missing-person case as an administrator.
2. Open Investigation Center and enter a CCTV location/date/time that may differ from the last-seen location.
3. Process a video that produces a candidate above the possible-match gate.
4. Open Emergency Alert Center from the administrator dashboard.
5. Demonstrate the alert ID, candidate score, five-clue breakdown, evidence frame and camera context.
6. Acknowledge the alert, then resolve or dismiss it.
7. Explain that a Kanchipuram -> Chennai sighting is treated as possible movement rather than an automatic mismatch, and clothing changes are supporting evidence only.
