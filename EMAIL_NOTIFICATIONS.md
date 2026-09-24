# Find-Me V18 — Real Email Notifications

## How the Email preference works

When a citizen submits a missing-person report:

- **Phone** → notifications remain in the Find-Me app.
- **Email** → notifications are sent to the registered email address when SMTP is configured.
- **Either** → the app notification remains available and email delivery is also attempted when SMTP is configured.

Administrator operational notifications can also be emailed when SMTP is configured.

## Gmail setup

1. Turn on 2-Step Verification for the Gmail account used as the sender.
2. Create a Google App Password.
3. In the Find-Me project folder, create a file named `.env`.
4. Copy the following and replace the values:

```text
FINDME_SMTP_HOST=smtp.gmail.com
FINDME_SMTP_PORT=587
FINDME_SMTP_USERNAME=yourgmail@gmail.com
FINDME_SMTP_PASSWORD=your_16_character_app_password
FINDME_SMTP_FROM=yourgmail@gmail.com
FINDME_SMTP_USE_TLS=true
```

5. Start Find-Me normally with `python run.py`.

V18 loads `.env` automatically. The normal Gmail password must NOT be used.

If SMTP is not configured, Find-Me does not pretend that an external email was sent; the in-app notification still works.
