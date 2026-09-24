"""Stable local/LAN entry point for FIND-ME AI."""
from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    print("FIND-ME AI is running")
    print("PC:   http://127.0.0.1:5000")
    print("LAN:  http://<YOUR-PC-IP>:5000")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
