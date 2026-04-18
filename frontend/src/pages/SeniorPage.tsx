import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./SeniorPage.css";
import Logo from "../components/Logo";

interface Session {
  room_url: string;
  room_name: string;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
}

export default function SeniorPage({ session, onLogout }: { session: Session; onLogout?: () => void }) {
  const callRef  = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [helperOn,    setHelperOn]    = useState(false);
  const [sharing,     setSharing]     = useState(false);
  const [pointer,     setPointer]     = useState<{ x: number; y: number } | null>(null);
  const [pulse,       setPulse]       = useState(false);
  const [helperEmail, setHelperEmail] = useState("");
  const [helperName,  setHelperName]  = useState("");
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [sparks,      setSparks]      = useState<Spark[]>([]);
  const sparkId = useRef(0);

  const helperUrl = `${window.location.origin}/helper?room=${encodeURIComponent(session.room_url)}`;

  useEffect(() => {
    startSession();
    return () => {
      callRef.current?.leave();
      callRef.current?.destroy();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function startSession() {
    try {
      const call = DailyIframe.createCallObject({ audioSource: true, videoSource: false });
      callRef.current = call;
      call.on("participant-joined", (e) => { if (e && !e.participant.local) setHelperOn(true); });
      call.on("participant-left",   (e) => { if (e && !e.participant.local) setHelperOn(false); });
      call.on("app-message", (e) => {
        if (e?.data?.type === "pointer") {
          setPointer({ x: e.data.x, y: e.data.y });
          setPulse(true);
          setTimeout(() => setPulse(false), 300);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setPointer(null), 2000);
        }
      });
      await call.join({ url: session.room_url });
      await call.startScreenShare();
      setSharing(true);
    } catch {
      setError("Could not start session. Please refresh and try again.");
    }
  }

  function triggerSparks(btnEl: HTMLButtonElement) {
    const rect = btnEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const newSparks: Spark[] = Array.from({ length: 6 }, (_, i) => ({
      id:    ++sparkId.current,
      x:     cx,
      y:     cy,
      angle: (360 / 6) * i,
      dist:  36 + Math.random() * 24,
    }));
    setSparks(s => [...s, ...newSparks]);
    setTimeout(() => setSparks(s => s.filter(sp => !newSparks.find(n => n.id === sp.id))), 600);
  }

  async function sendInvite(e: React.MouseEvent<HTMLButtonElement>) {
    if (!helperEmail) return;
    triggerSparks(e.currentTarget);
    setSending(true);
    setSent(false);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helper_email: helperEmail,
          helper_name:  helperName || helperEmail,
          room_url:     helperUrl,
          senior_name:  "Someone",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      setError("Could not send invite. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const statusKey  = helperOn ? "connected" : sharing ? "waiting" : "starting";
  const statusText = helperOn
    ? "✓  Guide connected"
    : sharing
    ? "Waiting for guide"
    : "Starting...";

  return (
    <div className="senior-page">
      {/* Nav */}
      <nav className="senior-nav">
        <Logo variant="light" size="md" />
        <div className="senior-nav-right">
          <div className={`senior-status ${statusKey}`}>
            <span className="senior-status-dot" />
            {statusText}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="senior-content">
        {error && <div className="senior-error">{error}</div>}

        {/* Editorial headline */}
        <div className="senior-hero">
          <p className="senior-hero-eyebrow">Active Session</p>
          <h1 className="senior-hero-title">Guided by <em>Comet.</em></h1>
          <p className="senior-hero-sub">
            Connect with someone you trust. Enter their details below to send a secure session invite.
          </p>
        </div>

        {/* Two-column grid */}
        <div className="senior-grid">
          {/* Left — invite form */}
          <div className="senior-card">
            <p className="senior-card-label">Who do you need help from?</p>

            <div className="senior-field">
              <label className="senior-field-label">Name</label>
              <input
                className="senior-input"
                type="text"
                placeholder="Their name (optional)"
                value={helperName}
                onChange={e => setHelperName(e.target.value)}
              />
            </div>

            <div className="senior-field">
              <label className="senior-field-label">Email</label>
              <input
                className="senior-input"
                type="email"
                placeholder="their@email.com"
                value={helperEmail}
                onChange={e => setHelperEmail(e.target.value)}
              />
            </div>

            <button
              className={`senior-btn-primary${sent ? " sent" : ""}`}
              onClick={sendInvite}
              disabled={!helperEmail || sending || sent}
            >
              {sent
                ? <><span>✓</span> Invitation sent!</>
                : sending
                ? "Sending..."
                : <><span>Send Invite</span> <span style={{ opacity: 0.7 }}>→</span></>
              }
            </button>

            <div style={{ marginTop: "20px" }}>
              <button className="senior-btn-end" onClick={onLogout}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>

          {/* Right — session panel */}
          <div className="senior-panel">
            <div className="senior-card">
              <p className="senior-panel-title">Scan for mobile access</p>
              <div className="senior-qr-inner">
                <div className="senior-qr-wrap">
                  <QRCodeSVG value={helperUrl} size={188} bgColor="#ffffff" fgColor="#0B0F2A" level="M" />
                </div>
                <p className="senior-qr-hint">
                  Ask your guide to scan this with their phone to join instantly.
                </p>
                <button
                  className="senior-btn-ghost"
                  onClick={() => navigator.clipboard?.writeText(helperUrl)}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M3 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Comet pointer overlay */}
      {pointer && (
        <div className="senior-overlay">
          <div
            className="senior-comet-pointer"
            style={{
              left:      `${pointer.x * 100}%`,
              top:       `${pointer.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${pulse ? 1.22 : 1})`,
            }}
          >
            <svg
              width="220"
              height="220"
              viewBox="-55 -55 110 110"
              fill="none"
              shapeRendering="geometricPrecision"
              style={{ width: 110, height: 110, overflow: "visible", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.7)) drop-shadow(0 0 28px rgba(29,78,216,0.9))" }}
            >
              {/* Outer boundary ring */}
              <circle r="48" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
              {/* Pulsing halo ring */}
              <circle r="36" fill="rgba(29,78,216,0.12)" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
              {/* Inner glow */}
              <circle r="24" fill="rgba(29,78,216,0.22)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
              {/* 3 parallel comet tails — lower-left, matching logo style */}
              <line x1="-10"  y1="10"  x2="-42" y2="42"  stroke="white" strokeWidth="4.5" strokeLinecap="round" opacity="0.85"/>
              <line x1="-13"  y1="7"   x2="-45" y2="36"  stroke="white" strokeWidth="3"   strokeLinecap="round" opacity="0.5"/>
              <line x1="-7"   y1="13"  x2="-38" y2="47"  stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.3"/>
              {/* 4-pointed north star */}
              <path d="M0,-22 L5,-5 L22,0 L5,5 L0,22 L-5,5 L-22,0 L-5,-5 Z" fill="white"/>
              {/* Blue center accent */}
              <circle r="6" fill="rgba(29,78,216,0.65)"/>
            </svg>
          </div>
        </div>
      )}

      {/* Starburst sparks */}
      {sparks.map(sp => (
        <div
          key={sp.id}
          className="senior-spark"
          style={{
            left: sp.x,
            top:  sp.y,
          }}
        >
          <div
            className="senior-spark-dot"
            style={{
              transform: `translate(-50%, -50%) rotate(${sp.angle}deg) translateY(-${sp.dist}px)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
