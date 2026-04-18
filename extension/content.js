// (function () {
//   if (document.getElementById('comet-overlay-root')) return;

//   document.documentElement.setAttribute('data-comet-ext', '1');

//   // ── Overlay root (always injected, hidden by default) ──
//   const root = document.createElement('div');
//   root.id = 'comet-overlay-root';
//   root.style.cssText = `
//     position: fixed; inset: 0;
//     pointer-events: none;
//     z-index: 2147483647;
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//   `;
//   document.documentElement.appendChild(root);

//   const style = document.createElement('style');
//   style.textContent = `
//     #comet-dot {
//       position: absolute;
//       width: 20px; height: 20px;
//       background: #1D4ED8;
//       border: 3px solid white;
//       border-radius: 50%;
//       transform: translate(-50%, -50%);
//       display: none;
//       box-shadow: 0 2px 10px rgba(0,0,0,0.4);
//     }
//     #comet-dot-ring {
//       position: absolute;
//       width: 48px; height: 48px;
//       border: 2px solid #1D4ED8;
//       border-radius: 50%;
//       transform: translate(-50%, -50%);
//       display: none;
//       animation: comet-ring-pulse 1.6s ease-out infinite;
//       opacity: 0.45;
//     }
//     @keyframes comet-ring-pulse {
//       0%   { width: 24px; height: 24px; opacity: 0.6; }
//       100% { width: 56px; height: 56px; opacity: 0; }
//     }
//     #comet-msg {
//       position: fixed;
//       bottom: 80px;
//       left: 50%;
//       transform: translateX(-50%);
//       display: none;
//       align-items: center;
//       gap: 12px;
//       background: rgba(10, 15, 40, 0.93);
//       color: #ffffff;
//       padding: 16px 20px 16px 24px;
//       border-radius: 18px;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 20px;
//       font-weight: 600;
//       line-height: 1.4;
//       max-width: min(640px, 88vw);
//       white-space: pre-wrap;
//       box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07);
//       pointer-events: auto;
//       cursor: grab;
//       user-select: none;
//       z-index: 2147483647;
//     }
//     #comet-msg:active { cursor: grabbing; }
//   `;
//   document.head.appendChild(style);

//   const ring = document.createElement('div');
//   ring.id = 'comet-dot-ring';
//   root.appendChild(ring);

//   const dot = document.createElement('div');
//   dot.id = 'comet-dot';
//   root.appendChild(dot);

//   const msg = document.createElement('div');
//   msg.id = 'comet-msg';
//   root.appendChild(msg);

//   let dotTimer = null;
//   let msgTimer = null;

//   function showPointer(x, y) {
//     var px = (x * 100) + '%';
//     var py = (y * 100) + '%';
//     dot.style.left  = px; dot.style.top  = py; dot.style.display = 'block';
//     ring.style.left = px; ring.style.top = py; ring.style.display = 'block';
//     if (dotTimer) clearTimeout(dotTimer);
//     dotTimer = setTimeout(function () {
//       dot.style.display = 'none';
//       ring.style.display = 'none';
//     }, 2200);
//   }

//   function showMessage(text) {
//     msg.textContent = text;
//     msg.style.left = '50%';
//     msg.style.top = '';
//     msg.style.bottom = '80px';
//     msg.style.transform = 'translateX(-50%)';
//     msg.style.display = 'block';
//     if (msgTimer) clearTimeout(msgTimer);
//     msgTimer = setTimeout(function () { msg.style.display = 'none'; }, 6000);
//   }

//   // Drag
//   msg.addEventListener('mousedown', function (e) {
//     e.preventDefault();
//     var r = msg.getBoundingClientRect();
//     var ox = e.clientX - r.left;
//     var oy = e.clientY - r.top;
//     msg.style.transform = 'none';
//     msg.style.bottom = '';
//     msg.style.left = r.left + 'px';
//     msg.style.top  = r.top  + 'px';
//     function onMove(ev) {
//       var maxX = window.innerWidth  - msg.offsetWidth;
//       var maxY = window.innerHeight - msg.offsetHeight;
//       msg.style.left = Math.max(0, Math.min(maxX, ev.clientX - ox)) + 'px';
//       msg.style.top  = Math.max(0, Math.min(maxY, ev.clientY - oy)) + 'px';
//     }
//     function onUp() {
//       document.removeEventListener('mousemove', onMove);
//       document.removeEventListener('mouseup', onUp);
//     }
//     document.addEventListener('mousemove', onMove);
//     document.addEventListener('mouseup', onUp);
//   });

