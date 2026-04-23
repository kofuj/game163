import os
import sys
import json
import subprocess
from datetime import date

RESEND_API_KEY = os.environ["RESEND_API_KEY"]
TO_EMAIL = os.environ.get("SUMMARY_TO_EMAIL", "koafujimoto@gmail.com")


def send_summary(body):
    payload = json.dumps({
        "from": "Game163 <onboarding@resend.dev>",
        "to": [TO_EMAIL],
        "subject": f"Game163 Daily Predictions - {date.today()}",
        "text": body,
    })

    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "POST",
        "-H", f"Authorization: Bearer {RESEND_API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", payload,
        "https://api.resend.com/emails"
    ], capture_output=True, text=True)

    *body_lines, status_code = result.stdout.strip().split("\n")
    response_body = "\n".join(body_lines)

    if status_code != "200":
        print(f"Failed: HTTP {status_code} - {response_body}", file=sys.stderr)
        sys.exit(1)
    print("Email sent successfully.")


if __name__ == "__main__":
    body = sys.stdin.read().strip()
    if not body:
        print("No output to send.", file=sys.stderr)
        sys.exit(1)
    send_summary(body)
