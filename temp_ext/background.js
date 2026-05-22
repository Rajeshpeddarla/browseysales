chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || tab.url.startsWith("chrome://") || tab.url.startsWith("https://chrome.google.com") || tab.url.includes("localhost")) {
    return;
  }
  
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
        } catch (err) {}
      }, 100);
    } catch (err) {}
  }
});

console.log("Browsey Service Worker 1.0.8 Active.");
