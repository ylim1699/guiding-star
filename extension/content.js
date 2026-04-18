(function () {
  if (document.getElementById('comet-overlay-root')) return;
  // Signal to the Comet web app that this extension is active
  document.documentElement.setAttribute('data-comet-ext', '1');

  // ── Inject overlay root ──────────────────────────────
  const root = document.createElement('div');
  root.id = 'comet-overlay-root';
  root.style.cssText = `
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  document.documentElement.appendChild(root);

  // ── Pointer dot ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #comet-dot {
      position: absolute;
      width: 20px; height: 20px;
      background: #1D4ED8;
      border: 3px solid white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      display: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    #comet-dot-ring {
      position: absolute;
      width: 48px; height: 48px;
      border: 2px solid #1D4ED8;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      display: none;
      animation: comet-ring-pulse 1.6s ease-out infinite;
      opacity: 0.45;
    }
    @keyframes comet-ring-pulse {
      0%   { width: 24px; height: 24px; opacity: 0.6; }
      100% { width: 56px; height: 56px; opacity: 0; }
    }
    #comet-msg {
      position: fixed;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      background: rgba(10, 15, 40, 0.93);
      color: white;
      padding: 14px 24px;
      border-radius: 16px;
      font-size: 18px;
      font-weight: 600;
      line-height: 1.45;
      max-width: min(620px, 88vw);
      white-space: pre-wrap;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07);
      animation: comet-msg-in 0.22s ease-out;
      pointer-events: none;
    }
    @keyframes comet-msg-in {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);

  const ring = document.createElement('div');
  ring.id = 'comet-dot-ring';
  root.appendChild(ring);

  const dot = document.createElement('div');
  dot.id = 'comet-dot';
  root.appendChild(dot);

  const msg = document.createElement('div');
  msg.id = 'comet-msg';
  root.appendChild(msg);

  let dotTimer = null;
  let msgTimer = null;

  function showPointer(x, y) {
    const px = `${x * 100}%`;
    const py = `${y * 100}%`;
    dot.style.left  = px; dot.style.top  = py; dot.style.display = 'block';
    ring.style.left = px; ring.style.top = py; ring.style.display = 'block';
    if (dotTimer) clearTimeout(dotTimer);
    dotTimer = setTimeout(() => {
      dot.style.display = 'none';
      ring.style.display = 'none';
    }, 2200);
  }

  function showMessage(text) {
    msg.textContent = text;
    msg.style.display = 'block';
    // reset animation
    msg.style.animation = 'none';
    msg.offsetHeight; // reflow
    msg.style.animation = '';
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg.style.display = 'none'; }, 6000);
  }

  // ── Listen to storage changes from any tab ───────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes['comet-pointer']) {
      const { x, y } = changes['comet-pointer'].newValue;
      showPointer(x, y);
    }
    if (changes['comet-text']) {
      showMessage(changes['comet-text'].newValue);
    }
  });

  // ── Bridge: Comet web app → background service worker ──
  // Route through background.js so storage writes survive
  // content script context invalidation (SPA navigation etc.)
  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type !== 'comet-pointer' && e.data.type !== 'comet-text') return;
    try { chrome.runtime.sendMessage(e.data); } catch (_) {}
  });
})();
