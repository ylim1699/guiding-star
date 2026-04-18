import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./SeniorPage.css";
import Logo from "../components/Logo";

interface Session { room_url: string; room_name: string; }
interface Spark   { id: number; x: number; y: number; angle: number; dist: number; }

export default function SeniorPage({ session, userId, onLogout, onNewSession }: {
  session: Session;
  userId: string;
  onLogout?: () => void;
  onNewSession?: () => Promise<void>;
}) {
  const navigate        = useNavigate();
  const callRef         = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnected    = useRef(false);
  const sessionDocId    = useRef<string | null>(null);
  const sessionMessages = useRef<string[]>([]);
  const pointerCountRef = useRef(0);
  const sessionStartRef = useRef<number>(Date.now());

  const [started,       setStarted]       = useState(false);
  const [helperOn,      setHelperOn]      = useState(false);
  const [sharing,       setSharing]       = useState(false);
  const [disconnected,  setDisconnected]  = useState(false);
  const [ended,         setEnded]         = useState(false);
  const [newSessLoading,setNewSessLoading]= useState(false);
  const [muted,         setMuted]         = useState(false);
  const [pointer,       setPointer]       = useState<{ x: number; y: number } | null>(null);
  const [textMsg,       setTextMsg]       = useState<string | null>(null);
  const [textBubblePos, setTextBubblePos] = useState<{ x: number; y: number } | null>(null);
  const msgTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging   = useRef(false);
  const dragOffset   = useRef({ x: 0, y: 0 });

  const [helperEmail,   setHelperEmail]   = useState("");
  const [helperName,    setHelperName]    = useState("");
  const [sending,       setSending]       = useState(false);
  const [sent,          setSent]          = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [sparks,        setSparks]        = useState<Spark[]>([]);
  const sparkId = useRef(0);

  const helperUrl = `${window.location.origin}/helper?room=${encodeURIComponent(session.room_url)}`;

  useEffect(() => {
    return () => {
      callRef.current?.leave();
      callRef.current?.destroy();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

  async function startSession() {
    setStarted(true);
    setError(null);
    try {
      const call = DailyIframe.createCallObject({ audioSource: true, videoSource: false });
      callRef.current = call;

      call.on("participant-joined", (e) => {
        if (e && !e.participant.local) {
          wasConnected.current = true;
          setHelperOn(true);
          setDisconnected(false);
        }
      });
      call.on("participant-left", (e) => {
        if (e && !e.participant.local) {
          setHelperOn(false);
          if (wasConnected.current) setDisconnected(true);
        }
      });
      call.on("app-message", (e) => {
        if (e?.data?.type === "pointer") {
          let { x, y }: { x: number; y: number } = e.data;
          const sw = window.screen.width, sh = window.screen.height;
          const vw = window.innerWidth,   vh = window.innerHeight;
          if (sw > vw * 1.1 || sh > vh * 1.1) {
            const chromeH = window.outerHeight - window.innerHeight;
            x = (x * sw - window.screenX) / vw;
            y = (y * sh - window.screenY - chromeH) / vh;
          }
          if (x < 0 || x > 1 || y < 0 || y > 1) return;
          setPointer({ x, y });
          pointerCountRef.current += 1;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setPointer(null), 2000);
        }
        if (e?.data?.type === "text" && e.data.msg) {
          setTextMsg(e.data.msg);
          setTextBubblePos(null); // reset to default position on new message
          sessionMessages.current.push(e.data.msg);
          if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
          msgTimerRef.current = setTimeout(() => setTextMsg(null), 6000);
        }
      });

      await call.join({ url: session.room_url });
      await call.startScreenShare();
      setSharing(true);
      sessionStartRef.current = Date.now();

      try {
        const docRef = await addDoc(collection(db, "sessions"), {
          userId, startTime: serverTimestamp(), endTime: null,
          helperName: "", helperEmail: "", messages: [], pointerCount: 0,
          summary: null, steps: [], status: "active",
        });
        sessionDocId.current = docRef.id;
      } catch { /* best-effort */ }
    } catch (err: unknown) {
      // If only screen share was denied, session still works for inviting
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("NotAllowed") && !msg.includes("Permission")) {
        setError("Could not start session. Please try again.");
        setStarted(false);
      }
    }
  }

  // ── Draggable text bubble ──────────────────────────────
  function onBubbleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    isDragging.current = true;
    const el = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - el.left, y: e.clientY - el.top };

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      setTextBubblePos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    }
    function onUp() {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function triggerSparks(btnEl: HTMLButtonElement) {
    const rect = btnEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const newSparks: Spark[] = Array.from({ length: 6 }, (_, i) => ({
      id: ++sparkId.current, x: cx, y: cy,
      angle: (360 / 6) * i, dist: 36 + Math.random() * 24,
    }));
    setSparks(s => [...s, ...newSparks]);
    setTimeout(() => setSparks(s => s.filter(sp => !newSparks.find(n => n.id === sp.id))), 600);
  }

  async function sendInvite(e: React.MouseEvent<HTMLButtonElement>) {
    if (!helperEmail) return;
    triggerSparks(e.currentTarget);
    setSending(true); setSent(false); setError(null);
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
    } finally { setSending(false); }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    callRef.current?.setLocalAudio(!next);
  }

  async function endSession() {
    callRef.current?.leave();
    callRef.current?.destroy();
    callRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPointer(null);

    if (sessionDocId.current) {
      const durationMin = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000));
      let summary = "", steps: string[] = [];
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            helper_name:      helperName || "Your guide",
            duration_minutes: durationMin,
            messages:         sessionMessages.current,
            pointer_count:    pointerCountRef.current,
          }),
        });
        const data = await res.json();
        summary = data.summary; steps = data.steps;
      } catch { /* best-effort */ }
      try {
        await updateDoc(doc(db, "sessions", sessionDocId.current), {
          endTime: serverTimestamp(), helperName, helperEmail,
          messages: sessionMessages.current, pointerCount: pointerCountRef.current,
          summary, steps, status: "ended",
        });
      } catch { /* best-effort */ }
    }
    setEnded(true);
  }

  async function startNewSession() {
    setNewSessLoading(true);
    await onNewSession?.();
  }

  const statusKey  = helperOn ? "connected" : disconnected ? "disconnected" : sharing ? "waiting" : "starting";
  const statusText = helperOn ? "Guide connected" : disconnected ? "Guide disconnected" : sharing ? "Waiting for guide" : "Starting...";

  // ── Ended screen ───────────────────────────────────────
  if (ended) return (
    <div className="senior-page">
      <nav className="senior-nav">
        <Logo variant="light" size="md" />
      </nav>
      <main className="senior-content">
        <div className="senior-ended">
          <div className="senior-ended-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="rgba(29,78,216,0.18)" strokeWidth="2"/>
              <path d="M16 24l6 6 10-10" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="senior-ended-title">Session ended</h2>
          <p className="senior-ended-sub">Your screen share has stopped. Ready to start again whenever you need help.</p>
          <button className="senior-btn-primary" style={{ maxWidth: 340 }} onClick={startNewSession} disabled={newSessLoading}>
            {newSessLoading ? "Starting..." : <><span>Start New Session</span> <span style={{ opacity: 0.7 }}>→</span></>}
          </button>
          <button className="senior-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/history")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Session History
          </button>
          <button className="senior-btn-end" style={{ marginTop: 8 }} onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );

  // ── Lobby / pre-start screen ───────────────────────────
  if (!started) return (
    <div className="senior-page">
      <nav className="senior-nav">
        <Logo variant="light" size="md" />
        <div className="senior-nav-right">
          <button className="senior-btn-history" onClick={() => navigate("/history")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            History
          </button>
          <button className="senior-btn-end" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </nav>
      <main className="senior-content">
        {error && <div className="senior-error">{error}</div>}
        <div className="senior-lobby">
          <div className="senior-lobby-icon">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="rgba(29,78,216,0.15)" strokeWidth="2"/>
              <path d="M17 26h18M26 17v18" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="senior-lobby-title">Ready to get help?</h1>
          <p className="senior-lobby-sub">
            Tap the button below to share your screen. Then send your guide an invite so they can see what you see and walk you through it.
          </p>
          <button className="senior-btn-primary senior-lobby-btn" onClick={startSession}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Start Session
          </button>
        </div>
      </main>
    </div>
  );

  // ── Active session ─────────────────────────────────────
  return (
    <div className="senior-page">
      <nav className="senior-nav">
        <Logo variant="light" size="md" />
        <div className="senior-nav-right">
          <div className={`senior-status ${statusKey}`}>
            <span className="senior-status-dot" />
            {statusText}
          </div>
          <button className="senior-btn-history" onClick={() => navigate("/history")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            History
          </button>
          <button className={`senior-mute-btn${muted ? " muted" : ""}`} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a3 3 0 013 3v4a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 8.5A4 4 0 009 12.5a4 4 0 004-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="12.5" x2="9" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a3 3 0 013 3v4a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 8.5A4 4 0 009 12.5a4 4 0 004-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="12.5" x2="9" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      </nav>

      <main className="senior-content">
        {error && <div className="senior-error">{error}</div>}
        {disconnected && !helperOn && (
          <div className="senior-disconnected-banner">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 5v5M9 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Guide disconnected — share the link again to reconnect.
          </div>
        )}

        <div className="senior-hero">
          <p className="senior-hero-eyebrow">Active Session</p>
          <h1 className="senior-hero-title">Guided by <em>Comet.</em></h1>
          <p className="senior-hero-sub">Connect with someone you trust. Enter their details below to send a secure session invite.</p>
        </div>

        <div className="senior-grid">
          <div className="senior-card">
            <p className="senior-card-label">Who do you need help from?</p>
            <div className="senior-field">
              <label className="senior-field-label">Name</label>
              <input className="senior-input" type="text" placeholder="Their name (optional)" value={helperName} onChange={e => setHelperName(e.target.value)} />
            </div>
            <div className="senior-field">
              <label className="senior-field-label">Email</label>
              <input className="senior-input" type="email" placeholder="their@email.com" value={helperEmail} onChange={e => setHelperEmail(e.target.value)} />
            </div>
            <button className={`senior-btn-primary${sent ? " sent" : ""}`} onClick={sendInvite} disabled={!helperEmail || sending || sent}>
              {sent ? <><span>✓</span> Invitation sent!</> : sending ? "Sending..." : <><span>Send Invite</span> <span style={{ opacity: 0.7 }}>→</span></>}
            </button>
            <div className="senior-session-actions">
              <button className="senior-btn-end-session" onClick={endSession}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="5" y="5" width="6" height="6" rx="0.5" fill="currentColor"/>
                </svg>
                End Session
              </button>
              <button className="senior-btn-end" onClick={onLogout}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>

          <div className="senior-panel">
            <div className="senior-card">
              <p className="senior-panel-title">Scan for mobile access</p>
              <div className="senior-qr-inner">
                <div className="senior-qr-wrap">
                  <QRCodeSVG value={helperUrl} size={188} bgColor="#ffffff" fgColor="#0B0F2A" level="M" />
                </div>
                <p className="senior-qr-hint">Ask your guide to scan this with their phone to join instantly.</p>
                <button className="senior-btn-ghost" onClick={() => navigator.clipboard?.writeText(helperUrl)}>
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

      {/* Draggable text message bubble */}
      {textMsg && (
        <div
          className="senior-text-bubble"
          style={textBubblePos
            ? { position: "fixed", left: textBubblePos.x, top: textBubblePos.y, bottom: "auto", transform: "none" }
            : undefined
          }
          onMouseDown={onBubbleMouseDown}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
            <path d="M3 6h12M3 9h8M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{textMsg}</span>
          <div className="senior-bubble-drag-hint">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2v10M9 2v10M2 5h10M2 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>
        </div>
      )}

      {/* Guide pointer — clean minimal dot */}
      {pointer && (
        <div className="senior-overlay">
          <div className="senior-target" style={{ left: `${pointer.x * 100}%`, top: `${pointer.y * 100}%` }}>
            <svg width="60" height="60" viewBox="-30 -30 60 60" fill="none" shapeRendering="geometricPrecision" style={{ overflow: "visible" }}>
              <circle r="24" fill="none" stroke="#1D4ED8" strokeWidth="1.5" opacity="0.35" className="senior-target-ring"/>
              <circle r="10" fill="#1D4ED8" stroke="white" strokeWidth="3" paintOrder="stroke"/>
            </svg>
          </div>
        </div>
      )}

      {/* Starburst sparks */}
      {sparks.map(sp => (
        <div key={sp.id} className="senior-spark" style={{ left: sp.x, top: sp.y }}>
          <div className="senior-spark-dot" style={{ transform: `translate(-50%, -50%) rotate(${sp.angle}deg) translateY(-${sp.dist}px)` }} />
        </div>
      ))}
    </div>
  );
}
