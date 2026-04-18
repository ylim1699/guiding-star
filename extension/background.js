chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'comet-pointer') {
    chrome.storage.local.set({ 'comet-pointer': { x: msg.x, y: msg.y, t: Date.now() } });
  } else if (msg.type === 'comet-text') {
    chrome.storage.local.set({ 'comet-text': msg.msg });
  }
});