//   // ── Show overlay only on non-Comet tabs ───────────────
//   chrome.storage.onChanged.addListener(function (changes) {
//     if (document.documentElement.hasAttribute('data-comet-app')) return;
//     if (changes['comet-pointer']) {
//       var v = changes['comet-pointer'].newValue;
//       showPointer(v.x, v.y);
//     }
//     if (changes['comet-text']) {
//       showMessage(changes['comet-text'].newValue);
//     }
//   });

//   // ── Bridge: Comet page → background → all tabs ────────
//   window.addEventListener('message', function (e) {
//     if (!e.data || typeof e.data !== 'object') return;
//     if (e.data.type !== 'comet-pointer' && e.data.type !== 'comet-text') return;
//     try { chrome.runtime.sendMessage(e.data); } catch (_) {}
//   });
// })();

(function () {
  if (document.getElementById('comet-overlay-root')) return;

  // Signal to the web app that extension is active
  document.documentElement.setAttribute('data-comet-ext', '1');

  const root = document.createElement('div');
  root.id = 'comet-overlay-root';
  root.style.cssText = `
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.documentElement.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #comet-dot, #comet-dot-ring {
      position: absolute;
      transform: translate(-50%, -50%);
      display: none;
      pointer-events: none;
    }
    #comet-dot {
      width: 20px; height: 20px;
      background: #1D4ED8;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    #comet-dot-ring {
      width: 48px; height: 48px;
      border: 2px solid #1D4ED8;
      border-radius: 50%;
      animation: comet-ring-pulse 1.6s ease-out infinite;
      opacity: 0.45;
    }
    @keyframes comet-ring-pulse {
      0%   { width: 24px; height: 24px; opacity: 0.6; }
      100% { width: 56px; height: 56px; opacity: 0; }
    }
    #comet-msg {
      position: fixed;
      bottom: 80px; /* Clears screen-share bars */
      left: 50%;
      transform: translateX(-50%);
      display: none; 
      align-items: center;
      background: rgba(10, 15, 40, 0.95);
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 19px;
      font-weight: 600;
      line-height: 1.4;
      max-width: min(600px, 90vw);
      height: auto; /* Fixes vertical stretching */
      box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      z-index: 2147483647;
      box-sizing: border-box;
    }
    #comet-msg:active { cursor: grabbing; }
  `;
  document.head.appendChild(style);

  const ring = document.createElement('div'); ring.id = 'comet-dot-ring'; root.appendChild(ring);
  const dot  = document.createElement('div'); dot.id  = 'comet-dot';      root.appendChild(dot);
  const msg  = document.createElement('div'); msg.id  = 'comet-msg';      root.appendChild(msg);

  let dTimer, mTimer;

  function showPointer(x, y) {
    const px = (x * 100) + '%', py = (y * 100) + '%';
    dot.style.left = px; dot.style.top = py; dot.style.display = 'block';
    ring.style.left = px; ring.style.top = py; ring.style.display = 'block';
    if (dTimer) clearTimeout(dTimer);
    dTimer = setTimeout(() => { dot.style.display = ring.style.display = 'none'; }, 2200);
  }

  function showMessage(text) {
    if (!text) return;
    msg.textContent = text;
    // Reset layout for new messages
    msg.style.bottom = '80px';
    msg.style.top = ''; 
    msg.style.left = '50%';
    msg.style.transform = 'translateX(-50%)';
    msg.style.display = 'flex';
    if (mTimer) clearTimeout(mTimer);
    mTimer = setTimeout(() => { msg.style.display = 'none'; }, 7000);
  }

  msg.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const r = msg.getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    
    msg.style.transform = 'none';
    msg.style.bottom = 'auto'; // CRITICAL: Stop the vertical stretching
    msg.style.left = r.left + 'px';
    msg.style.top = r.top + 'px';

    const onMove = (ev) => {
      const maxX = window.innerWidth - msg.offsetWidth;
      const maxY = window.innerHeight - msg.offsetHeight;
      msg.style.left = Math.max(0, Math.min(maxX, ev.clientX - ox)) + 'px';
      msg.style.top  = Math.max(0, Math.min(maxY, ev.clientY - oy)) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  chrome.storage.onChanged.addListener((changes) => {
    // Dynamic check prevents double-bubble on main app
    if (document.documentElement.hasAttribute('data-comet-app')) return;

    if (changes['comet-pointer']) {
      const v = changes['comet-pointer'].newValue;
      showPointer(v.x, v.y);
    }
    if (changes['comet-text']) {
      const v = changes['comet-text'].newValue;
      showMessage(typeof v === 'object' ? (v.msg || v.text) : v);
    }
  });

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'comet-pointer' || e.data?.type === 'comet-text') {
      try { chrome.runtime.sendMessage(e.data); } catch(_) {}
    }
  });
})();