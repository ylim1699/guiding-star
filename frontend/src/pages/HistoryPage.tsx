import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import Logo from "../components/Logo";
import "./HistoryPage.css";

interface SessionRecord {
  id: string;
  startTime: { seconds: number } | null;
  endTime:   { seconds: number } | null;
  helperName:  string;
  helperEmail: string;
  messages:    string[];
  pointerCount: number;
  summary: string | null;
  steps:   string[];
  status:  string;
}

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime(ts: { seconds: number } | null) {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

function durationLabel(start: { seconds: number } | null, end: { seconds: number } | null) {
  if (!start || !end) return null;
  const mins = Math.round((end.seconds - start.seconds) / 60);
  if (mins < 1) return "< 1 min";
  return `${mins} min${mins !== 1 ? "s" : ""}`;
}

export default function HistoryPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [sessions,  setSessions]  = useState<SessionRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [userId]);

  async function loadSessions() {
    setLoading(true);
    try {
      const q = query(collection(db, "sessions"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionRecord));
      docs.sort((a, b) => (b.startTime?.seconds ?? 0) - (a.startTime?.seconds ?? 0));
      setSessions(docs);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "sessions", id));
      setSessions(s => s.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="history-page">
      <nav className="history-nav">
        <Logo variant="light" size="md" />
        <button className="history-back-btn" onClick={() => navigate("/senior")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Session
        </button>
      </nav>

      <main className="history-content">
        <div className="history-hero">
          <p className="history-eyebrow">Your Account</p>
          <h1 className="history-title">Session <em>History</em></h1>
          <p className="history-sub">Review past sessions and the steps your guide walked you through.</p>
        </div>

        {loading ? (
          <div className="history-loading">
            <div className="history-spinner" />
            <span>Loading your sessions…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="rgba(29,78,216,0.2)" strokeWidth="2"/>
                <path d="M20 13v8M20 25h.01" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="history-empty-title">No sessions yet</p>
            <p className="history-empty-sub">Your completed sessions will appear here with a summary and step-by-step guide.</p>
            <button className="history-start-btn" onClick={() => navigate("/senior")}>
              Start a Session →
            </button>
          </div>
        ) : (
          <div className="history-list">
            {sessions.map(s => {
              const isExpanded = expanded === s.id;
              const isConfirm  = confirmId === s.id;
              const dur = durationLabel(s.startTime, s.endTime);

              return (
                <div key={s.id} className={`history-card${isExpanded ? " expanded" : ""}`}>
                  {/* Card header */}
                  <div className="history-card-header">
                    <div className="history-card-meta">
                      <span className="history-card-date">{formatDate(s.startTime)}</span>
                      <span className="history-card-time">{formatTime(s.startTime)}{dur ? ` · ${dur}` : ""}</span>
                    </div>
                    <div className="history-card-actions">
                      {isConfirm ? (
                        <div className="history-confirm-row">
                          <span className="history-confirm-label">Delete this session?</span>
                          <button
                            className="history-confirm-yes"
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting === s.id}
                          >
                            {deleting === s.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button className="history-confirm-no" onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="history-delete-btn"
                          onClick={() => setConfirmId(s.id)}
                          title="Delete session"
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <path d="M3 4h9M5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6 7v4M9 7v4M4 4l.5 8a1 1 0 001 1h4a1 1 0 001-1L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Helper row */}
                  {s.helperName && (
                    <p className="history-card-helper">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      Guided by <strong>{s.helperName}</strong>
                    </p>
                  )}

                  {/* Summary */}
                  {s.summary ? (
                    <p className="history-card-summary">{s.summary}</p>
                  ) : (
                    <p className="history-card-summary muted">Session completed — no summary available.</p>
                  )}

                  {/* Steps toggle */}
                  {s.steps && s.steps.length > 0 && (
                    <>
                      <button
                        className="history-steps-toggle"
                        onClick={() => setExpanded(isExpanded ? null : s.id)}
                      >
                        <svg
                          width="16" height="16" viewBox="0 0 16 16" fill="none"
                          style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                        >
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {isExpanded ? "Hide steps" : `How to do it yourself (${s.steps.length} steps)`}
                      </button>

                      {isExpanded && (
                        <div className="history-steps">
                          <p className="history-steps-heading">Step-by-step guide</p>
                          <ol className="history-steps-list">
                            {s.steps.map((step, i) => (
                              <li key={i} className="history-step-item">
                                <span className="history-step-num">{i + 1}</span>
                                <span className="history-step-text">{step}</span>
                              </li>
                            ))}
                          </ol>
                          {s.messages.length > 0 && (
                            <details className="history-messages">
                              <summary className="history-messages-toggle">Show guide's messages ({s.messages.length})</summary>
                              <ul className="history-messages-list">
                                {s.messages.map((m, i) => (
                                  <li key={i} className="history-message-item">"{m}"</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
