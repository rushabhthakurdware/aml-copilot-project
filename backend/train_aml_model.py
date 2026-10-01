import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, recall_score
from sklearn.model_selection import train_test_split
import joblib

def load_or_generate_data():
    """Loads PaySim CSV if available, otherwise generates a clean synthetic equivalent."""
    filename = "PS_20174392719_1491204439457_log.csv"
    if os.path.exists(filename):
        print(f"[INFO] Found local PaySim file: {filename}. Loading sample...")
        df = pd.read_csv(filename, nrows=100000)
    else:
        print("[INFO] PaySim CSV not found locally in backend folder. Generating synthetic transaction dataset for hackathon...")
        np.random.seed(42)
        n_samples = 50000
        
        types = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEPOSIT', 'CASH_IN']
        data = {
            'step': np.random.randint(1, 744, size=n_samples),
            'type': np.random.choice(types, size=n_samples, p=[0.3, 0.2, 0.2, 0.15, 0.15]),
            'amount': np.random.exponential(scale=5000, size=n_samples),
            'nameOrig': [f"C{np.random.randint(1000000, 9999999)}" for _ in range(n_samples)],
            'oldbalanceOrg': np.random.exponential(scale=10000, size=n_samples),
            'nameDest': [f"M{np.random.randint(1000000, 9999999)}" for _ in range(n_samples)],
            'oldbalanceDest': np.random.uniform(0, 50000, size=n_samples),
            'isFraud': np.random.choice([0, 1], size=n_samples, p=[0.985, 0.015])
        }
        df = pd.DataFrame(data)
        # Introduce synthetic correlation for realism
        fraud_mask = df['isFraud'] == 1
        df.loc[fraud_mask, 'amount'] = df.loc[fraud_mask, 'amount'] * np.random.uniform(5, 20, size=fraud_mask.sum())
        df['newbalanceOrig'] = df['oldbalanceOrg'] - df['amount']
        df['newbalanceDest'] = df['oldbalanceDest'] + df['amount']
        
    return df

def preprocess_data(df):
    print("[INFO] Preprocessing features...")
    df = df.fillna(0)
    
    # Feature engineering: Balance discrepancies & transaction magnitude ratio
    df['errorBalanceOrig'] = df['newbalanceOrig'] + df['amount'] - df['oldbalanceOrg']
    df['errorBalanceDest'] = df['oldbalanceDest'] + df['amount'] - df['newbalanceDest']
    df['amount_to_balance_ratio'] = df['amount'] / (df['oldbalanceOrg'] + 1.0)
    
    # One-hot encode transaction types
    df = pd.get_dummies(df, columns=['type'], drop_first=True)
    
    # Select feature columns
    feature_cols = [
        'step', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 
        'oldbalanceDest', 'newbalanceDest', 'errorBalanceOrig', 
        'errorBalanceDest', 'amount_to_balance_ratio'
    ]
    for col in df.columns:
        if col.startswith('type_'):
            feature_cols.append(col)
            
    X = df[feature_cols]
    y = df['isFraud']
    return X, y, df

def main():
    df_raw = load_or_generate_data()
    X, y, df_processed = preprocess_data(df_raw)
    
    X_train, X_test, y_train, y_test, df_train, df_test = train_test_split(
        X, y, df_processed, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"[INFO] Training model on {len(X_train)} samples, testing on {len(X_test)} samples...")
    
    model = RandomForestClassifier(
        n_estimators=100, 
        max_depth=12, 
        class_weight='balanced', 
        random_state=42, 
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    pr_auc = average_precision_score(y_test, y_pred_proba)
    recall = recall_score(y_test, (y_pred_proba >= 0.5).astype(int))
    
    print("\n--- Model Evaluation ---")
    print(f"PR-AUC Score: {pr_auc:.4f}")
    print(f"Recall Score: {recall:.4f}")
    
    df_test = df_test.copy()
    df_test['risk_score'] = (y_pred_proba * 100).round(2)
    
    alert_queue = df_test.sort_values(by='risk_score', ascending=False)
    
    os.makedirs("artifacts", exist_ok=True)
    joblib.dump(model, "artifacts/aml_model.pkl")
    joblib.dump(X.columns.tolist(), "artifacts/feature_cols.pkl")
    alert_queue.head(500).to_csv("artifacts/scored_alerts.csv", index=False)
    
    print("\n[SUCCESS] Sprint 1 Complete!")
    print("Saved model to 'artifacts/aml_model.pkl'")
    print("Saved prioritized alert queue to 'artifacts/scored_alerts.csv'")

if __name__ == "__main__":
    main()