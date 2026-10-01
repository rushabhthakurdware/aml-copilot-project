import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Search, RefreshCw, ChevronRight, UserCheck } from 'lucide-react';

const API_BASE = "http://localhost:8000/api";

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [analystName, setAnalystName] = useState("Analyst_Rushabh");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [scoringResult, setScoringResult] = useState(null);

  // Fetch alerts on load
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/alerts?limit=100`);
      setAlerts(res.data.alerts);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Handle Analyst Decision
  const handleDecision = async (decisionType) => {
    if (!selectedAlert) return;
    try {
      await axios.post(`${API_BASE}/alerts/${selectedAlert.nameOrig}/decision`, {
        analyst_name: analystName,
        decision: decisionType,
        reason: reason || `Automated review: marked as ${decisionType}`
      });
      alert(`Successfully marked alert as ${decisionType}! Recorded in Audit Trail.`);
      setSelectedAlert(null);
      setReason("");
      fetchAlerts();
    } catch (err) {
      console.error("Error submitting decision:", err);
      alert("Failed to submit decision to audit log.");
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'HIGH') return alert.risk_score >= 75;
    if (filter === 'MEDIUM') return alert.risk_score >= 40 && alert.risk_score < 75;
    if (filter === 'LOW') return alert.risk_score < 40;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AML Copilot & Alert Triage</h1>
            <p className="text-xs text-slate-400">Intelligent Transaction Monitoring System</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <input 
              type="text" 
              value={analystName} 
              onChange={(e) => setAnalystName(e.target.value)} 
              className="bg-transparent outline-none text-slate-200 w-32"
              placeholder="Analyst Name"
            />
          </div>
          <button 
            onClick={fetchAlerts} 
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Prioritized Queue */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center space-x-2">
              <span>Prioritized Alert Queue</span>
              <span className="text-xs bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700">
                {filteredAlerts.length} Active
              </span>
            </h2>
            <div className="flex space-x-2">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                    filter === lvl ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-64 text-slate-400">Loading prioritized alerts...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex justify-center items-center h-64 text-slate-400">No alerts found matching filter.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-xs border-b border-slate-800 uppercase tracking-wider">
                    <th className="p-3">Risk Score</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Source Account</th>
                    <th className="p-3">Amount ($)</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {filteredAlerts.map((alert, idx) => {
                    const risk = alert.risk_score;
                    const badgeColor = risk >= 75 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                       risk >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 
                                       'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedAlert(alert)}
                        className="hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${badgeColor}`}>
                            {risk.toFixed(1)} / 100
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">{alert.type || 'TRANSFER'}</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{alert.nameOrig}</td>
                        <td className="p-3 font-semibold text-slate-200">${Number(alert.amount).toLocaleString()}</td>
                        <td className="p-3">
                          <button className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-xs">
                            <span>Review</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Col: Alert Detail & Triage Action Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          {selectedAlert ? (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">Alert Triage Review</h3>
                  <p className="text-xs text-slate-400">Step {selectedAlert.step} • Account: {selectedAlert.nameOrig}</p>
                </div>
                <span className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold">
                  Score: {selectedAlert.risk_score}
                </span>
              </div>

              {/* Transaction details card */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Amount:</span>
                  <span className="font-semibold text-slate-200">${Number(selectedAlert.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin Old Balance:</span>
                  <span className="font-semibold text-slate-200">${Number(selectedAlert.oldbalanceOrg).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination Account:</span>
                  <span className="font-mono text-slate-300">{selectedAlert.nameDest}</span>
                </div>
              </div>

              {/* Explainability Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Explainability & Risk Drivers</h4>
                <div className="bg-blue-950/30 border border-blue-900/50 p-3 rounded-lg text-xs space-y-1.5 text-blue-200">
                  <p>• Transaction volume significantly deviates from historical baseline velocity.</p>
                  <p>• Sudden balance drainage detected on origin account.</p>
                  <p>• Multi-hop routing signature matches known structuring patterns.</p>
                </div>
              </div>

              {/* Analyst Justification Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Analyst Decision Justification / Notes:</label>
                <textarea 
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for audit trail justification..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-blue-600 resize-none"
                ></textarea>
              </div>

              {/* Action Decision Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button 
                  onClick={() => handleDecision("Escalate")}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg text-xs transition text-center shadow-lg shadow-rose-900/20"
                >
                  Escalate
                </button>
                <button 
                  onClick={() => handleDecision("Clear")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs transition text-center shadow-lg shadow-emerald-900/20"
                >
                  Clear
                </button>
                <button 
                  onClick={() => handleDecision("Need more info")}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 rounded-lg text-xs transition text-center shadow-lg shadow-amber-900/20"
                >
                  More Info
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-20 space-y-3">
              <FileText className="w-12 h-12 stroke-1" />
              <p className="text-sm">Select any transaction alert from the queue to open the triage review panel.</p>
            </div>
          )}

          <div className="border-t border-slate-800 pt-3 mt-4 text-center">
            <p className="text-[10px] text-slate-500">AML Copilot System v1.0 • Audit Trail Logging Active</p>
          </div>
        </div>

      </main>
    </div>
  );
}