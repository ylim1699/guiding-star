import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import "./HelperPage.css";
import Logo from "../components/Logo";

export default function HelperPage() {
  const roomUrl = decodeURIComponent(
    new URLSearchParams(window.location.search).get("room") || ""
  );

  const callRef  = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [statusKey,  setStatusKey]  = useState<"connecting" | "waiting" | "live">("connecting");
  const [statusText, setStatusText] = useState("Connecting...");
  const [hasVideo,   setHasVideo]   = useState(false);
  const [lastClick,  setLastClick]  = useState<{ x: number; y: number } | null>(null);
  const [muted,      setMuted]      = useState(false);
  const [msgInput,   setMsgInput]   = useState("");
  const [msgSent,    setMsgSent]    = useState(false);

  useEffect(() => {
    if (!roomUrl) return;
    join();
    return () => {
      callRef.current?.leave();
      callRef.current?.destroy();
    };
  }, []);

  async function join() {
    const call = DailyIframe.createCallObject({ audioSource: true, videoSource: false });
    callRef.current = call;

    call.on("track-started", (e) => {
      if (e?.track.kind === "video" && videoRef.current) {
        videoRef.current.srcObject = new MediaStream([e.track]);
        setStatusKey("live");
        setStatusText("Live — click to guide");
        setHasVideo(true);
      }
    });
    call.on("participant-joined", () => {
      setStatusKey("waiting");
      setStatusText("Connected — waiting for screen share");
    });

    await call.join({ url: roomUrl });
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    callRef.current?.setLocalAudio(!next);
  }

  function sendMessage() {
    const msg = msgInput.trim();
    if (!msg) return;
    callRef.current?.sendAppMessage({ type: "text", msg }, "*");
    setMsgInput("");
    setMsgSent(true);
    setTimeout(() => setMsgSent(false), 1800);
  }

  function handleClick(e: React.MouseEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    if (!video.videoWidth || !video.videoHeight) return;

    const rect = video.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const videoAspect = video.videoWidth / video.videoHeight;
    const elemAspect  = rect.width / rect.height;

    let contentW = rect.width;
    let contentH = rect.height;
    let offsetX  = 0;
    let offsetY  = 0;

    if (videoAspect > elemAspect) {
      contentH = rect.width / videoAspect;
      offsetY  = (rect.height - contentH) / 2;
    } else if (videoAspect < elemAspect) {
      contentW = rect.height * videoAspect;
      offsetX  = (rect.width - contentW) / 2;
    }

    const x = Math.max(0, Math.min(1, (rawX - offsetX) / contentW));
    const y = Math.max(0, Math.min(1, (rawY - offsetY) / contentH));

    setLastClick({ x: rawX, y: rawY });
    setTimeout(() => setLastClick(null), 500);

    callRef.current?.sendAppMessage({ type: "pointer", x, y }, "*");
  }

  if (!roomUrl) return (
    <div className="helper-center">
      <Logo variant="dark" size="md" />
      <p className="helper-err">No room URL in link — check your link.</p>
    </div>
  );

  const badgeClass = `helper-status-badge ${statusKey === "live" ? "live" : statusKey === "waiting" ? "waiting" : ""}`;

  return (
    <div className="helper-page">
      <header className="helper-topbar">
        <Logo variant="dark" size="sm" />
        <div className="helper-topbar-right">
          <div className={badgeClass}>
            <span className="helper-status-dot" />
            {statusText}
          </div>
          <button
            className={`helper-mute-btn${muted ? " muted" : ""}`}
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
          >
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
      </header>

      <main className="helper-main">
        <div className="helper-video-wrap">
          <div className={`helper-video-frame ${hasVideo ? "live" : ""}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="helper-video"
              style={{ cursor: hasVideo ? "crosshair" : "default" }}
              onClick={hasVideo ? handleClick : undefined}
            />

            {!hasVideo && (
              <div className="helper-waiting">
                <div className="helper-waiting-ring" />
                <span className="helper-waiting-label">Waiting for screen share...</span>
              </div>
            )}

            {lastClick && (
              <div
                className="helper-ripple"
                style={{ left: lastClick.x, top: lastClick.y }}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="helper-footer">
        <div className="helper-msg-bar">
          <input
            className="helper-msg-input"
            type="text"
            placeholder="Type a message to show on their screen…"
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            maxLength={120}
          />
          <button
            className={`helper-msg-send${msgSent ? " sent" : ""}`}
            onClick={sendMessage}
            disabled={!msgInput.trim()}
          >
            {msgSent ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9l13-6-5 6 5 6-13-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="helper-hint">Click the screen to place a guide marker · Enter to send a message</p>
      </footer>
    </div>
  );
}
