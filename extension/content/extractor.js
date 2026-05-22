// ============================================================
// Page Extractor — Content Script
// Extracts metadata, tech stack clues, forms, pricing, logo wall
// ============================================================

(function () {
  if (window.browseyExtractorInitialized) return;
  window.browseyExtractorInitialized = true;

  console.log('[Browsey Extractor] Content script active.');

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_PAGE') {
      try {
        const payload = extractPageData();
        sendResponse({ ok: true, payload });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return true; // async support
    }
  });

  function extractPageData() {
    const url = window.location.href;
    const domain = window.location.hostname.replace('www.', '');

    // 1. Metadata
    const meta = {
      title: document.title || '',
      description: getMetaContent('description') || getMetaContent('og:description') || '',
      og_image: getMetaContent('og:image') || null,
      canonical: getCanonicalUrl() || null,
      schema_org: extractSchemaOrg(),
    };

    // 2. Headings
    const headings = {
      h1: getElementsText('h1'),
      h2: getElementsText('h2').slice(0, 15),
      h3: getElementsText('h3').slice(0, 15),
    };

    // 3. Navigation Links
    const mainNav = [];
    const footerLinks = [];
    const priorityLinks = [];
    
    document.querySelectorAll('nav a, header a, [class*="nav"] a, [class*="menu"] a').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.innerText.trim();
      if (href && text && href.length < 200 && text.length < 50) {
        mainNav.push({ text, href: resolveUrl(href) });
      }
    });

    document.querySelectorAll('footer a, [class*="footer"] a').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.innerText.trim();
      if (href && text && href.length < 200 && text.length < 50) {
        footerLinks.push({ text, href: resolveUrl(href) });
      }
    });

    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.innerText.trim();
      const resolved = href ? resolveUrl(href) : '';
      if (
        href &&
        resolved &&
        resolved.startsWith(window.location.origin) &&
        /pricing|plans|careers|jobs|integrations|customers|case|security|trust|compliance|docs|developers|api|changelog|release|blog|resources|compare|alternatives|about|contact|demo/i.test(`${resolved} ${text}`) &&
        text.length < 80
      ) {
        priorityLinks.push({ text: text || resolved, href: resolved });
      }
    });

    // 4. Social Links
    const socialLinks = {
      linkedin: findSocialLink(/linkedin\.com\/(company|in)/i),
      twitter: findSocialLink(/(twitter\.com|x\.com)/i),
      github: findSocialLink(/github\.com/i),
      youtube: findSocialLink(/youtube\.com/i),
    };

    // 5. Tech Stack Hints (based on scripts, resources, patterns)
    const techHints = detectTechHints();

    // 6. Buttons & CTA Elements
    const buttons = [];
    document.querySelectorAll('button, a[role="button"], a.btn, input[type="submit"], input[type="button"]').forEach(el => {
      const text = (el.innerText || el.value || '').trim();
      if (text && text.length < 40) {
        const isCta = /sign up|start|register|try|demo|free|get started|join/i.test(text);
        buttons.push({ text, type: isCta ? 'cta' : 'other' });
      }
    });

    // 7. Lead Forms
    const forms = [];
    document.querySelectorAll('form').forEach(el => {
      const inputs = Array.from(el.querySelectorAll('input')).map(i => i.getAttribute('type') || 'text');
      const hasEmail = inputs.includes('email');
      const hasPassword = inputs.includes('password');
      
      forms.push({
        fields: inputs,
        purpose: hasPassword ? 'auth' : (hasEmail ? 'lead_capture' : 'general'),
      });
    });

    // 8. Pricing indicators
    const hasPricingTable = document.querySelector('[class*="pricing"], [id*="pricing"], table[class*="price"]') !== null || 
                            /pricing|plans|pricing-table/i.test(document.body.innerHTML.slice(0, 15000));

    // 9. Customers Wall/Logos
    const logoWall = document.querySelectorAll('[class*="logo-wall"], [class*="customer-logos"], [class*="client-logos"] img, [class*="partner-logos"] img');
    const hasLogoWall = logoWall.length > 0;
    const logoWallCount = logoWall.length;

    // 10. Visible Text (Compressed)
    const visibleText = getCleanBodyText();

    return {
      url,
      domain,
      meta,
      headings,
      navigation: {
        main_nav: dedupeLinks([...mainNav, ...priorityLinks]).slice(0, 60),
        footer_links: footerLinks.slice(0, 60),
      },
      social_links: socialLinks,
      tech_hints: techHints,
      visible_text: visibleText,
      buttons: buttons.slice(0, 10),
      forms: forms.slice(0, 5),
      has_pricing_table: hasPricingTable,
      has_logo_wall: hasLogoWall,
      logo_wall_count: logoWallCount,
    };
  }

  // --- Helper Functions ---

  function getMetaContent(name) {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el ? el.getAttribute('content') : null;
  }

  function getCanonicalUrl() {
    const el = document.querySelector('link[rel="canonical"]');
    return el ? el.getAttribute('href') : null;
  }

  function resolveUrl(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch {
      return href;
    }
  }

  function getElementsText(selector) {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.map(el => el.innerText.trim()).filter(Boolean);
  }

  function findSocialLink(regex) {
    const el = Array.from(document.querySelectorAll('a')).find(a => regex.test(a.href));
    return el ? el.href : null;
  }

  function dedupeLinks(links) {
    const seen = new Set();
    return links.filter(link => {
      const key = (link.href || '').split('#')[0].replace(/\/$/, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractSchemaOrg() {
    const schemas = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const json = JSON.parse(script.innerHTML);
        if (json) {
          const arr = Array.isArray(json) ? json : [json];
          schemas.push(...arr.filter(item => item && (item['@type'] || item['@context'])));
        }
      } catch {}
    });
    return schemas.slice(0, 5); // Max 5 schemas
  }

  function detectTechHints() {
    const frameworks = [];
    const analytics = [];
    const payment = [];
    let cms = null;

    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || '').join(' ');
    const html = document.documentElement.innerHTML.slice(0, 30000);

    // Framework detection
    if (window.React || html.includes('_next/') || html.includes('__NEXT_DATA__')) frameworks.push('React/Next.js');
    if (window.Vue || html.includes('v-')) frameworks.push('Vue');
    if (html.includes('wp-content') || html.includes('wp-includes')) {
      frameworks.push('WordPress');
      cms = 'WordPress';
    }
    if (html.includes('webflow')) {
      frameworks.push('Webflow');
      cms = 'Webflow';
    }

    // Analytics detection
    if (scripts.includes('google-analytics.com') || scripts.includes('gtag') || window.ga) analytics.push('Google Analytics');
    if (scripts.includes('hotjar') || window.hj) analytics.push('Hotjar');
    if (scripts.includes('hubspot') || window.HubSpotConversations) analytics.push('Hubspot');
    if (scripts.includes('segment.com') || window.analytics) analytics.push('Segment');

    // Payment detection
    if (scripts.includes('stripe') || window.Stripe) payment.push('Stripe');
    if (html.includes('paypal') || scripts.includes('paypal')) payment.push('PayPal');

    return {
      frameworks: [...new Set(frameworks)],
      analytics: [...new Set(analytics)],
      cms,
      payment: [...new Set(payment)],
    };
  }

  function getCleanBodyText() {
    // Remove scripts, styles, noscripts, iframes, SVGs, navs, footers
    const docClone = document.documentElement.cloneNode(true);
    docClone.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header').forEach(el => el.remove());
    
    const text = docClone.innerText || docClone.textContent || '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .slice(0, 15000); // 15KB max per page
  }
})();
