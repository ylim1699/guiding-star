import DailyIframe from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import "./HelperPage.css";

export default function HelperPage() {
  const roomUrl = decodeURIComponent(
    new URLSearchParams(window.location.search).get("room") || ""
  );

  const callRef  = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus]       = useState("Connecting...");
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!roomUrl) return;
    join();
    return () => {
      callRef.current?.leave();
      callRef.current?.destroy();
    };
  }, []);

  async function join() {
    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: false,
    });
    callRef.current = call;

    call.on("track-started", (e) => {
      if (e?.track.kind === "video" && videoRef.current) {
        videoRef.current.srcObject = new MediaStream([e.track]);
        setStatus("Live — click to guide");
      }
    });
    call.on("participant-joined", () =>
      setStatus("Connected — waiting for screen share...")
    );

    await call.join({ url: roomUrl });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setLastClick({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setLastClick(null), 400);

    callRef.current?.sendAppMessage({ type: "pointer", x, y }, "*");
  }

  if (!roomUrl) return (
    <div className="helper-center">
      <p className="helper-err">No room URL in link. Check your link.</p>
    </div>
  );

  return (
    <div className="helper-page">
      <h1 className="helper-title">Comet</h1>
      <p className="helper-status">{status}</p>

      <div className="helper-video-wrap" onClick={handleClick}>
        <video ref={videoRef} autoPlay playsInline className="helper-video" />

        {lastClick && (
          <div
            className="helper-ripple"
            style={{ left: lastClick.x, top: lastClick.y }}
          />
        )}
      </div>

      <p className="helper-hint">Click anywhere on the screen above to guide</p>
    </div>
  );
}
