// Listen for domain updates from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "domainsUpdated") {
    updateAllTabs();
  }
});

// Listen for new page loads
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    updateTab(details.tabId);
  }
});

function updateAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => updateTab(tab.id));
  });
}

function updateTab(tabId) {
  chrome.storage.local.get(['bypassDomains'], (result) => {
    const domains = result.bypassDomains ? result.bypassDomains.split('\n').map(d => d.trim()).filter(Boolean) : [];
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: injectBypassCode,
      args: [domains],
      world: "MAIN" // This ensures the script runs in the page's context
    });
  });
}

function injectBypassCode(domains) {
  const currentDomain = window.location.hostname;
  if (domains.some(domain => currentDomain.includes(domain))) {
    const script = `
      (function() {
        // Store the original functions
        const RealDate = Date;
        const realSetTimeout = window.setTimeout;
        const realSetInterval = window.setInterval;
        const realClearTimeout = window.clearTimeout;
        const realClearInterval = window.clearInterval;

        // Map to keep track of accelerated timers
        const timerMap = new Map();

        // Calculate a future date (6 seconds in the future, just over the 5-second timer)
        const futureTime = new RealDate().getTime() + 6000;

        // Override the Date object
        window.Date = class extends RealDate {
          constructor(...args) {
            if (args.length === 0) {
              super(futureTime);
            } else {
              super(...args);
            }
          }

          static now() {
            return futureTime;
          }

          getTime() {
            return futureTime;
          }

          // Override more Date methods for thoroughness
          getSeconds() { return new RealDate(futureTime).getSeconds(); }
          getMinutes() { return new RealDate(futureTime).getMinutes(); }
          getHours() { return new RealDate(futureTime).getHours(); }
          // Add more if needed: getDay, getMonth, getFullYear, etc.
        };

        // Override setTimeout to run 100x faster
        window.setTimeout = function(func, delay) {
          const acceleratedDelay = Math.max(1, Math.floor(delay / 100));
          const id = realSetTimeout(() => {
            func();
            timerMap.delete(id);
          }, acceleratedDelay);
          timerMap.set(id, { realId: id, type: 'timeout' });
          return id;
        };

        // Override setInterval to run 100x faster
        window.setInterval = function(func, delay) {
          const acceleratedDelay = Math.max(1, Math.floor(delay / 100));
          const id = realSetInterval(() => {
            func();
          }, acceleratedDelay);
          timerMap.set(id, { realId: id, type: 'interval' });
          return id;
        };

        // Override clear functions to use the real IDs
        window.clearTimeout = function(id) {
          const timer = timerMap.get(id);
          if (timer && timer.type === 'timeout') {
            realClearTimeout(timer.realId);
            timerMap.delete(id);
          }
        };

        window.clearInterval = function(id) {
          const timer = timerMap.get(id);
          if (timer && timer.type === 'interval') {
            realClearInterval(timer.realId);
            timerMap.delete(id);
          }
        };

        // Function to update visible timer elements
        function updateVisibleTimers() {
          const elements = document.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"]');
          for (const el of elements) {
            if (el.innerText && el.innerText.match(/^\\d{1,2}[:.\\s]?\\d{2}$/)) {
              const text = el.innerText;
              const newText = '0:00';
              if (text !== newText) {
                el.innerText = newText;
                // If changing the text doesn't work, try setting innerHTML
                if (el.innerText !== newText) {
                  el.innerHTML = newText;
                }
              }
            }
          }
        }

        // Run updateVisibleTimers every 100ms
        realSetInterval(updateVisibleTimers, 100);

        console.log('Timers bypassed on', '${currentDomain}');
      })();
    `;

    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    (document.head || document.documentElement).appendChild(scriptElement);
    scriptElement.remove();
  }
}