import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import "./SeniorPage.css";

type Session = { room_url: string; room_name: string };

export default function SeniorPage({ session }: { session: Session }) {
  const callRef  = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [helperOn, setHelperOn] = useState(false);
  const [pointer, setPointer]   = useState<{ x: number; y: number } | null>(null);
  const [sharing, setSharing]   = useState(false);
  const [pulse, setPulse]       = useState(false);

  const helperLink =
    `${window.location.origin}/helper?room=${encodeURIComponent(session.room_url)}`;

  useEffect(() => {
    startSession();
    return () => {
      callRef.current?.leave();
      callRef.current?.destroy();
    };
  }, []);

  async function startSession() {
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
  }

  function copyLink() {
    navigator.clipboard.writeText(helperLink);
  }

  return (
    <div className="senior-page">
      <div
        className="senior-badge"
        style={{ background: helperOn ? "#D4EDDA" : "#FFF3CD" }}
      >
        <span className="senior-badge-txt">
          {helperOn ? "✓  Your guide is connected" : "Waiting for your guide..."}
        </span>
      </div>

      <h2 className="senior-heading">
        {sharing ? "Your screen is being shared" : "Starting..."}
      </h2>

      <p className="senior-label">Send this link to your guide:</p>
      <div className="senior-link-row">
        <code className="senior-link-box">{helperLink}</code>
        <button className="senior-copy-btn" onClick={copyLink}>Copy</button>
      </div>

      <button className="senior-end-btn" onClick={() => window.location.href = "/"}>
        End Session
      </button>

      {pointer && (
        <div className="senior-overlay">
          <div
            className="senior-dot"
            style={{
              left: `${pointer.x * 100}%`,
              top: `${pointer.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${pulse ? 1.6 : 1})`,
            }}
          />
        </div>
      )}
    </div>
  );
}
