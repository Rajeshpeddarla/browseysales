(function() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
  if (window.browseyInitialized) return;
  window.browseyInitialized = true;

  const sidebar = document.createElement('div');
  sidebar.id = 'browsey-sidebar-container';
  sidebar.style.all = 'initial';
  
  const currentUrl = encodeURIComponent(window.location.href);
  
  sidebar.innerHTML = `
    <style>
      #browsey-sidebar-container {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        width: 450px !important;
        min-width: 320px !important;
        max-width: 45% !important;
        height: 100vh !important;
        background: #0D0D12 !important;
        z-index: 2147483647 !important;
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        transform: translateX(100%) !important;
        box-shadow: -10px 0 50px rgba(0, 0, 0, 0.8) !important;
        border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        user-select: none !important;
      }
      #browsey-sidebar-container.browsey-open {
        transform: translateX(0) !important;
      }
      .browsey-sidebar-inner {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
      }
      #browsey-iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        background: #0D0D12 !important;
      }
      #browsey-resizer {
        position: absolute !important;
        left: -3px !important;
        top: 0 !important;
        width: 6px !important;
        height: 100% !important;
        cursor: col-resize !important;
        z-index: 2147483648 !important;
      }
      #browsey-toggle-btn {
        position: absolute !important;
        left: -50px !important;
        top: 20px !important;
        width: 50px !important;
        height: 50px !important;
        background: #7C3AED !important;
        color: white !important;
        border-radius: 12px 0 0 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: -4px 0 15px rgba(124, 58, 237, 0.4) !important;
      }
      .robot-icon { width: 28px; height: 28px; }
    </style>
    <div class="browsey-sidebar-inner">
      <div id="browsey-resizer"></div>
      <iframe id="browsey-iframe" src="http://localhost:3000/analysis?url=${currentUrl}" allow="clipboard-read; clipboard-write"></iframe>
      <div id="browsey-toggle-btn">
        <svg class="robot-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2V4M5 8V7C5 5.34315 6.34315 4 8 4H16C17.6569 4 19 5.34315 19 7V8" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" stroke-width="2"/>
          <circle cx="8.5" cy="13.5" r="1.5" fill="#00F3FF"/>
          <circle cx="15.5" cy="13.5" r="1.5" fill="#00F3FF"/>
          <path d="M9 17C9.5 17.5 10.5 18 12 18C13.5 18 14.5 17.5 15 17" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  let isOpen = false;
  const iframe = sidebar.querySelector('#browsey-iframe');

  function getPageContent() {
    const mainNode = document.querySelector('main') || document.querySelector('article') || document.body;
    
    // Extract aria-labels for hidden data
    const ariaElements = mainNode.querySelectorAll('[aria-label]');
    let ariaTexts = [];
    ariaElements.forEach(el => {
      const label = el.getAttribute('aria-label');
      if (label && label.length > 0 && label.length < 150) {
        ariaTexts.push(label);
      }
    });
    // Remove duplicates and truncate
    const uniqueAria = [...new Set(ariaTexts)].join(' | ').substring(0, 15000);

    // Extract links and tel numbers
    const anchorElements = mainNode.querySelectorAll('a');
    let linkTexts = [];
    anchorElements.forEach(el => {
      const href = el.getAttribute('href');
      if (href && (href.startsWith('http') || href.startsWith('tel:'))) {
        const text = (el.innerText || el.getAttribute('aria-label') || 'Link').trim().substring(0, 40);
        linkTexts.push(`[${text}](${href})`);
      }
    });
    // Remove duplicates and truncate
    const uniqueLinks = [...new Set(linkTexts)].join(' | ').substring(0, 15000);

    // Truncate body text so it leaves room
    const bodyText = (mainNode.innerText || document.body.innerText).substring(0, 40000);
    
    const combinedText = `
[VISIBLE TEXT]
${bodyText}

[ACCESSIBILITY LABELS (Contains Phones/Ratings)]
${uniqueAria}

[LINKS & PHONE NUMBERS]
${uniqueLinks}
    `;
    
    return combinedText.replace(/\s+/g, ' ').trim();
  }

  function sendContentToIframe() {
    const content = getPageContent();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'page-content',
        url: window.location.href,
        content: content
      }, '*');
    }
  }

  function toggleSidebar() {
    isOpen = !isOpen;
    sidebar.classList.toggle('browsey-open', isOpen);
    if (isOpen) {
      // Send content immediately when opened
      setTimeout(sendContentToIframe, 500);
    }
  }

  sidebar.querySelector('#browsey-toggle-btn').addEventListener('click', toggleSidebar);

  // Link Hover
  let hoverTimer;
  document.addEventListener('mouseover', (e) => {
    if (!isOpen) return;
    const anchor = e.target.closest('a');
    if (anchor && anchor.href && anchor.href.startsWith('http')) {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        iframe.contentWindow.postMessage({
          type: 'link-hover',
          url: anchor.href,
          text: anchor.innerText.trim()
        }, '*');
      }, 600);
    }
  });

  // Resizer
  let isDragging = false;
  sidebar.querySelector('#browsey-resizer').addEventListener('mousedown', () => { isDragging = true; sidebar.style.transition = 'none'; });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const width = window.innerWidth - e.clientX;
    if (width > 320 && width < window.innerWidth * 0.45) sidebar.style.width = width + 'px';
  });
  document.addEventListener('mouseup', () => { isDragging = false; sidebar.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'; });

  let iframeReady = false;
  let pendingQuery = null;
  let lastKnownUrl = window.location.href;

  iframe.addEventListener('load', () => {
    iframeReady = true;
    if (pendingQuery) {
      iframe.contentWindow.postMessage({ type: 'direct-query', query: pendingQuery }, '*');
      pendingQuery = null;
    }
  });

  // Re-send page content when the URL changes (e.g. clicking a restaurant in Maps)
  function checkForUrlChange() {
    if (window.location.href !== lastKnownUrl) {
      lastKnownUrl = window.location.href;
      // Wait for new content to load
      setTimeout(() => {
        if (isOpen) sendContentToIframe();
      }, 1500);
    }
  }
  setInterval(checkForUrlChange, 1000);

  // Also re-send content when DOM changes significantly (SPA navigations)
  let contentUpdateTimer;
  const observer = new MutationObserver(() => {
    if (!isOpen) return;
    clearTimeout(contentUpdateTimer);
    contentUpdateTimer = setTimeout(() => {
      sendContentToIframe();
    }, 2000);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'newtab-query') {
      if (!isOpen) toggleSidebar();
      const query = event.data.query;
      if (iframeReady) {
        iframe.contentWindow.postMessage({ type: 'direct-query', query: query }, '*');
      } else {
        pendingQuery = query;
      }
    }
    if (event.data?.type === 'execute-action') {
      const { action, url, query, newTab } = event.data.payload;
      if (action === 'navigate' && url) {
        // Navigate in the CURRENT tab so the sidebar stays and can analyze the result
        window.location.href = url;
      } else if (action === 'search' && query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      } else if (action === 'extract') {
        const extracted = getPageContent();
        iframe.contentWindow.postMessage({ type: 'extracted-data', data: extracted }, '*');
      }
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "toggle") toggleSidebar();
  });
})();
