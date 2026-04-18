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

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video) return;

    const rect        = video.getBoundingClientRect();
    const videoAspect = video.videoWidth / video.videoHeight;
    const elemAspect  = rect.width / rect.height;

    let contentW = rect.width, contentH = rect.height, offsetX = 0, offsetY = 0;

    if (videoAspect > elemAspect) {
      contentH = rect.width / videoAspect;
      offsetY  = (rect.height - contentH) / 2;
    } else {
      contentW = rect.height * videoAspect;
      offsetX  = (rect.width - contentW) / 2;
    }

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left - offsetX) / contentW));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top  - offsetY) / contentH));

    setLastClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setLastClick(null), 450);
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
        <div className={badgeClass}>
          <span className="helper-status-dot" />
          {statusText}
        </div>
      </header>

      <main className="helper-main">
        <div
          className="helper-video-wrap"
          onClick={hasVideo ? handleClick : undefined}
          style={{ cursor: hasVideo ? "crosshair" : "default" }}
        >
          <div className={`helper-video-frame ${hasVideo ? "live" : ""}`}>
            <video ref={videoRef} autoPlay playsInline className="helper-video" />

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
        <span className="helper-hint-spark">✦</span>
        <p className="helper-hint">Click anywhere on the screen above to place a guide marker</p>
      </footer>
    </div>
  );
}
