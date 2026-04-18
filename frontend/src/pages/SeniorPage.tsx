import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Session {
  room_url: string;
  room_name: string;
}

export default function SeniorPage({ session }: { session: Session }) {
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
  const [showQR,      setShowQR]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

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
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });
      callRef.current = call;

      call.on("participant-joined", (e) => {
        if (e && !e.participant.local) setHelperOn(true);
      });
      call.on("participant-left", (e) => {
        if (e && !e.participant.local) setHelperOn(false);
      });
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

  async function sendInvite() {
    if (!helperEmail) return;
    setSending(true);
    setSent(false);
    setError(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/send-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            helper_email: helperEmail,
            helper_name:  helperName || helperEmail,
            room_url:     helperUrl,
            senior_name:  "Someone",
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch {
      setError("Could not send invite. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={s.page}>

      <div style={{ ...s.badge, background: helperOn ? "#D4EDDA" : "#FFF3CD" }}>
        <span style={s.badgeTxt}>
          {helperOn
            ? "✓  Your guide is connected"
            : sharing
            ? "Your screen is shared — waiting for guide"
            : "Starting session..."}
        </span>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <p style={s.sectionLabel}>Who do you need help from?</p>

      <input
        style={s.input}
        type="text"
        placeholder="Their name (optional)"
        value={helperName}
        onChange={e => setHelperName(e.target.value)}
      />
      <input
        style={s.input}
        type="email"
        placeholder="Their email address"
        value={helperEmail}
        onChange={e => setHelperEmail(e.target.value)}
      />
      <button
        style={{
          ...s.contactBtn,
          ...(sent ? s.contactBtnSent : {}),
          opacity: !helperEmail || sending ? 0.5 : 1,
        }}
        onClick={sendInvite}
        disabled={!helperEmail || sending || sent}
      >
        {sent ? "✓ Invitation sent!" : sending ? "Sending..." : "Send Invite"}
      </button>

      <button style={s.qrToggle} onClick={() => setShowQR(v => !v)}>
        {showQR ? "Hide QR Code" : "Show QR Code instead"}
      </button>

      {showQR && (
        <div style={s.qrBox}>
          <p style={s.qrLabel}>Ask your guide to scan this with their phone</p>
          <QRCodeSVG value={helperUrl} size={220} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
        </div>
      )}

      <button style={s.endBtn} onClick={() => window.location.href = "/"}>
        End Session
      </button>

      {pointer && (
        <div style={s.overlay}>
          <div style={{
            ...s.dot,
            left: `${pointer.x * 100}%`,
            top:  `${pointer.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${pulse ? 1.7 : 1})`,
          }} />
        </div>
      )}

    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: "100vh", background: "#FFF9F0",
    padding: "32px", position: "relative",
  },
  badge: { borderRadius: "50px", padding: "14px 32px", marginBottom: "32px" },
  badgeTxt: { fontSize: "20px", fontWeight: 600, color: "#333" },
  errorBox: {
    background: "#FDECEA", border: "1px solid #F5C6CB", borderRadius: "12px",
    padding: "14px 20px", marginBottom: "20px", fontSize: "16px", color: "#721C24",
    maxWidth: "480px", width: "100%", textAlign: "center",
  },
  sectionLabel: { fontSize: "20px", color: "#555", marginBottom: "16px", fontWeight: 600 },
  input: {
    fontSize: "18px", padding: "16px", borderRadius: "12px",
    border: "2px solid #ddd", width: "100%", maxWidth: "480px",
    marginBottom: "12px", boxSizing: "border-box",
  },
  contactBtn: {
    fontSize: "24px", fontWeight: "700", background: "white", color: "#E85D04",
    border: "3px solid #E85D04", borderRadius: "16px", padding: "20px",
    width: "100%", maxWidth: "480px", marginBottom: "14px", cursor: "pointer",
    transition: "all 0.2s",
  },
  contactBtnSent: { background: "#D4EDDA", color: "#155724", border: "3px solid #C3E6CB" },
  qrToggle: {
    background: "transparent", border: "none", color: "#E85D04", fontSize: "16px",
    cursor: "pointer", textDecoration: "underline", marginBottom: "20px", padding: "8px",
  },
  qrBox: {
    background: "white", borderRadius: "16px", padding: "24px",
    textAlign: "center", marginBottom: "24px", border: "2px solid #E85D04",
  },
  qrLabel: { fontSize: "16px", color: "#555", marginBottom: "16px" },
  endBtn: {
    fontSize: "20px", fontWeight: "700", background: "#DC3545", color: "white",
    border: "none", borderRadius: "12px", padding: "18px 48px",
    cursor: "pointer", marginTop: "16px", width: "100%", maxWidth: "480px",
  },
  overlay: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 },
  dot: {
    position: "absolute", width: "52px", height: "52px", borderRadius: "50%",
    background: "rgba(232, 93, 4, 0.85)", border: "3px solid white",
    boxShadow: "0 0 0 8px rgba(232, 93, 4, 0.2)", transition: "transform 0.15s ease",
  },
};
