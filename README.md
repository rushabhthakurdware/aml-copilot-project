# 🛡️ AML Copilot: Intelligent Transaction Monitoring & Alert Triage

> An end-to-end FinTech copilot designed to help Anti-Money Laundering (AML) compliance analysts reduce false positives, prioritize high-risk transaction queues, and streamline regulatory audit trails.

---

## 🚨 The Problem
Traditional bank AML systems rely on rigid, rule-based thresholds that flag transactions uniformly—resulting in **over 90% false positives**. Compliance analysts spend hours reviewing harmless alerts, legitimate suspicious activity gets delayed, and every decision must be rigorously justified to auditors.

## 💡 The Solution
**AML Copilot** introduces an intelligent layer over transaction streams:
1. **Machine Learning Risk Scoring:** Scores every transaction from 0 to 100 optimized for high **Recall (95.6%)** and **PR-AUC (0.98)**.
2. **Explainability Engine:** Instantly highlights top risk drivers (e.g., balance drainage, velocity anomalies).
3. **Prioritized Analyst Dashboard:** Surfaces high-risk alerts first in a sleek React interface.
4. **Immutable Audit Trail:** Automatically logs analyst decisions (*Escalate*, *Clear*, *Need more info*) with timestamps and user justifications.
5. **Real-Time Scoring API:** Exposes endpoints to score incoming live transactions instantly.

---

## 🛠️ Technology Stack
* **Backend & ML Core:** Python, FastAPI, Scikit-Learn (Random Forest), Pandas, NumPy, SQLite
* **Frontend Dashboard:** React.js, Vite, Tailwind CSS, Lucide Icons, Axios
* **Dataset:** PaySim (Mobile Money Simulator / Synthetic Banking Transactions)

---

## 📂 Project Architecture

```text
aml-copilot-project/
├── backend/
│   ├── artifacts/             # Trained ML model & prioritized alerts queue
│   ├── database.py            # SQLite audit log tracking
│   ├── main.py                # FastAPI server & scoring routes
│   ├── train_aml_model.py     # ML training script (optimized for Recall)
│   └── audit_log.db           # Recorded analyst decisions
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main React Dashboard & Triage UI
    │   └── main.jsx
    └── index.html             # Tailwind CSS CDN integration