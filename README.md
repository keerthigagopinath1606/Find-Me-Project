# Find-Me — AI-Powered Missing Person Detection & Emergency Alert System

Final expo build for local Windows demonstration.

## Run on Windows

1. Extract this ZIP into `D:\Find-Me-AI-FINAL-EXPO-FINAL`.
2. Open PowerShell in that exact folder.
3. Confirm `requirements.txt` and `run.py` are directly visible in `dir`.
4. Activate the existing environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

If `.venv` does not exist:

```powershell
python -m virtualenv .venv
.\.venv\Scripts\Activate.ps1
```

5. Install dependencies:

```powershell
pip install -r requirements.txt
```

6. Start the application:

```powershell
python run.py
```

7. Open `http://127.0.0.1:5000`.

## Admin demo account

- Username: `admin`
- Password: `FindMeAdmin@2026`

## Important

Keep the PowerShell window running while the application is in use. Press `Ctrl+C` to stop the server.
