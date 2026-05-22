// ============================================================
// Side Panel Controller — Full data rendering
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const researchBtn = document.getElementById('research-btn');
  const welcomePanel = document.getElementById('welcome-panel');
  const loadingPanel = document.getElementById('loading-panel');
  const contentPanel = document.getElementById('content-panel');
  const loadingTitle = document.getElementById('loading-title');
  const loadingStatus = document.getElementById('loading-status');

  // --- Tab System ---
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');
    });
  });

  // --- Research Click ---
  researchBtn.addEventListener('click', async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.url) return;

    try {
      const urlObj = new URL(activeTab.url);
      const domain = urlObj.hostname.replace('www.', '');

      showLoading('Checking Server Cache...', 'Querying global intel database...');

      chrome.runtime.sendMessage({
        type: 'START_RESEARCH',
        domain: domain,
        tabId: activeTab.id
      }, (response) => {
        if (chrome.runtime.lastError) {
          showError('Extension communication error: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.ok) {
          renderReport(response.data);
        } else {
          showError(response?.error || 'Research pipeline failed.');
        }
      });

    } catch (err) {
      showError(err.message);
    }
  });

  // --- Status Broadcasts ---
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'RESEARCH_STATUS') {
      const statusMap = {
        checking_cache: { title: 'Verifying Cache...', desc: 'Checking global database for existing research...' },
        extracting: { title: 'Extracting Signals...', desc: 'Reading DOM structure, pricing metadata, and script headers...' },
        enriching_social: { title: 'Enriching Socials...', desc: 'Scraping recent posts from LinkedIn and Twitter/X...' },
        crawling_pages: { title: 'Crawling Priority Pages...', desc: `Opening internal pages for pricing, careers, integrations, security, docs, and customer signals${message.pageCount ? ` (${message.pageCount} collected)` : ''}...` },
        analyzing: { title: 'AI Synthesis Active...', desc: 'Synthesizing company intelligence via the configured AI provider...' },
        cache_hit: { title: 'Cache Hit! ⚡', desc: 'Fetching company facts from global cache instantly...' },
      };
      const step = statusMap[message.status];
      if (step) showLoading(step.title, step.desc);
    }
  });

  // --- UI State Helpers ---

  function showLoading(title, desc) {
    welcomePanel.classList.add('hidden');
    contentPanel.classList.add('hidden');
    loadingPanel.classList.remove('hidden');
    loadingTitle.textContent = title;
    loadingStatus.textContent = desc;
    researchBtn.disabled = true;
  }

  function showError(msg) {
    loadingPanel.classList.add('hidden');
    contentPanel.classList.add('hidden');
    welcomePanel.classList.remove('hidden');
    researchBtn.disabled = false;
    // Show inline error instead of alert
    welcomePanel.innerHTML = `
      <h3 style="color: var(--danger);">Pipeline Error</h3>
      <p style="color: var(--text-muted); font-size: 12px;">${escapeHtml(msg)}</p>
      <button id="retry-btn" class="action-btn" style="margin-top: 8px;">Try Again</button>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      welcomePanel.innerHTML = `
        <h3>Sales Prospecting Active 🎯</h3>
        <p style="color: var(--text-muted); font-size: 13px;">Navigate to any B2B website and click "Research Page" to generate a full sales brief.</p>
      `;
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Full Report Renderer ---

  function renderReport(report) {
    loadingPanel.classList.add('hidden');
    welcomePanel.classList.add('hidden');
    contentPanel.classList.remove('hidden');
    researchBtn.disabled = false;

    const base = report.base_intel || {};
    const personalized = report.personalized;

    // ---- Company Header ----
    const companyName = base.summary_1_line
      ? base.summary_1_line.split(' ').slice(0, 2).join(' ')
      : report.domain;
    document.getElementById('comp-logo').textContent = companyName[0]?.toUpperCase() || '?';
    document.getElementById('comp-name').textContent = companyName;
    document.getElementById('comp-meta').textContent = [
      base.industry || 'Technology',
      base.growth_stage || 'growth',
      base.employee_estimate ? `${base.employee_estimate} employees` : '',
    ].filter(Boolean).join(' · ');
    document.getElementById('comp-summary').textContent = base.summary_paragraph || base.summary_1_line || '';

    // Cache badge
    const badge = document.getElementById('cache-badge');
    if (report.is_degraded) {
      badge.textContent = 'Degraded';
      badge.className = 'badge badge-degraded';
    } else if (report.cached) {
      badge.textContent = 'Cached';
      badge.className = 'badge badge-cache';
    } else {
      badge.textContent = 'Fresh';
      badge.className = 'badge badge-fresh';
    }

    // ---- Overview Tab ----
    renderTechStack(base.tech_stack || []);
    renderList('pains-list', (base.pain_points || []).map(p => `<strong>${p.pain}:</strong> ${p.why}`));
    renderList('growth-list', (base.growth_signals || []).map(g => `<strong>${g.signal}:</strong> ${g.evidence}`));

    // ---- Signals Tab ----
    renderSignals(base.growth_signals || []);

    // ---- People Tab ----
    renderPeople(base.decision_makers_likely || []);

    // ---- Outreach Tab ----
    renderOutreach(personalized);

    // ---- More Tab ----
    renderMore(base);

    // ---- Timeline Tab ----
    renderTimeline(report.timeline_recent || []);

    // Reset to first tab
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    tabs[0]?.classList.add('active');
    document.getElementById('tab-intel')?.classList.add('active');
  }

  function renderTechStack(stack) {
    const container = document.getElementById('tech-list');
    container.innerHTML = '';
    if (stack.length > 0) {
      stack.forEach(tech => {
        const pill = document.createElement('span');
        pill.className = 'tech-pill';
        pill.textContent = tech;
        container.appendChild(pill);
      });
    } else {
      container.innerHTML = '<span style="color: var(--text-subtle); font-size: 12px;">No technologies detected.</span>';
    }
  }

  function renderList(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (items.length > 0) {
      items.forEach(html => {
        const li = document.createElement('li');
        li.innerHTML = html;
        container.appendChild(li);
      });
    } else {
      container.innerHTML = '<span style="color: var(--text-subtle); font-size: 12px;">None detected.</span>';
    }
  }

  function renderSignals(growthSignals) {
    const container = document.getElementById('signals-list');
    container.innerHTML = '';
    if (growthSignals.length === 0) {
      container.innerHTML = '<div style="color: var(--text-subtle); font-size: 12px; text-align: center; padding: 20px;">No signals detected.</div>';
      return;
    }
    growthSignals.forEach(g => {
      const row = document.createElement('div');
      row.className = 'signal-row';
      // Determine type from signal text
      const sig = (g.signal || '').toLowerCase();
      let type = 'product';
      if (sig.includes('fund') || sig.includes('invest') || sig.includes('raise')) type = 'funding';
      else if (sig.includes('hire') || sig.includes('hiring') || sig.includes('job')) type = 'hiring';
      else if (sig.includes('partner')) type = 'partnership';
      else if (sig.includes('award') || sig.includes('win') || sig.includes('rank')) type = 'award';

      const conf = g.confidence ? Math.round(g.confidence * 100) : null;
      row.innerHTML = `
        <span class="signal-type ${type}">${type}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 12px; font-weight: 600; color: var(--text);">${escapeHtml(g.signal)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(g.evidence)}</div>
          ${conf !== null ? `<div style="font-size: 10px; color: var(--text-subtle); margin-top: 3px;">Confidence: ${conf}%</div>` : ''}
        </div>
      `;
      container.appendChild(row);
    });
  }

  function renderPeople(decisionMakers) {
    const container = document.getElementById('people-list');
    container.innerHTML = '';
    if (decisionMakers.length === 0) {
      container.innerHTML = '<div style="color: var(--text-subtle); font-size: 12px; text-align: center; padding: 20px;">No decision makers identified.</div>';
      return;
    }
    decisionMakers.forEach(dm => {
      const card = document.createElement('div');
      card.className = 'person-card';
      const role = dm.role || dm.title || 'Unknown Role';
      const seniority = getSeniority(role);
      card.innerHTML = `
        <div class="person-name">${escapeHtml(role)}</div>
        <div class="person-title">${escapeHtml(dm.why || '')}</div>
        <span class="person-seniority seniority-${seniority}">${seniority.replace('_', ' ')}</span>
      `;
      container.appendChild(card);
    });
  }

  function getSeniority(role) {
    const r = role.toLowerCase();
    if (r.includes('founder') || r.includes('ceo') || r.includes('cto') || r.includes('cfo') || r.includes('chief') || r.includes('c-')) return 'c_level';
    if (r.includes('vp') || r.includes('vice president')) return 'vp';
    if (r.includes('director')) return 'director';
    if (r.includes('manager')) return 'manager';
    return 'individual';
  }

  function renderOutreach(personalized) {
    // ICP Score
    if (personalized) {
      const score = personalized.icp_match_score || 0;
      document.getElementById('icp-score-fill').style.width = `${score}%`;
      document.getElementById('icp-score-label').textContent = `${score}/100`;
      document.getElementById('icp-analysis').textContent = personalized.icp_match_reasoning || '';
    } else {
      document.getElementById('icp-score-fill').style.width = '0%';
      document.getElementById('icp-score-label').textContent = '—';
      document.getElementById('icp-analysis').textContent = 'Personalization not available.';
    }

    const hooksContainer = document.getElementById('hooks-container');
    hooksContainer.innerHTML = '';

    if (personalized?.top_3_hooks?.length > 0) {
      personalized.top_3_hooks.forEach((h, idx) => {
        const box = document.createElement('div');
        box.className = 'outreach-box';
        const channelLabel = { email: '📧 Email', linkedin: '💼 LinkedIn DM', call: '📞 Cold Call' }[h.channel] || h.channel;
        box.innerHTML = `
          <div class="outreach-header">
            <span>${channelLabel}</span>
            <button class="copy-btn" data-text="${encodeURIComponent(h.hook)}">Copy</button>
          </div>
          <div class="outreach-body">${escapeHtml(h.hook)}</div>
          ${h.why_it_works ? `<div style="font-size: 10px; color: var(--brand-glow); margin-top: 6px;">💡 ${escapeHtml(h.why_it_works)}</div>` : ''}
        `;
        hooksContainer.appendChild(box);
      });

      // Talking points
      if (personalized.talking_points?.length > 0) {
        const tpBox = document.createElement('div');
        tpBox.className = 'card';
        tpBox.innerHTML = `
          <div class="card-title">Talking Points</div>
          <ul>${personalized.talking_points.map(tp => `<li>${escapeHtml(tp)}</li>`).join('')}</ul>
        `;
        hooksContainer.appendChild(tpBox);
      }

      // Objections
      if (personalized.objections_anticipated?.length > 0) {
        const objBox = document.createElement('div');
        objBox.className = 'card';
        objBox.innerHTML = `
          <div class="card-title">Anticipated Objections</div>
          <ul>${personalized.objections_anticipated.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
        `;
        hooksContainer.appendChild(objBox);
      }

      // Copy button handlers
      hooksContainer.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const textToCopy = decodeURIComponent(e.target.dataset.text);
          navigator.clipboard.writeText(textToCopy).then(() => {
            const original = e.target.textContent;
            e.target.textContent = 'Copied!';
            setTimeout(() => { e.target.textContent = original; }, 1500);
          });
        });
      });
    } else {
      hooksContainer.innerHTML = '<div style="color: var(--text-subtle); font-size: 12px; text-align: center; padding: 16px;">No outreach hooks generated. Set up your AI preferences in the dashboard.</div>';
    }
  }

  function renderMore(base) {
    // Competitors
    const compCard = document.getElementById('competitors-card');
    const compList = document.getElementById('competitors-list');
    if (base.competitors?.length > 0) {
      compList.innerHTML = '';
      base.competitors.forEach(c => {
        const pill = document.createElement('span');
        pill.className = 'tech-pill';
        pill.textContent = c;
        compList.appendChild(pill);
      });
      compCard.style.display = '';
    } else {
      compCard.style.display = 'none';
    }

    // Hiring
    const hiringCard = document.getElementById('hiring-card');
    const hiringList = document.getElementById('hiring-list');
    if (base.hiring?.active_roles?.length > 0 || base.hiring?.team_growth_signals?.length > 0) {
      hiringList.innerHTML = '';
      const roles = base.hiring.active_roles || [];
      const signals = base.hiring.team_growth_signals || [];
      [...roles.map(r => `<strong>Open Role:</strong> ${r}`), ...signals].forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = item;
        hiringList.appendChild(li);
      });
      hiringCard.style.display = '';
    } else {
      hiringCard.style.display = 'none';
    }

    // Customers
    const custCard = document.getElementById('customers-card');
    const custList = document.getElementById('customers-list');
    const logos = base.customers?.logos || [];
    const cases = base.customers?.case_studies || [];
    if (logos.length > 0 || cases.length > 0) {
      custList.innerHTML = '';
      [...logos, ...cases].forEach(c => {
        const pill = document.createElement('span');
        pill.className = 'tech-pill';
        pill.textContent = c;
        custList.appendChild(pill);
      });
      custCard.style.display = '';
    } else {
      custCard.style.display = 'none';
    }

    // Recent News
    const newsCard = document.getElementById('news-card');
    const newsList = document.getElementById('news-list');
    if (base.recent_news?.length > 0) {
      newsList.innerHTML = '';
      base.recent_news.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n;
        newsList.appendChild(li);
      });
      newsCard.style.display = '';
    } else {
      newsCard.style.display = 'none';
    }

    // Risk Flags
    const riskCard = document.getElementById('risk-card');
    const riskList = document.getElementById('risk-list');
    const risks = (base.risk_flags || []).filter(r => !r.includes('degraded mode'));
    if (risks.length > 0) {
      riskList.innerHTML = '';
      risks.forEach(r => {
        const div = document.createElement('div');
        div.className = 'risk-item';
        div.textContent = r;
        riskList.appendChild(div);
      });
      riskCard.style.display = '';
    } else {
      riskCard.style.display = 'none';
    }
  }

  function renderTimeline(timeline) {
    const container = document.getElementById('timeline-list');
    container.innerHTML = '';
    if (timeline.length > 0) {
      timeline.forEach(entry => {
        const li = document.createElement('li');
        const date = new Date(entry.detected_at).toLocaleDateString();
        li.innerHTML = `<strong>[${date}]</strong> ${escapeHtml(entry.signal_type)} via ${escapeHtml(entry.source)}`;
        container.appendChild(li);
      });
    } else {
      container.innerHTML = '<span style="color: var(--text-subtle); font-size: 12px;">No signal history found.</span>';
    }
  }
});
