import sqlite3
import datetime

DB_NAME = "audit_log.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id TEXT,
            analyst_name TEXT,
            decision TEXT,
            reason TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_decision(alert_id: str, analyst_name: str, decision: str, reason: str):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    timestamp = datetime.datetime.utcnow().isoformat()
    cursor.execute('''
        INSERT INTO audit_logs (alert_id, analyst_name, decision, reason, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (alert_id, analyst_name, decision, reason, timestamp))
    conn.commit()
    conn.close()

def get_all_logs():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

init_db()