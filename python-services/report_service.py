import os
import csv
import io
from datetime import datetime
from flask import Flask, request, jsonify, send_file
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


@app.route('/api/reports/generate', methods=['GET'])
def generate_report():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    tx_type = request.args.get('type')

    try:
        conn = get_db()
        cur = conn.cursor()

        query = """
            SELECT t.id, t.transaction_type, t.amount, t.status, t.description,
                   t.gateway_reference, t.created_at,
                   u.full_name as customer_name, sa.account_number as source_number
            FROM transactions t
            JOIN accounts sa ON t.source_account_id = sa.id
            JOIN users u ON sa.user_id = u.id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND t.created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND t.created_at <= %s"
            params.append(end_date)
        if tx_type:
            query += " AND t.transaction_type = %s"
            params.append(tx_type)

        query += " ORDER BY t.created_at DESC"

        cur.execute(query, params)
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        transactions = [dict(zip(columns, row)) for row in rows]

        summary = {
            'total_transactions': len(transactions),
            'total_amount': sum(float(t['amount']) for t in transactions),
            'by_type': {},
        }

        for t in transactions:
            ttype = t['transaction_type']
            if ttype not in summary['by_type']:
                summary['by_type'][ttype] = {'count': 0, 'total': 0}
            summary['by_type'][ttype]['count'] += 1
            summary['by_type'][ttype]['total'] += float(t['amount'])

        cur.close()
        conn.close()

        return jsonify({'transactions': transactions, 'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/export/csv', methods=['GET'])
def export_csv():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    tx_type = request.args.get('type')

    try:
        conn = get_db()
        cur = conn.cursor()

        query = """
            SELECT t.transaction_type, t.amount, t.status, t.gateway_reference, t.created_at,
                   u.full_name as customer_name
            FROM transactions t
            JOIN accounts sa ON t.source_account_id = sa.id
            JOIN users u ON sa.user_id = u.id
            WHERE 1=1
        """
        params = []

        if start_date:
            query += " AND t.created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND t.created_at <= %s"
            params.append(end_date)
        if tx_type:
            query += " AND t.transaction_type = %s"
            params.append(tx_type)

        query += " ORDER BY t.created_at DESC"
        cur.execute(query, params)
        rows = cur.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Date', 'Customer', 'Type', 'Amount', 'Status', 'Reference'])
        for row in rows:
            writer.writerow(row)

        cur.close()
        conn.close()

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'report_{datetime.now().strftime("%Y%m%d")}.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'report'})


if __name__ == '__main__':
    app.run(port=5002, debug=True)
