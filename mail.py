"""
mail.py — Brevo HTTP API email wrapper.
Uses HTTP API (port 443) — Render blocks SMTP ports 587/465.
"""
import logging

import requests as http_requests

import config

log = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, to_name: str, subject: str, html_body: str):
    """
    Send a transactional email via Brevo HTTP API.
    Returns (True, None) on success, (False, error_str) on failure.
    """
    payload = {
        "sender": {
            "email": config.BREVO_SENDER_EMAIL,
            "name":  config.BREVO_SENDER_NAME,
        },
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_body,
    }
    try:
        r = http_requests.post(
            BREVO_API_URL,
            headers={
                "api-key":      config.BREVO_API_KEY,
                "content-type": "application/json",
                "accept":       "application/json",
            },
            json=payload,
            timeout=10,
        )
        if r.status_code >= 300:
            err = f"brevo_error_{r.status_code}: {r.text[:300]}"
            log.error("send_email failed: %s", err)
            return False, err
        log.info("Email sent to %s (subject: %s)", to_email, subject)
        return True, None
    except Exception as exc:
        log.error("send_email exception: %s", exc)
        return False, str(exc)


def build_invite_email_he(from_name: str, group_name: str, accept_url: str) -> tuple:
    """Returns (subject, html_body) for Hebrew invite email."""
    subject = f"{from_name} מזמין אותך לקבוצת ניחושים — {group_name}"
    html_body = f"""<!doctype html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="background:#FFF6E5;font-family:'Heebo',Arial,sans-serif;color:#2A1810;margin:0;padding:0;">
  <div style="max-width:520px;margin:24px auto;background:#FFFFFF;border-radius:14px;padding:24px;">
    <div style="text-align:center;font-size:28px;font-weight:800;color:#E8542C;margin-bottom:8px;">
      מונדיאל 2026
    </div>
    <p>שלום,</p>
    <p>
      <bdi>{from_name}</bdi> מזמין אותך להצטרף לקבוצת ניחושים בשם
      <strong><bdi>{group_name}</bdi></strong>.
    </p>
    <p>נחשו את תוצאות המונדיאל יחד, צברו נקודות, וזכו בכבוד הגדול.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{accept_url}" style="display:inline-block;background:#E8542C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;">
        הצטרפות לקבוצה
      </a>
    </p>
    <p style="font-size:13px;color:#6B4A3A;">
      או הדבק את הקישור הבא בדפדפן:<br>
      <span style="word-break:break-all;" dir="ltr"><bdi>{accept_url}</bdi></span>
    </p>
    <p style="font-size:12px;color:#6B4A3A;margin-top:24px;">
      ההזמנה תפוג בעוד 14 ימים. אם הודעה זו הגיעה אליך בטעות, ניתן להתעלם ממנה.
    </p>
  </div>
</body>
</html>"""
    return subject, html_body


def build_invite_email_en(from_name: str, group_name: str, accept_url: str) -> tuple:
    """Returns (subject, html_body) for English invite email."""
    subject = f"{from_name} invited you to predict the World Cup — {group_name}"
    html_body = f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="background:#FFF6E5;font-family:'Inter',Arial,sans-serif;color:#2A1810;margin:0;padding:0;">
  <div style="max-width:520px;margin:24px auto;background:#FFFFFF;border-radius:14px;padding:24px;">
    <div style="text-align:center;font-size:28px;font-weight:800;color:#E8542C;margin-bottom:8px;">
      Mondial 2026
    </div>
    <p>Hi,</p>
    <p>
      <strong>{from_name}</strong> has invited you to join a prediction group called
      <strong>{group_name}</strong>.
    </p>
    <p>Predict World Cup scores together, earn points, and chase the bragging rights.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{accept_url}" style="display:inline-block;background:#E8542C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;">
        Join the group
      </a>
    </p>
    <p style="font-size:13px;color:#6B4A3A;">
      Or paste this link in your browser:<br>
      <span style="word-break:break-all;">{accept_url}</span>
    </p>
    <p style="font-size:12px;color:#6B4A3A;margin-top:24px;">
      This invitation expires in 14 days. If you received this by mistake, you can ignore it.
    </p>
  </div>
</body>
</html>"""
    return subject, html_body
