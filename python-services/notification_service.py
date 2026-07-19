import os
import smtplib
from email.mime.text import MIMEText
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'gdbank'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
}


def get_db():
    return psycopg2.connect(**DB_CONFIG)


@app.route('/api/notifications/send', methods=['POST'])
def send_notification():
    data = request.json
    user_id = data.get('user_id')
    notif_type = data.get('type', 'system')
    title = data.get('title', '')
    message = data.get('message', '')

    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (%s, %s, %s, %s)',
            (user_id, notif_type, title, message)
        )

        cur.execute('SELECT email, full_name FROM users WHERE id = %s', (user_id,))
        user = cur.fetchone()

        if user:
            email_addr, full_name = user
            _send_email(email_addr, title, message)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'status': 'sent'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _send_email(to_email, subject, body):
    smtp_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('EMAIL_PORT', '587'))
    smtp_user = os.getenv('EMAIL_USER', '')
    smtp_pass = os.getenv('EMAIL_PASS', '')

    if not smtp_user:
        print(f'[EMAIL SKIPPED] To: {to_email}, Subject: {subject}')
        return

    msg = MIMEText(body)
    msg['Subject'] = f'GD Bank - {subject}'
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        print(f'Email send failed: {e}')


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'notification'})


if __name__ == '__main__':
    app.run(port=5001, debug=True)
