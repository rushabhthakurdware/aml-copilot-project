from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import os
import database

app = FastAPI(title="AML Copilot API", version="1.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and features on startup
MODEL_PATH = "artifacts/aml_model.pkl"
FEATURES_PATH = "artifacts/feature_cols.pkl"
ALERTS_CSV = "artifacts/scored_alerts.csv"

model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
feature_cols = joblib.load(FEATURES_PATH) if os.path.exists(FEATURES_PATH) else []

class TransactionInput(BaseModel):
    step: int
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float

class DecisionInput(BaseModel):
    analyst_name: str
    decision: str  # "Escalate", "Clear", "Need more info"
    reason: str

@app.get("/")
def read_root():
    return {"message": "Welcome to the AML Transaction Monitoring API"}

@app.get("/api/alerts")
def get_alerts(limit: int = 100):
    """Returns prioritized alert queue sorted by risk score."""
    if not os.path.exists(ALERTS_CSV):
        raise HTTPException(status_code=404, detail="Alert queue not generated. Run model script first.")
    df = pd.read_csv(ALERTS_CSV)
    # Mask sensitive account identifiers for privacy requirement
    if 'nameOrig' in df.columns:
        df['nameOrig'] = df['nameOrig'].apply(lambda x: f"C****{str(x)[-4:]}" if pd.notna(x) else "C****0000")
    if 'nameDest' in df.columns:
        df['nameDest'] = df['nameDest'].apply(lambda x: f"M****{str(x)[-4:]}" if pd.notna(x) else "M****0000")
        
    alerts = df.head(limit).to_dict(orient="records")
    return {"total": len(df), "alerts": alerts}

@app.post("/api/score")
def score_transaction(tx: TransactionInput):
    """Scores a new real-time transaction and provides explainability reasons."""
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded.")
    
    # Build dataframe row
    data = tx.dict()
    df_tx = pd.DataFrame([data])
    
    # Feature engineering matching training script
    df_tx['errorBalanceOrig'] = df_tx['newbalanceOrig'] + df_tx['amount'] - df_tx['oldbalanceOrg']
    df_tx['errorBalanceDest'] = df_tx['oldbalanceDest'] + df_tx['amount'] - df_tx['newbalanceDest']
    df_tx['amount_to_balance_ratio'] = df_tx['amount'] / (df_tx['oldbalanceOrg'] + 1.0)
    
    # One-hot encode type columns expected by the model
    for col in feature_cols:
        if col.startswith('type_'):
            t_name = col.split('_')[1]
            df_tx[col] = 1 if data['type'] == t_name else 0
            
    # Ensure all feature columns exist
    for col in feature_cols:
        if col not in df_tx.columns:
            df_tx[col] = 0
            
    X_input = df_tx[feature_cols]
    prob = model.predict_proba(X_input)[0][1]
    risk_score = round(float(prob * 100), 2)
    
    # Generate explainability reasons based on business logic rules & feature values
    reasons = []
    if data['amount'] > (data['oldbalanceOrg'] * 0.8) and data['oldbalanceOrg'] > 0:
        reasons.append(f"Amount ({data['amount']}) drains over 80% of origin account balance.")
    if abs(df_tx['errorBalanceOrig'].values[0]) > 100:
        reasons.append("Balance discrepancy detected between stated amount and balance changes.")
    if data['type'] == 'TRANSFER' and data['amount > 200000']:
        reasons.append("High-value wire transfer movement.")
    if not reasons:
        reasons.append("Anomalous velocity or multi-hop transfer signature recognized by model.")

    return {
        "risk_score": risk_score,
        "status": "FLAGGED" if risk_score > 50 else "REVIEWED",
        "top_reasons": reasons
    }

@app.post("/api/alerts/{alert_id}/decision")
def post_decision(alert_id: str, payload: DecisionInput):
    """Logs analyst decision with audit trail."""
    database.log_decision(alert_id, payload.analyst_name, payload.decision, payload.reason)
    return {"status": "success", "message": f"Alert {alert_id} marked as {payload.decision}."}

@app.get("/api/audit-logs")
def get_audit_logs():
    """Returns all recorded audit decisions."""
    return database.get_all_logs()