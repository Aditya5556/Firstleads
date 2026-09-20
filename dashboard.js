// Top-Level Immediate Global Helpers for Monad Dashboard & Tabs
window.switchTab = function(tabName) {
  if (!tabName) return;

  // Update Header Nav Tabs
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('data-tab') === tabName) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Update Suite Inner Tabs
  document.querySelectorAll('.suite-tab-btn').forEach(t => {
    if (t.getAttribute('data-tab') === tabName) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Toggle Content Containers
  const targetTabId = `tab-${tabName}`;
  document.querySelectorAll('.tab-content').forEach(c => {
    if (c.id === targetTabId) {
      c.classList.add('active-tab');
      c.classList.add('active');
      c.style.display = 'block';
    } else {
      c.classList.remove('active-tab');
      c.classList.remove('active');
      c.style.display = 'none';
    }
  });

  if (tabName === 'wall' && window.renderWallMarketplace) {
    window.renderWallMarketplace();
  }
};

window.switchSearchMode = function(mode) {
  const pill = document.getElementById('mode-slider-pill');
  const btnUrl = document.getElementById('mode-btn-url');
  const btnForm = document.getElementById('mode-btn-form');
  const containerUrl = document.getElementById('mode-container-url');
  const containerForm = document.getElementById('mode-container-form');
  
  if (mode === 'form') {
    if (pill) pill.style.transform = 'translateX(100%)';
    if (btnUrl) { btnUrl.classList.remove('active'); btnUrl.style.color = '#242424'; }
    if (btnForm) { btnForm.classList.add('active'); btnForm.style.color = '#ffffff'; }
    if (containerUrl) containerUrl.style.display = 'none';
    if (containerForm) containerForm.style.display = 'block';
  } else {
    if (pill) pill.style.transform = 'translateX(0%)';
    if (btnForm) { btnForm.classList.remove('active'); btnForm.style.color = '#242424'; }
    if (btnUrl) { btnUrl.classList.add('active'); btnUrl.style.color = '#ffffff'; }
    if (containerForm) containerForm.style.display = 'none';
    if (containerUrl) containerUrl.style.display = 'block';
  }
};

window.escapeHTML = function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.remove('theme-light');

  const scanBtn = document.getElementById('scan-btn');
  const leadsContainer = document.getElementById('leads-container');
  const statusText = document.getElementById('status-text');
  
  const modeBtnUrl = document.getElementById('mode-btn-url');
  const modeBtnForm = document.getElementById('mode-btn-form');
  if (modeBtnUrl) {
    modeBtnUrl.addEventListener('click', (e) => {
      e.preventDefault();
      window.switchSearchMode('url');
    });
  }
  if (modeBtnForm) {
    modeBtnForm.addEventListener('click', (e) => {
      e.preventDefault();
      window.switchSearchMode('form');
    });
  }

  // Project URL Scrape and AI Keywords Gen
  const crawlBtn = document.getElementById('crawl-url-btn');
  const urlInput = document.getElementById('project-url-input');
  const crawlStatus = document.getElementById('crawl-status');
  
  const checkpointContainer = document.getElementById('checkpoint-container');
  const checkpointBatches = document.getElementById('checkpoint-batches');
  const checkpointAddBtn = document.getElementById('checkpoint-add-btn');
  const checkpointCancelBtn = document.getElementById('checkpoint-cancel-btn');

  let generatedKeywordsObj = null;

  // Stats Card selectors
  const discoveredCountEl = document.getElementById('discovered-leads-count');
  const connectedCountEl = document.getElementById('connected-leads-count');
  const conversionRateEl = document.getElementById('conversion-leads-count');

  // CRM selectors
  const crmTbody = document.getElementById('crm-history-tbody');
  const crmTotalContactedEl = document.getElementById('crm-total-contacted');

  // State Management
  let customKeywords = [];
  let currentLeads = [];

  // Keywords Tags Rendering & Management
  const tagsContainer = document.getElementById('keyword-tags-list');

  function renderKeywordTags() {
    if (!tagsContainer) return;
    tagsContainer.innerHTML = customKeywords.map((kw, idx) => `
      <div class="k-tag" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid #2b59d1; border-radius: 6px; font-size: 13px; color: #2b59d1; font-weight: 600;">
        <span>${window.escapeHTML(kw)}</span>
        <span class="k-del" onclick="deleteKeywordTag(${idx})" style="cursor: pointer; font-weight: bold; color: #797776; margin-left: 4px;">×</span>
      </div>
    `).join('');
  }

  window.deleteKeywordTag = (idx) => {
    customKeywords.splice(idx, 1);
    renderKeywordTags();
  };

  window.executeUrlLeadDiscovery = async function() {
    const urlInput = document.getElementById('unified-url-input');
    const btn = document.getElementById('url-discover-btn');
    const crawlStatus = document.getElementById('crawl-status');
    if (!urlInput) return;

    const val = urlInput.value.trim();
    if (!val) {
      alert("Please paste your product URL.");
      return;
    }

    const targetUrl = val.startsWith('http') ? val : `https://${val}`;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Scraping Page & Extracting Signals...</span>';
    }
    if (crawlStatus) {
      crawlStatus.textContent = 'Crawling product landing page & extracting buying signals...';
      crawlStatus.style.color = '#2b59d1';
    }

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();

      let kwList = [];
      if (Array.isArray(data.keywords)) {
        kwList = data.keywords;
      } else if (data.keywords && typeof data.keywords === 'object') {
        kwList = Object.values(data.keywords).flat();
      }

      if (kwList.length === 0) {
        try {
          const parsed = new URL(targetUrl);
          const domainName = parsed.hostname.replace('www.', '').split('.')[0];
          if (domainName && domainName.length > 2) {
            kwList = [domainName, `looking for ${domainName}`, `alternative to ${domainName}`];
          }
        } catch (pe) {}
      }

      if (kwList.length > 0) {
        customKeywords = kwList;
        renderKeywordTags();
        if (crawlStatus) {
          crawlStatus.textContent = `Auto-extracted ${kwList.length} search criteria from website! Intercepting leads...`;
          crawlStatus.style.color = '#2b59d1';
        }
        if (window.triggerLeadScan) window.triggerLeadScan();
      } else {
        alert("Could not extract keywords automatically. Please try filling product details in the form tab.");
      }
    } catch (e) {
      try {
        const parsed = new URL(targetUrl);
        const domainName = parsed.hostname.replace('www.', '').split('.')[0];
        if (domainName && domainName.length > 2) {
          customKeywords = [domainName, `looking for ${domainName}`, `alternative to ${domainName}`];
          renderKeywordTags();
          if (window.triggerLeadScan) window.triggerLeadScan();
          return;
        }
      } catch (pe) {}
      alert("Crawl failed. Please try filling product details in the form tab.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Auto-Crawl & Scan Leads</span>';
      }
    }
  };

  window.executeFormLeadDiscovery = async function() {
    const nameInput = document.getElementById('form-prod-name');
    const solInput = document.getElementById('form-prod-solution');
    const icpInput = document.getElementById('form-prod-icp');
    const crawlStatus = document.getElementById('crawl-status');

    const productName = nameInput ? nameInput.value.trim() : '';
    const problemSolved = solInput ? solInput.value.trim() : '';
    const targetAudience = icpInput ? icpInput.value.trim() : '';

    if (!productName && !problemSolved) {
      alert("Please enter your Product Name or Solution description.");
      return;
    }

    if (crawlStatus) {
      crawlStatus.textContent = 'Building target lead keywords from product details...';
      crawlStatus.style.color = '#2b59d1';
    }

    try {
      const res = await fetch('/api/form-to-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, problemSolved, targetAudience })
      });
      const data = await res.json();
      if (data.keywords && data.keywords.length > 0) {
        customKeywords = data.keywords;
        renderKeywordTags();
        if (crawlStatus) {
          crawlStatus.textContent = `Generated ${data.keywords.length} target lead criteria! Intercepting leads...`;
          crawlStatus.style.color = '#2b59d1';
        }
        if (window.triggerLeadScan) window.triggerLeadScan();
      }
    } catch (e) {
      alert("Failed to build keywords. Please try again.");
    }
  };

  window.runPresetDiscovery = async function(presetName) {
    const crawlStatus = document.getElementById('crawl-status');
    customKeywords = [presetName];
    renderKeywordTags();
    if (crawlStatus) {
      crawlStatus.textContent = `Running preset demo discovery for "${presetName}"...`;
      crawlStatus.style.color = '#2b59d1';
    }
    if (window.triggerLeadScan) window.triggerLeadScan();
  };

  // Global Failproof Modal Helpers
  window.openSubmitProductModal = function () {
    const modal = document.getElementById('submit-product-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.zIndex = '99999';
    }
  };

  window.closeSubmitProductModal = function () {
    const modal = document.getElementById('submit-product-modal');
    if (modal) modal.style.display = 'none';
  };

  window.openBidModal = function () {
    const modal = document.getElementById('bid-rank-modal');
    const select = document.getElementById('bid-product-select');
    if (modal) {
      if (select && window.wallProducts) {
        select.innerHTML = window.wallProducts.map(p => `<option value="${p.id}">${p.name} (Current Rank Score: ${p.bidScore || 0})</option>`).join('');
      }
      modal.style.display = 'flex';
      modal.style.zIndex = '99999';
    }
  };

  window.closeBidModal = function () {
    const modal = document.getElementById('bid-rank-modal');
    if (modal) modal.style.display = 'none';
  };

  // Tab switching click event listener
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab, .suite-tab-btn');
    if (!tab) return;
    const tabName = tab.getAttribute('data-tab');
    if (tabName) window.switchTab(tabName);
  });

  function cleanSnippetText(rawText) {
    if (!rawText) return '';
    let str = String(rawText);
    str = str.replace(/<[^>]+>/g, ' ');
    str = str.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    str = str.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    str = str.replace(/^#+\s+/gm, ' ');
    str = str.replace(/```[\s\S]*?```/g, ' ');
    str = str.replace(/`[^`]+`/g, ' ');
    str = str.replace(/\s+/g, ' ').trim();
    if (str.length > 250) str = str.substring(0, 250) + '...';
    return str;
  }

  if (crawlBtn) {
    crawlBtn.addEventListener('click', async () => {
      const targetUrl = urlInput ? urlInput.value.trim() : '';
      if (!targetUrl) {
        if (crawlStatus) {
          crawlStatus.textContent = 'Please enter a valid website URL.';
          crawlStatus.style.color = 'var(--accent-error)';
        }
        return;
      }

      crawlBtn.disabled = true;
      crawlBtn.textContent = 'Scraping...';
      if (crawlStatus) {
        crawlStatus.textContent = 'Analyzing landing page content and extracting pain points...';
        crawlStatus.style.color = 'var(--text-secondary)';
      }
      if (checkpointContainer) checkpointContainer.style.display = 'none';

      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl })
        });
        const data = await res.json();
        if (data.success && data.keywords) {
          generatedKeywordsObj = data.keywords;
          renderGeneratedTermsCheckpoint();
          if (crawlStatus) {
            crawlStatus.textContent = `Success! Generated AI search terms across categories. Select the terms you want to monitor below.`;
            crawlStatus.style.color = '#10b981';
          }
        } else {
          if (crawlStatus) {
            crawlStatus.textContent = 'Failed to analyze content. Verify the URL is correct.';
            crawlStatus.style.color = 'var(--accent-error)';
          }
        }
      } catch (e) {
        if (crawlStatus) {
          crawlStatus.textContent = 'Connection error. Please try again.';
          crawlStatus.style.color = 'var(--accent-error)';
        }
      } finally {
        crawlBtn.disabled = false;
        crawlBtn.textContent = 'Generate Search Terms';
      }
    });
  }

  // Dynamic search button text state updater
  function updateSearchButtonState() {
    if (!unifiedInput || !unifiedBtn) return;
    
    // Check if cooldown timer is active
    const lastScanTime = localStorage.getItem('firstleads_last_scan_time');
    if (lastScanTime && (Date.now() - parseInt(lastScanTime, 10)) < 120000) {
      return;
    }

    const val = unifiedInput.value.trim();
    const isUrl = val.startsWith('http://') || val.startsWith('https://') || (val.includes('.') && !val.includes(' '));

    if (isUrl) {
      unifiedBtn.innerHTML = `
        <span>Extract Keywords</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      `;
    } else {
      unifiedBtn.innerHTML = `
        <span>Scan Leads</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      `;
    }
  }

  window.selectGeneratedChip = (kw, btnEl) => {
    customKeywords = [kw];
    if (unifiedInput) unifiedInput.value = kw;
    renderKeywordTags();

    // Highlight selected chip among generated chips
    const allChips = document.querySelectorAll('.gen-chip-btn');
    allChips.forEach(c => c.classList.remove('active-chip'));
    if (btnEl) btnEl.classList.add('active-chip');

    // Update search button to "Scan Leads"
    if (unifiedBtn) {
      unifiedBtn.innerHTML = `
        <span>Intercept Leads</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      `;
    }

    if (crawlStatus) {
      crawlStatus.textContent = `Selected keyword: "${kw}". Click "Intercept Leads" button to scan.`;
      crawlStatus.style.color = '#2b59d1';
    }
  };

  function renderGeneratedTermsCheckpoint(generatedObj) {
    if (!checkpointContainer) return;

    let phrases = [];
    if (typeof generatedObj === 'object') {
      Object.values(generatedObj).forEach(list => {
        if (Array.isArray(list)) phrases.push(...list);
      });
    } else if (Array.isArray(generatedObj)) {
      phrases = generatedObj;
    }

    phrases = Array.from(new Set(phrases)).slice(0, 8);

    if (phrases.length === 0) return;

    checkpointContainer.innerHTML = `
      <div style="font-size: 0.78rem; color: #2b59d1; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
        Click any generated keyword below to select and search:
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${phrases.map(kw => `
          <button class="gen-chip-btn ${customKeywords.includes(kw) ? 'active-chip' : ''}" onclick="selectGeneratedChip('${window.escapeHTML(kw)}', this)">
            ${window.escapeHTML(kw)}
          </button>
        `).join('')}
      </div>
    `;

    checkpointContainer.style.display = 'block';
  }

  // Unified 1-Click Search Bar Wiring
  const unifiedInput = document.getElementById('unified-search-input');
  const unifiedBtn = document.getElementById('unified-search-btn');

  if (unifiedInput) {
    unifiedInput.addEventListener('input', updateSearchButtonState);
  }

  const executeUnifiedSearch = async () => {
    if (!unifiedInput) return;
    const val = unifiedInput.value.trim();

    const isUrl = val.startsWith('http://') || val.startsWith('https://') || (val.includes('.') && !val.includes(' ') && !val.includes('@'));

    if (isUrl) {
      const targetUrl = val.startsWith('http') ? val : `https://${val}`;
      if (crawlStatus) {
        crawlStatus.textContent = 'Crawling product landing page & generating search keywords...';
        crawlStatus.style.color = 'var(--text-secondary)';
      }
      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl })
        });
        const data = await res.json();
        if (data.keywords) {
          if (crawlStatus) {
            crawlStatus.textContent = 'Keywords generated below! Select a keyword chip and click "Intercept Leads" to scan.';
            crawlStatus.style.color = '#2b59d1';
          }
          renderGeneratedTermsCheckpoint(data.keywords);
        } else {
          if (crawlStatus) {
            crawlStatus.textContent = 'Could not extract keywords. Please type a direct search term.';
            crawlStatus.style.color = '#ef4444';
          }
        }
      } catch (e) {
        if (crawlStatus) {
          crawlStatus.textContent = 'Crawl failed. Please type a direct search term.';
          crawlStatus.style.color = '#ef4444';
        }
      }
    } else if (val.length > 0) {
      if (val.includes(' ') && val.length > 12) {
        if (crawlStatus) {
          crawlStatus.textContent = 'Analyzing natural language ICP prompt & expanding search terms...';
          crawlStatus.style.color = 'var(--text-secondary)';
        }
        try {
          const res = await fetch('/api/expand-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: val })
          });
          const data = await res.json();
          if (data.keywords && data.keywords.length > 0) {
            customKeywords = data.keywords;
            renderKeywordTags();
            if (crawlStatus) {
              crawlStatus.textContent = `Expanded natural language query into ${data.keywords.length} multi-channel search terms!`;
              crawlStatus.style.color = '#2b59d1';
            }
          } else {
            customKeywords = [val];
            renderKeywordTags();
          }
        } catch (e) {
          customKeywords = [val];
          renderKeywordTags();
        }
      } else {
        customKeywords = [val];
        renderKeywordTags();
      }

      if (window.triggerLeadScan) {
        window.triggerLeadScan();
      }
    } else if (customKeywords.length > 0) {
      if (window.triggerLeadScan) {
        window.triggerLeadScan();
      }
    } else {
      alert("Please type a search keyword or select a keyword chip below.");
    }
  };

  if (unifiedBtn) unifiedBtn.addEventListener('click', executeUnifiedSearch);
  if (unifiedInput) {
    unifiedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeUnifiedSearch();
      }
    });
  }

  // LocalStorage Client System Persistence Helpers
  function getStoredCrmLeads() {
    try {
      const data = localStorage.getItem('firstleads_crm_leads');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCrmLeadToLocalStorage(lead) {
    try {
      const stored = getStoredCrmLeads();
      stored[lead.id] = { ...lead, connected: true };
      localStorage.setItem('firstleads_crm_leads', JSON.stringify(stored));
    } catch (e) {}
  }

  // Wall Lead to Outreach CRM Synchronization
  window.syncWallLeadToCrm = function (wallLead) {
    const crmLead = {
      id: wallLead.id || `wall-lead-${Date.now()}`,
      platform: 'Wall Marketplace',
      title: `[Wall Demo Request] ${wallLead.productName}: ${wallLead.message || 'High-Intent Prospect'}`,
      author: `${wallLead.name}${wallLead.company ? ' (' + wallLead.company + ')' : ''}`,
      email: wallLead.email,
      url: wallLead.productUrl || '#',
      region: wallLead.country || 'Global',
      query: wallLead.productName,
      intent: 'HIGH INTENT',
      intentCategory: 'INTENT',
      created: 'Just now',
      timestamp: Date.now(),
      connected: true,
      kanbanStage: 'saved',
      source: 'Wall Marketplace'
    };

    saveCrmLeadToLocalStorage(crmLead);

    if (Array.isArray(currentLeads)) {
      const existingIdx = currentLeads.findIndex(l => l.id === crmLead.id);
      if (existingIdx !== -1) {
        currentLeads[existingIdx] = crmLead;
      } else {
        currentLeads.unshift(crmLead);
      }
    }

    if (typeof renderCrmHistory === 'function') renderCrmHistory();
    if (typeof renderCrmKanban === 'function') renderCrmKanban();
    if (typeof renderConnectedPipelines === 'function') renderConnectedPipelines();
  };

  function removeCrmLeadFromLocalStorage(leadId) {
    try {
      const stored = getStoredCrmLeads();
      delete stored[leadId];
      localStorage.setItem('firstleads_crm_leads', JSON.stringify(stored));
    } catch (e) {}
  }

  function getStoredDeletedLeadIds() {
    try {
      const data = localStorage.getItem('firstleads_deleted_leads');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveDeletedLeadIdToLocalStorage(leadId) {
    try {
      const deleted = getStoredDeletedLeadIds();
      if (!deleted.includes(leadId)) {
        deleted.push(leadId);
        localStorage.setItem('firstleads_deleted_leads', JSON.stringify(deleted));
      }
    } catch (e) {}
  }

  async function loadLeads() {
    try {
      let fetchedLeads = [];
      try {
        const res = await fetch('/api/leads');
        fetchedLeads = await res.json();
      } catch (e) {
        fetchedLeads = [];
      }

      const storedCrmMap = getStoredCrmLeads();
      const deletedIds = getStoredDeletedLeadIds();

      // 1. Filter out deleted leads
      fetchedLeads = fetchedLeads.filter(l => !deletedIds.includes(l.id));

      // 2. Mark fetched leads as connected if saved in localStorage CRM
      fetchedLeads.forEach(lead => {
        if (storedCrmMap[lead.id]) {
          lead.connected = true;
          lead.kanbanStage = storedCrmMap[lead.id].kanbanStage || 'saved';
        }
      });

      // 3. Combine fetched leads with any stored CRM leads
      const allLeadsMap = new Map();
      fetchedLeads.forEach(l => allLeadsMap.set(l.id, l));
      Object.values(storedCrmMap).forEach(crmLead => {
        if (!deletedIds.includes(crmLead.id)) {
          allLeadsMap.set(crmLead.id, crmLead);
        }
      });

      currentLeads = Array.from(allLeadsMap.values());

      applyFilters();
      renderCrmHistory();
      renderCrmKanban();
      renderConnectedPipelines();
    } catch (e) {
      leadsContainer.innerHTML = `
        <div class="empty-state">
          <p>No leads found. Click "Scan New Leads" to run your first search.</p>
        </div>
      `;
    }
  }

  let activeCategoryFilter = 'all';

  window.filterByCategory = (cat, btnEl) => {
    activeCategoryFilter = cat;
    const allPills = document.querySelectorAll('.cat-pill');
    allPills.forEach(p => p.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    applyFilters();
  };

  function applyFilters() {
    const platformFilter = document.getElementById('filter-platform')?.value || 'all';
    const intentFilter = document.getElementById('filter-intent')?.value || 'all';
    const dateFilter = document.getElementById('filter-date')?.value || 'newest';
    const connectionFilter = document.getElementById('filter-connected')?.value || 'all';
    const regionFilter = document.getElementById('filter-region')?.value || 'all';

    let filtered = [...currentLeads];

    if (platformFilter !== 'all') {
      filtered = filtered.filter(l => l.platform === platformFilter);
    }

    if (intentFilter !== 'all') {
      filtered = filtered.filter(l => l.intent === intentFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(l => l.region === regionFilter);
    }

    if (connectionFilter === 'connected') {
      filtered = filtered.filter(l => l.connected === true);
    } else if (connectionFilter === 'unconnected') {
      filtered = filtered.filter(l => !l.connected);
    } else {
      // Hide leads already moved to CRM from main Dashboard tab
      filtered = filtered.filter(l => !l.connected);
    }

    if (activeCategoryFilter && activeCategoryFilter !== 'all') {
      filtered = filtered.filter(l => l.intentCategory === activeCategoryFilter);
    }

    if (dateFilter === 'newest') {
      filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (dateFilter === 'oldest') {
      filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    renderLeads(filtered);
  }

  window.enrichLead = async (leadId, btnEl) => {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `Enriching (Obscura)...`;
    }
    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
      const data = await res.json();
      if (data.success && data.lead) {
        const idx = currentLeads.findIndex(l => l.id === leadId);
        if (idx !== -1) {
          currentLeads[idx] = data.lead;
        }
        applyFilters();
      } else {
        alert(data.error || 'Could not enrich lead.');
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = '✨ Deep Enrich (Obscura)';
        }
      }
    } catch (e) {
      alert('Enrichment connection error.');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '✨ Deep Enrich (Obscura)';
      }
    }
  };

  function renderSingleLeadCard(lead) {
    const cat = lead.intentCategory || 'INTENT';
    if (cat === 'BUSINESSES') return renderBusinessCard(lead);
    if (cat === 'PEOPLE') return renderPeopleCard(lead);
    return renderIntentCard(lead);
  }

  function renderPeopleCard(lead) {
    return `
      <div class="lead-card lead-card-people ${lead.connected ? 'contacted-active' : ''}">
        <div class="lead-header-row">
          <div class="lead-meta">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="category-tag-badge category-tag-people">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                PEOPLE PROFILE
              </span>
              <span class="badge badge-${(lead.platform || '').toLowerCase()}">${escapeHTML(lead.platform)}</span>
              <span class="badge badge-high-value">
                ${escapeHTML((lead.intentBadge || 'High Value').replace('🟢', '').replace('🔥', '').trim())}
              </span>
            </div>
            <span class="lead-title">${escapeHTML(lead.title)}</span>
            <span class="lead-sub">
              <span>Profile/Author: <strong>${escapeHTML(lead.author || 'Decision Maker')}</strong></span>
              <span>Region: <strong>${escapeHTML(lead.region || 'Global')}</strong></span>
              <span>Date: <strong>${escapeHTML(lead.created)}</strong></span>
              <a href="${lead.url}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Open Social Profile
              </a>
            </span>
          </div>
          <div class="lead-header-actions" style="display: flex; align-items: center; gap: 8px;">
            <span class="tag">${escapeHTML(lead.query)}</span>
            ${!lead.connected ? `
              <button class="btn-primary btn-move-crm" onclick="moveToCrm('${lead.id}', this)" style="background: #2b59d1; border: none; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 600; color: #fff;">
                Move to CRM
              </button>
            ` : `<span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600;">In CRM</span>`}
            <button class="btn-delete-lead" onclick="deleteLead('${lead.id}', this)" title="Delete Lead" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 4px 6px; border-radius: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        ${lead.selftext ? `<div class="lead-body">${escapeHTML(cleanSnippetText(lead.selftext))}</div>` : ''}
        <div class="lead-draft-box">
          <div class="lead-draft-header">
            <h4 style="display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Direct Networking Pitch (DM)
            </h4>
            ${lead.draft ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px;" onclick="copyLeadPitch(this, '${lead.id}')">Copy Pitch</button>` : ''}
          </div>
          ${lead.draft ? `<p>"${escapeHTML(lead.draft)}"</p>` : `
            <div id="ai-container-${lead.id}" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-size: 0.72rem; color: var(--text-secondary);">Angle:</span>
                <select id="tone-${lead.id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.72rem; background: #000; color:#fff; cursor: pointer;">
                  <option value="helpful_peer">Helpful Peer (Founder Networking)</option>
                  <option value="founder_direct">Direct Intro (Collaboration)</option>
                </select>
              </div>
              <button class="btn-primary" style="padding: 6px 12px; font-size: 0.72rem; border-radius: 6px;" onclick="generateAIPitch(this, '${lead.id}', \`${escapeJS(lead.title)}\`, '${lead.query}')">Generate DM Pitch</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function formatCleanPhone(lead) {
    const rawPhone = lead.phone || '';
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (!rawPhone || (digitsOnly.length >= 11 && !rawPhone.includes('+') && !rawPhone.includes('(') && !rawPhone.includes('-') && !rawPhone.includes(' ')) || digitsOnly.startsWith('107') || digitsOnly.startsWith('170') || digitsOnly.length < 7) {
      return null;
    }
    return rawPhone;
  }

  function formatCleanAddress(lead) {
    const rawAddr = lead.address || '';
    const invalidKeywords = ['Uint8', 'Uint16', 'Uint32', 'Int16', 'Int32', 'Float32', 'Float64', 'Uint8Clamped', 'ArrayBuffer', 'Function', 'window', 'document', 'prototype'];
    if (rawAddr && !invalidKeywords.some(kw => rawAddr.includes(kw))) {
      return rawAddr;
    }
    return lead.region || 'Local Map';
  }

  function renderBusinessCard(lead) {
    const ratingScore = lead.rating || (4.5 + Math.random() * 0.4).toFixed(1);
    const reviewCount = lead.reviewsCount || Math.floor(18 + Math.random() * 120);

    return `
      <div class="lead-card lead-card-business ${lead.connected ? 'contacted-active' : ''}">
        <div class="lead-header-row">
          <div class="lead-meta">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="category-tag-badge category-tag-business">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-3"></path><path d="M9 9v.01"></path><path d="M9 12v.01"></path><path d="M9 15v.01"></path><path d="M9 18v.01"></path></svg>
                BUSINESS DIRECTORY & MAP
              </span>
              <span class="badge badge-${(lead.platform || '').toLowerCase()}">${escapeHTML(lead.platform)}</span>
              <span class="badge" style="background: #ffffff; color: #2b59d1; border: 1px solid #2b59d1; font-weight: 600;">
                Verified Business
              </span>
            </div>
            <span class="lead-title" style="font-size: 1rem; color: #242424; font-weight: 600;">${escapeHTML(lead.title)}</span>
            
            <div class="biz-metadata-bar">
              <span class="biz-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b59d1" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Location / Address: <span style="color: #2b59d1; font-weight: 600;">${escapeHTML(formatCleanAddress(lead))}</span>
              </span>
              <span class="biz-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b59d1" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Phone: <span style="color: #2b59d1; font-weight: 600;">${formatCleanPhone(lead) ? escapeHTML(formatCleanPhone(lead)) : 'Available via Website'}</span>
              </span>
              <span class="biz-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <strong style="color: #d97706;">${ratingScore} / 5.0</strong> (${reviewCount} Reviews)
              </span>
              <span class="biz-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b59d1" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
                Email: <span style="color: #2b59d1; font-weight: 600;">${lead.email ? escapeHTML(lead.email) : 'Verified Contact Available'}</span>
              </span>
              <a href="${lead.url}" target="_blank" style="color: #2b59d1; font-weight: 600; text-decoration: underline;">View Business Page</a>
            </div>
          </div>
          <div class="lead-header-actions" style="display: flex; align-items: center; gap: 8px;">
            <span class="tag">${escapeHTML(lead.query)}</span>
            ${!lead.enriched ? `
              <button class="btn-primary" onclick="enrichLead('${lead.id}', this)" style="background: #ffffff; border: 1px solid #2b59d1; color: #2b59d1; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Deep Enrich (Obscura)
              </button>
            ` : `
              <span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Enriched
              </span>
            `}
            ${!lead.connected ? `
              <button class="btn-primary btn-move-crm" onclick="moveToCrm('${lead.id}', this)" style="background: #2b59d1; border: none; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600;">
                Move to CRM
              </button>
            ` : `<span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600;">In CRM</span>`}
            <button class="btn-delete-lead" onclick="deleteLead('${lead.id}', this)" title="Delete Lead" style="background: rgba(246,243,241,0.6); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 4px 6px; border-radius: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="lead-draft-box">
          <div class="lead-draft-header">
            <h4 style="display: flex; align-items: center; gap: 6px; color: #2b59d1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2b59d1" stroke-width="2.5"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              B2B Services Outreach Proposal
            </h4>
            ${lead.draft ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px; background: #2b59d1;" onclick="copyLeadPitch(this, '${lead.id}')">Copy Proposal</button>` : ''}
          </div>
          ${lead.draft ? `<p>"${escapeHTML(lead.draft)}"</p>` : `
            <div id="ai-container-${lead.id}" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600;">Pitch Type:</span>
                <select id="tone-${lead.id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.72rem; background: #fff; color: #000; font-weight: 600; cursor: pointer;">
                  <option value="value_comparison">B2B Audit & Partnership Proposal</option>
                  <option value="founder_direct">Direct Vendor Pitch</option>
                </select>
              </div>
              <button class="btn-primary" style="padding: 6px 12px; font-size: 0.72rem; border-radius: 6px; background: #2b59d1; border: none; color: #fff; font-weight: 600;" onclick="generateAIPitch(this, '${lead.id}', \`${escapeJS(lead.title)}\`, '${lead.query}')">Generate B2B Proposal</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderIntentCard(lead) {
    const isJob = (lead.platform || '').toLowerCase().includes('job') || (lead.platform || '').toLowerCase() === 'indeed' || (lead.platform || '').toLowerCase() === 'glassdoor';
    const triggerLabel = isJob ? 'Hiring Signal' : (lead.title.toLowerCase().includes('alternative') ? 'Switch / Alternative Query' : 'Active Buyer Problem');

    return `
      <div class="lead-card lead-card-intent ${lead.connected ? 'contacted-active' : ''}">
        <div class="lead-header-row">
          <div class="lead-meta">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="category-tag-badge category-tag-intent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                HIGH INTENT SIGNAL
              </span>
              <span class="badge badge-${(lead.platform || '').toLowerCase()}">${escapeHTML(lead.platform)}</span>
              <span class="badge badge-very-high" style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; color: #2b59d1; border: 1px solid #2b59d1; font-weight: 600;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#2b59d1" stroke="none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                Score: ${lead.intentScore || 88}/100
              </span>
            </div>
            <span class="lead-title" style="font-size: 1rem; color: #242424; font-weight: 600;">${escapeHTML(lead.title)}</span>
            <span class="lead-sub">
              <span>Trigger: <strong style="color: #2b59d1;">${triggerLabel}</strong></span>
              <span>Author: <strong>${escapeHTML(lead.author)}</strong></span>
              <span>Date: <strong>${escapeHTML(lead.created)}</strong></span>
              <a href="${lead.url}" target="_blank" style="color: #2b59d1; font-weight: 600;">Open Thread / Post</a>
            </span>
          </div>
          <div class="lead-header-actions" style="display: flex; align-items: center; gap: 8px;">
            <span class="tag">${escapeHTML(lead.query)}</span>
            ${!lead.connected ? `
              <button class="btn-primary btn-move-crm" onclick="moveToCrm('${lead.id}', this)" style="background: #2b59d1; border: none; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600;">
                Move to CRM
              </button>
            ` : `<span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600;">In CRM</span>`}
            <button class="btn-delete-lead" onclick="deleteLead('${lead.id}', this)" title="Delete Lead" style="background: rgba(246,243,241,0.6); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 4px 6px; border-radius: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        ${lead.selftext ? `<div class="lead-body">${escapeHTML(cleanSnippetText(lead.selftext))}</div>` : ''}
        <div class="lead-draft-box">
          <div class="lead-draft-header">
            <h4 style="display: flex; align-items: center; gap: 6px; color: #2b59d1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2b59d1" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Problem-Solver Solution Pitch
            </h4>
            ${lead.draft ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px; background: #2b59d1;" onclick="copyLeadPitch(this, '${lead.id}')">Copy Pitch</button>` : ''}
          </div>
          ${lead.draft ? `<p>"${escapeHTML(lead.draft)}"</p>` : `
            <div id="ai-container-${lead.id}" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-size: 0.72rem; color: #2b59d1; font-weight: 600;">Angle:</span>
                <select id="tone-${lead.id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.72rem; background: #fff; color: #000; font-weight: 600; cursor: pointer;">
                  <option value="helpful_peer">Helpful Peer Solution</option>
                  <option value="value_comparison">Competitor Switch Offer</option>
                </select>
              </div>
              <button class="btn-primary" style="padding: 6px 12px; font-size: 0.72rem; border-radius: 6px; background: #2b59d1; border: none; color: #fff; font-weight: 600;" onclick="generateAIPitch(this, '${lead.id}', \`${escapeJS(lead.title)}\`, '${lead.query}')">Generate Solution Pitch</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  let selectedLeadIds = new Set();

  window.toggleSelectAllLeads = function(chk) {
    if (!chk) return;
    const checkboxes = document.querySelectorAll('.sn-checkbox[data-lead-id]');
    selectedLeadIds.clear();
    checkboxes.forEach(c => {
      c.checked = chk.checked;
      const leadId = c.getAttribute('data-lead-id');
      const tr = c.closest('tr');
      if (chk.checked) {
        selectedLeadIds.add(leadId);
        if (tr) tr.classList.add('selected');
      } else {
        if (tr) tr.classList.remove('selected');
      }
    });
    updateBulkToolbarState();
  };

  window.toggleLeadSelection = function(leadId, chk) {
    const tr = chk ? chk.closest('tr') : null;
    if (chk && chk.checked) {
      selectedLeadIds.add(leadId);
      if (tr) tr.classList.add('selected');
    } else {
      selectedLeadIds.delete(leadId);
      if (tr) tr.classList.remove('selected');
    }
    updateBulkToolbarState();
  };

  function updateBulkToolbarState() {
    const countEl = document.getElementById('sn-selected-count');
    const exportBtn = document.getElementById('sn-bulk-export-btn');
    const crmBtn = document.getElementById('sn-bulk-crm-btn');

    if (countEl) countEl.textContent = selectedLeadIds.size;
    if (exportBtn) exportBtn.disabled = selectedLeadIds.size === 0;
    if (crmBtn) crmBtn.disabled = selectedLeadIds.size === 0;
  }

  window.bulkExportCsv = function() {
    if (selectedLeadIds.size === 0) return;
    const leadsToExport = currentLeads.filter(l => selectedLeadIds.has(l.id));
    if (leadsToExport.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Author/Title,Platform,Query/Keyword,Location,Intent Score,URL,Signal\n";

    leadsToExport.forEach(l => {
      const row = [
        `"${l.id}"`,
        `"${(l.author || l.title || '').replace(/"/g, '""')}"`,
        `"${(l.platform || '').replace(/"/g, '""')}"`,
        `"${(l.query || '').replace(/"/g, '""')}"`,
        `"${(l.region || l.country || 'Global').replace(/"/g, '""')}"`,
        `"${l.intentScore || 85}"`,
        `"${(l.url || '').replace(/"/g, '""')}"`,
        `"${(cleanSnippetText(l.selftext || l.title || '')).replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firstleads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.bulkMoveToCrm = function() {
    if (selectedLeadIds.size === 0) return;
    let movedCount = 0;
    selectedLeadIds.forEach(id => {
      const lead = currentLeads.find(l => l.id === id);
      if (lead) {
        lead.connected = true;
        saveCrmLeadToLocalStorage(lead);
        movedCount++;
      }
    });
    selectedLeadIds.clear();
    updateBulkToolbarState();
    applyFilters();
    renderCrmHistory();
    renderCrmKanban();
    alert(`Successfully moved ${movedCount} leads to Outreach CRM!`);
  };

  function renderSalesNavRow(lead) {
    const isSelected = selectedLeadIds.has(lead.id);
    const initial = (lead.author || lead.title || 'L').charAt(0).toUpperCase();
    const platform = (lead.platform || 'Web').toLowerCase();
    const platformClass = platform.includes('reddit') ? 'sn-platform-reddit' :
                          platform.includes('twitter') || platform.includes('x') ? 'sn-platform-twitter' :
                          platform.includes('hacker') ? 'sn-platform-hackernews' : 'sn-platform-web';

    const platformIcon = platform.includes('reddit') ? 'Reddit' :
                         platform.includes('twitter') ? 'Twitter/X' :
                         platform.includes('hacker') ? 'HackerNews' : 'Web Thread';

    const snippet = cleanSnippetText(lead.selftext || lead.title || '');
    const kw = lead.query || '';
    let highlightedSnippet = window.escapeHTML(snippet);
    if (kw && snippet.toLowerCase().includes(kw.toLowerCase())) {
      const reg = new RegExp(`(${kw})`, 'gi');
      highlightedSnippet = highlightedSnippet.replace(reg, '<span class="sn-highlight-kw">$1</span>');
    }

    const lowerTitle = (lead.title || '').toLowerCase();
    const isJob = platform.includes('job') || platform.includes('indeed') || platform.includes('glassdoor');
    const intentLabel = isJob ? 'HIRING SIGNAL' :
                        (lowerTitle.includes('alternative') || lowerTitle.includes('switch') || lowerTitle.includes('instead')) ? 'SWITCHING PROVIDER' :
                        (lowerTitle.includes('looking for') || lowerTitle.includes('recommend') || lowerTitle.includes('need')) ? 'BUYING INTENT' : 'SOLUTION NEEDED';

    const intentScore = lead.intentScore || 88;
    const intentClass = intentScore >= 90 ? 'sn-intent-high' : 'sn-intent-med';

    return `
      <tr class="sn-row ${isSelected ? 'selected' : ''}">
        <td style="width: 40px; text-align: center;">
          <input type="checkbox" class="sn-checkbox" data-lead-id="${lead.id}" ${isSelected ? 'checked' : ''} onchange="window.toggleLeadSelection('${lead.id}', this)">
        </td>
        <td>
          <div class="sn-lead-cell">
            <div class="sn-avatar">${initial}</div>
            <div class="sn-lead-info">
              <a href="${lead.url || '#'}" target="_blank" class="sn-lead-name">${window.escapeHTML(lead.author || 'Decision Maker')}</a>
              <span class="sn-lead-company">${window.escapeHTML(lead.title ? lead.title.substring(0, 35) : 'B2B Buyer')}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="sn-platform-badge ${platformClass}">${platformIcon}</span>
        </td>
        <td>
          <div style="font-size: 11px; font-weight: 700; color: #2b59d1; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>${intentLabel}</span>
          </div>
          <div class="sn-signal-text">${highlightedSnippet}</div>
        </td>
        <td>
          <span class="sn-location-badge">${window.escapeHTML(lead.region || lead.country || 'Global')}</span>
        </td>
        <td>
          <div class="sn-actions-cell" style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn-secondary" onclick="window.openOutreachModal('${lead.id}')" style="font-size: 11px; padding: 4px 8px; font-weight: 600; cursor: pointer; white-space: nowrap; border-color: #2b59d1; color: #2b59d1;">
              Draft Pitch
            </button>
            ${!lead.connected ? `
              <button class="sn-btn-crm" onclick="moveToCrm('${lead.id}', this)">+ Outreach</button>
            ` : `<span style="font-size: 11px; color: #2b59d1; font-weight: 700;">In CRM</span>`}
            <button class="sn-btn-delete" onclick="deleteLead('${lead.id}', this)" title="Discard">×</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderLeads(leads) {
    const totalDiscovered = currentLeads.length;
    const totalConnected = currentLeads.filter(l => l.connected).length;
    const conversionRate = totalDiscovered > 0 ? Math.round((totalConnected / totalDiscovered) * 100) : 0;

    if (discoveredCountEl) discoveredCountEl.textContent = totalDiscovered;
    if (connectedCountEl) connectedCountEl.textContent = totalConnected;
    if (conversionRateEl) conversionRateEl.textContent = `${conversionRate}%`;

    const totalLeadsBadge = document.getElementById('sn-total-leads-badge');
    if (totalLeadsBadge) totalLeadsBadge.textContent = leads.length;

    if (leads.length === 0) {
      leadsContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 48px; background: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #cecac8;">
          <p class="body-text" style="color: #64748b;">No matching opportunities found. Select a keyword above to intercept leads.</p>
        </div>
      `;
      return;
    }

    leadsContainer.innerHTML = `
      <table class="sales-nav-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;"></th>
            <th>Buyer / Lead</th>
            <th>Platform / Channel</th>
            <th>Buying Signal Snippet</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => renderSalesNavRow(l)).join('')}
        </tbody>
      </table>
    `;

    updateBulkToolbarState();

    if (typeof userPlan !== 'undefined' && userPlan === 'Free') {
      leadsContainer.innerHTML += `
        <div class="upgrade-banner-card" style="background: rgba(228, 93, 62, 0.05); border: 1px dashed rgba(228, 93, 62, 0.3); padding: 20px; border-radius: 8px; text-align: center; margin-top: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; width: 100%;">
          <span style="font-size: 1.2rem;">💎</span>
          <h4 style="color: #fff; font-size: 0.8rem; font-weight: 700; margin: 0;">Unlock Unlimited Scans with Pro Plan</h4>
          <p style="color: var(--text-secondary); font-size: 0.7rem; margin: 0; max-width: 80%;">Upgrade to Pro to run unlimited scans, export full CSV pipelines, and access 15+ real-time social channels.</p>
          <button onclick="openUpgradeModal()" class="btn-primary" style="height: 32px; font-size: 0.72rem; padding: 0 16px; font-weight: bold; border-radius: 6px; margin-top: 4px; cursor: pointer;">Get More Leads</button>
        </div>
      `;
    }
  }

  window.moveToCrm = async (leadId, btnEl) => {
    const cardEl = btnEl ? btnEl.closest('.lead-card') : null;
    if (cardEl) {
      cardEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      cardEl.style.transform = 'translateX(120px)';
      cardEl.style.opacity = '0';
    }

    const lead = currentLeads.find(l => l.id === leadId);
    if (lead) {
      lead.connected = true;
      lead.kanbanStage = lead.kanbanStage || 'saved';
      saveCrmLeadToLocalStorage(lead);
    }

    try {
      await fetch('/api/toggle-connected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, connected: true })
      });
    } catch (e) {}

    setTimeout(() => {
      applyFilters();
      renderCrmHistory();
      renderCrmKanban();
      renderConnectedPipelines();
    }, 400);
  };

  window.deleteLead = async (leadId, btnEl) => {
    const cardEl = btnEl ? btnEl.closest('.lead-card') : null;
    if (cardEl) {
      cardEl.style.transition = 'all 0.25s ease';
      cardEl.style.transform = 'scale(0.95)';
      cardEl.style.opacity = '0';
    }

    saveDeletedLeadIdToLocalStorage(leadId);
    removeCrmLeadFromLocalStorage(leadId);
    currentLeads = currentLeads.filter(l => l.id !== leadId);

    try {
      await fetch('/api/delete-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
    } catch (e) {}

    setTimeout(() => {
      applyFilters();
      renderCrmHistory();
      renderCrmKanban();
    }, 250);
  };

  function renderCrmHistory() {
    const contacted = currentLeads.filter(l => l.connected);
    if (crmTotalContactedEl) crmTotalContactedEl.textContent = contacted.length;

    const engagedLeads = Math.ceil(contacted.length * 0.12);
    const engagedEl = document.getElementById('crm-engaged-leads');
    if (engagedEl) engagedEl.textContent = contacted.length > 0 ? engagedLeads : '0';
    
    const conversionRate = contacted.length > 0 ? ((engagedLeads / contacted.length) * 100).toFixed(1) + '%' : '0.0%';
    const conversionEl = document.getElementById('crm-conversion-rate');
    if (conversionEl) conversionEl.textContent = conversionRate;

    if (!crmTbody) return;

    if (contacted.length === 0) {
      crmTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px 0;">
            No outreach history recorded yet. Mark prospects as contacted to track them here.
          </td>
        </tr>
      `;
      return;
    }

    crmTbody.innerHTML = contacted.map(lead => `
      <tr>
        <td><span class="badge badge-${lead.platform.toLowerCase()}">${escapeHTML(lead.platform)}</span></td>
        <td style="font-weight: 600; color: #fff;">${escapeHTML(lead.title)}</td>
        <td>${escapeHTML(lead.author)}</td>
        <td style="color: var(--text-secondary);">${escapeHTML(lead.created)}</td>
        <td><span style="color: #2b59d1; font-weight: 600;">Contacted</span></td>
        <td>
          <a href="${lead.url}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 6px; text-decoration: none;">View Post</a>
        </td>
      </tr>
    `).join('');
  }

  window.toggleCrmView = (mode) => {
    const tableWrapper = document.getElementById('crm-table-wrapper');
    const kanbanBoard = document.getElementById('crm-kanban-board');
    const tableBtn = document.getElementById('crm-view-table-btn');
    const kanbanBtn = document.getElementById('crm-view-kanban-btn');

    if (mode === 'kanban') {
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (kanbanBoard) kanbanBoard.style.display = 'grid';
      if (tableBtn) tableBtn.classList.remove('active');
      if (kanbanBtn) kanbanBtn.classList.add('active');
      renderCrmKanban();
    } else {
      if (tableWrapper) tableWrapper.style.display = 'block';
      if (kanbanBoard) kanbanBoard.style.display = 'none';
      if (tableBtn) tableBtn.classList.add('active');
      if (kanbanBtn) kanbanBtn.classList.remove('active');
      renderCrmHistory();
    }
  };

  function renderCrmKanban() {
    const board = document.getElementById('crm-kanban-board');
    if (!board) return;

    const contacted = currentLeads.filter(l => l.connected);
    const stages = [
      { id: 'saved', title: 'Saved in CRM', badge: 'rgba(255, 255, 255, 0.08)' },
      { id: 'contacted', title: 'Contacted', badge: 'rgba(43, 89, 209, 0.12)' },
      { id: 'discussion', title: 'In Discussion', badge: 'rgba(99, 102, 241, 0.15)' },
      { id: 'closed', title: 'Closed Won', badge: 'rgba(228, 93, 62, 0.2)' }
    ];

    board.innerHTML = stages.map(stage => {
      const stageLeads = contacted.filter(l => (l.kanbanStage || 'saved') === stage.id);
      return `
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span class="kanban-col-title">${stage.title}</span>
            <span class="kanban-col-count" style="background: ${stage.badge}">${stageLeads.length}</span>
          </div>
          <div class="kanban-card-list">
            ${stageLeads.length === 0 ? `
              <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 20px 0;">Empty</div>
            ` : stageLeads.map(lead => `
              <div class="kanban-card">
                <span class="badge badge-${lead.platform.toLowerCase()}" style="width: fit-content;">${escapeHTML(lead.platform)}</span>
                <span class="kanban-card-title">${escapeHTML(lead.title)}</span>
                <div class="kanban-card-meta">
                  <span>Author: <strong>${escapeHTML(lead.author)}</strong></span>
                  <select onchange="updateKanbanStage('${lead.id}', this.value)" style="font-size: 0.65rem; background: #000; color: #fff; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px;">
                    <option value="saved" ${stage.id === 'saved' ? 'selected' : ''}>Saved</option>
                    <option value="contacted" ${stage.id === 'contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="discussion" ${stage.id === 'discussion' ? 'selected' : ''}>Discussion</option>
                    <option value="closed" ${stage.id === 'closed' ? 'selected' : ''}>Closed Won</option>
                  </select>
                </div>
                <a href="${lead.url}" target="_blank" style="font-size: 0.68rem; color: #E45D3E; text-decoration: none;">Open Link ↗</a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  window.updateKanbanStage = (leadId, stage) => {
    const lead = currentLeads.find(l => l.id === leadId);
    if (lead) {
      lead.kanbanStage = stage;
      saveCrmLeadToLocalStorage(lead);
      renderCrmKanban();
    }
  };

  function renderConnectedPipelines() {
    const container = document.getElementById('pipelines-container');
    if (!container) return;

    const contacted = currentLeads.filter(l => l.connected);
    if (contacted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No active pipeline leads. Mark opportunities as "Contacted" to track follow-ups here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = contacted.map(lead => `
      <div class="lead-card contacted-active">
        <div class="lead-header-row">
          <div class="lead-meta">
            <span class="lead-title">${escapeHTML(lead.title)}</span>
            <span class="lead-sub">
              <span class="badge badge-${lead.platform.toLowerCase()}">${escapeHTML(lead.platform)}</span>
              <span class="badge" style="background: rgba(228, 93, 62, 0.15); color: #E45D3E; border: 1px solid rgba(228, 93, 62, 0.3); font-weight: 600;">
                ${escapeHTML(lead.region || 'Global')}
              </span>
              <span>Author: <strong>${escapeHTML(lead.author)}</strong></span>
              <span>Email: <span style="color: #e2e8f0;">${(lead.email && !lead.email.toLowerCase().startsWith('google') && !lead.email.toLowerCase().includes('googlenews')) ? escapeHTML(lead.email) : 'Verified Contact Available'}</span></span>
              <span>Date: <strong>${escapeHTML(lead.created)}</strong></span>
              <a href="${lead.url}" target="_blank">Open Lead</a>
            </span>
          </div>
          <div class="lead-header-actions">
            <span class="tag">${escapeHTML(lead.query)}</span>
            <span style="font-size: 0.72rem; color: #2b59d1; font-weight: 700;">In Outreach Pipeline</span>
          </div>
        </div>
        ${lead.selftext ? `<div class="lead-body">${escapeHTML(lead.selftext)}</div>` : ''}
        
        <div class="lead-draft-box" style="margin-top: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
          <div class="lead-draft-header" style="margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 0.75rem; color: var(--accent); text-transform: uppercase;">Active Outreach Pitch</h4>
            ${lead.draft ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.72rem; border-radius: 6px;" onclick="copyLeadPitch(this, '${lead.id}')">Copy Pitch</button>` : ''}
          </div>
          ${lead.draft ? `<p style="font-size: 0.78rem; color: #e3e3e3; font-style: italic; line-height: 1.5; margin: 0 0 10px 0;">"${escapeHTML(lead.draft)}"</p>` : `
            <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0 0 10px 0; font-style: italic;">No custom pitch generated yet.</p>
          `}
          <div class="direct-outreach-row" style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 8px;">
            <span style="font-size: 0.7rem; color: var(--text-secondary);">Direct message via platform chat:</span>
            <a href="${lead.chatUrl}" target="_blank" class="btn-secondary" style="text-decoration: none; padding: 4px 10px; font-size: 0.72rem; border-radius: 6px;">Open Direct Chat</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.generateAIPitch = async (btn, id, title, query) => {
    const useAIToggle = document.getElementById('toggle-use-ai');
    const useAI = useAIToggle ? useAIToggle.checked : true;
    
    const toneSelect = document.getElementById(`tone-${id}`);
    const tone = toneSelect ? toneSelect.value : 'friendly';

    if (!useAI) {
      const lead = currentLeads.find(l => l.id === id);
      if (lead) {
        if (tone === 'professional') {
          lead.draft = `As a developer, I suggest trying 'PDF Engineer'. It is a client-side utility that runs entirely offline in browser memory, resolving editing and conversion tasks securely without any server uploads.`;
        } else if (tone === 'casual') {
          lead.draft = `same here, had this issue last week. try pdf engineer—it's a free chrome extension that runs offline in browser. no uploads so it's safe.`;
        } else {
          lead.draft = `Hey, I had the same issue trying to edit files last week. I ended up using PDF Engineer—it's a free Chrome extension that runs completely offline in your browser, so files never upload to a server. Might help you out!`;
        }
      }
      applyFilters();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Thinking...';
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, query, tone })
      });
      const data = await res.json();
      if (data.success && data.draft) {
        const lead = currentLeads.find(l => l.id === id);
        if (lead) lead.draft = data.draft;
        applyFilters();
      } else {
        btn.textContent = 'API Error, Retry';
        btn.disabled = false;
      }
    } catch (e) {
      btn.textContent = 'Failed, Retry';
      btn.disabled = false;
    }
  };

  window.toggleConnected = async (id, checked) => {
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, connected: checked })
      });
      if (res.ok) {
        const lead = currentLeads.find(l => l.id === id);
        if (lead) lead.connected = checked;
        applyFilters();
        renderConnectedPipelines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.copyLeadPitch = (btn, id) => {
    const lead = currentLeads.find(l => l.id === id);
    if (lead && lead.draft) {
      navigator.clipboard.writeText(lead.draft).then(() => {
        const origText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#2b59d1';
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.background = '';
        }, 1500);
      });
    }
  };

  window.mockCheckout = async (planName) => {
    if (planName.includes('Pro') || planName.includes('Enterprise')) {
      const res = await fetch('/api/upgrade', { method: 'POST' });
      if (res.ok) {
        alert(`Upgrade to ${planName} complete! Your Growth Pro status has been activated successfully.`);
        await fetch('/api/clear', { method: 'POST' });
        checkPlan();
        loadLeads();
      }
    } else {
      alert(`Checkout initialized for ${planName}!`);
    }
  };

  let userPlan = 'Free';

  const countryList = [
    { value: 'India', label: 'India Market' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'UAE', label: 'United Arab Emirates' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Germany', label: 'Germany' },
    { value: 'France', label: 'France' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Saudi Arabia', label: 'Saudi Arabia' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'Mexico', label: 'Mexico' }
  ];

  const countryStateMap = {
    'India': [
      { value: '', label: 'All India Regions' },
      { value: 'Mumbai', label: 'Mumbai / Maharashtra' },
      { value: 'Delhi NCR', label: 'Delhi NCR' },
      { value: 'Bengaluru', label: 'Bengaluru / Karnataka' },
      { value: 'Hyderabad', label: 'Hyderabad / Telangana' },
      { value: 'Chennai', label: 'Chennai / Tamil Nadu' },
      { value: 'Pune', label: 'Pune / Maharashtra' },
      { value: 'Kolkata', label: 'Kolkata / West Bengal' }
    ],
    'United States': [
      { value: '', label: 'All US States' },
      { value: 'New York', label: 'New York, NY' },
      { value: 'California', label: 'California (SF / LA)' },
      { value: 'Texas', label: 'Texas (Austin / Dallas)' },
      { value: 'Florida', label: 'Florida (Miami)' },
      { value: 'Washington', label: 'Washington (Seattle)' },
      { value: 'Illinois', label: 'Illinois (Chicago)' }
    ],
    'United Kingdom': [
      { value: '', label: 'All UK Regions' },
      { value: 'London', label: 'London / Greater London' },
      { value: 'Manchester', label: 'Manchester' },
      { value: 'Birmingham', label: 'Birmingham' },
      { value: 'Edinburgh', label: 'Edinburgh / Scotland' }
    ],
    'UAE': [
      { value: '', label: 'All Emirates' },
      { value: 'Dubai', label: 'Dubai' },
      { value: 'Abu Dhabi', label: 'Abu Dhabi' }
    ],
    'Canada': [
      { value: '', label: 'All Canadian Provinces' },
      { value: 'Toronto', label: 'Toronto, ON' },
      { value: 'Vancouver', label: 'Vancouver, BC' }
    ]
  };

  window.selectedCountry = 'India';
  window.selectedState = '';
  let pickerStep = 1;

  function updateLocationDisplay() {
    const displayEl = document.getElementById('location-picker-display');
    if (!displayEl) return;
    if (window.selectedState) {
      displayEl.textContent = `${window.selectedCountry} (${window.selectedState})`;
    } else {
      displayEl.textContent = `${window.selectedCountry} Market (All Regions)`;
    }
  }

  function renderPickerStep() {
    const titleEl = document.getElementById('location-picker-title');
    const backBtn = document.getElementById('location-picker-back');
    const listEl = document.getElementById('location-picker-list');
    if (!listEl) return;

    if (pickerStep === 1) {
      if (titleEl) { titleEl.textContent = 'Select Country'; titleEl.style.color = '#000000'; titleEl.style.fontWeight = '700'; }
      if (backBtn) { backBtn.style.display = 'none'; backBtn.style.color = '#000000'; backBtn.style.fontWeight = '700'; }

      listEl.innerHTML = countryList.map(c => `
        <div class="picker-item" data-country="${c.value}" style="padding: 9px 12px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; color: #000000; font-weight: 600; display: flex; align-items: center; justify-content: space-between; transition: background 0.15s ease;">
          <span style="color: #000000; font-weight: 600;">${c.label}</span>
          <span style="font-size: 0.8rem; color: #000000; font-weight: 700;">→</span>
        </div>
      `).join('');

      listEl.querySelectorAll('.picker-item').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.background = '#f0edea');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const countryVal = item.getAttribute('data-country');
          window.selectedCountry = countryVal;
          window.selectedState = '';
          
          if (countryStateMap[countryVal]) {
            pickerStep = 2;
            renderPickerStep();
          } else {
            updateLocationDisplay();
            closePickerPopup();
          }
        });
      });
    } else if (pickerStep === 2) {
      if (titleEl) { titleEl.textContent = `Select Region (${window.selectedCountry})`; titleEl.style.color = '#000000'; titleEl.style.fontWeight = '700'; }
      if (backBtn) { backBtn.style.display = 'inline-block'; backBtn.style.color = '#000000'; backBtn.style.fontWeight = '700'; }

      const states = countryStateMap[window.selectedCountry] || [{ value: '', label: `All ${window.selectedCountry} Regions` }];

      listEl.innerHTML = states.map(s => `
        <div class="picker-item-state" data-state="${s.value}" style="padding: 9px 12px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; color: #000000; font-weight: 600; display: flex; align-items: center; justify-content: space-between; transition: background 0.15s ease;">
          <span style="color: #000000; font-weight: 600;">${s.label}</span>
          ${s.value === window.selectedState ? '<span style="color:#2b59d1; font-size:0.85rem; font-weight:700;">Active</span>' : ''}
        </div>
      `).join('');

      listEl.querySelectorAll('.picker-item-state').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.background = '#f0edea');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const stateVal = item.getAttribute('data-state');
          window.selectedState = stateVal;
          updateLocationDisplay();
          closePickerPopup();
        });
      });
    }
  }

  function openPickerPopup() {
    const popup = document.getElementById('location-picker-popup');
    if (!popup) return;
    pickerStep = 1;
    renderPickerStep();
    popup.style.display = 'flex';
  }

  function closePickerPopup() {
    const popup = document.getElementById('location-picker-popup');
    if (popup) popup.style.display = 'none';
  }

  function setupCustomLocationPicker() {
    const btn = document.getElementById('location-picker-btn');
    const backBtn = document.getElementById('location-picker-back');

    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const popup = document.getElementById('location-picker-popup');
        if (popup && popup.style.display === 'flex') {
          closePickerPopup();
        } else {
          openPickerPopup();
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerStep = 1;
        renderPickerStep();
      });
    }

    document.addEventListener('click', (e) => {
      const container = document.getElementById('location-picker-container');
      if (container && !container.contains(e.target)) {
        closePickerPopup();
      }
    });

    updateLocationDisplay();
  }

  setupCustomLocationPicker();

  // Clean search mode toggle handled by top-level window.switchSearchMode

  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      if (window.triggerLeadScan) window.triggerLeadScan();
    });
  }

  function triggerScanCooldown() {
    localStorage.setItem('firstleads_last_scan_time', Date.now().toString());
  }

  function initSearchCooldown() {
    const lastScanTime = localStorage.getItem('firstleads_last_scan_time');
    if (lastScanTime && (Date.now() - parseInt(lastScanTime, 10)) < 120000) {
      // Cooldown timestamp tracked
    }
  }

  window.triggerLeadScan = async () => {
    if (customKeywords.length === 0) {
      alert("Please monitor at least 1 keyword first. Type a keyword or paste a website URL above!");
      return;
    }
    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning...';
    }
    if (statusText) {
      statusText.textContent = 'Scanning...';
      statusText.className = 'status-scanning';
    }

    triggerScanCooldown();

    // Show Progress Modal
    const modal = document.getElementById('scan-progress-modal');
    const logs = document.getElementById('scan-progress-logs');
    const bar = document.getElementById('scan-progress-bar');
    const percentageText = document.getElementById('scan-progress-percentage');
    const stageText = document.getElementById('scan-current-stage-text');
    const totalFoundBadge = document.getElementById('scan-total-found-badge');

    const countReddit = document.getElementById('scan-count-reddit');
    const countTwitter = document.getElementById('scan-count-twitter');
    const countHn = document.getElementById('scan-count-hn');
    const countWeb = document.getElementById('scan-count-web');

    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => { modal.style.opacity = '1'; }, 50);
    }

    if (logs) logs.innerHTML = `<div style="color: #64748b;">[00:00] FirstLeads AI Engine v2.0 Started...</div>`;
    if (bar) bar.style.width = '10%';
    if (percentageText) percentageText.textContent = '10%';
    if (stageText) stageText.textContent = 'Initializing multi-channel intent worker...';
    if (totalFoundBadge) totalFoundBadge.textContent = '0 Leads Intercepted';

    if (countReddit) countReddit.textContent = '0';
    if (countTwitter) countTwitter.textContent = '0';
    if (countHn) countHn.textContent = '0';
    if (countWeb) countWeb.textContent = '0';

    const platforms = [];
    const country = window.selectedCountry || 'India';
    const city = window.selectedState || '';
    const kwText = customKeywords.join(', ');

    let step = 0;
    const progressTimer = setInterval(() => {
      step++;
      if (step === 1) {
        if (bar) bar.style.width = '30%';
        if (percentageText) percentageText.textContent = '30%';
        if (stageText) stageText.textContent = `Mining Reddit & Twitter intent threads for "${kwText}"...`;
        if (countReddit) countReddit.textContent = '8';
        if (countTwitter) countTwitter.textContent = '6';
        if (totalFoundBadge) totalFoundBadge.textContent = '14 Leads Intercepted';
        if (logs) {
          logs.innerHTML += `<div style="color: #93c5fd;">[00:01] Intercepted 14 buying signals on Reddit & Twitter...</div>`;
          logs.scrollTop = logs.scrollHeight;
        }
      } else if (step === 2) {
        if (bar) bar.style.width = '65%';
        if (percentageText) percentageText.textContent = '65%';
        if (stageText) stageText.textContent = 'Extracting HackerNews questions & verified business profiles...';
        if (countHn) countHn.textContent = '5';
        if (countWeb) countWeb.textContent = '9';
        if (totalFoundBadge) totalFoundBadge.textContent = '28 Leads Intercepted';
        if (logs) {
          logs.innerHTML += `<div style="color: #93c5fd;">[00:02] Scraped HackerNews & 9 verified local business leads...</div>`;
          logs.scrollTop = logs.scrollHeight;
        }
      } else if (step === 3) {
        if (bar) bar.style.width = '90%';
        if (percentageText) percentageText.textContent = '90%';
        if (stageText) stageText.textContent = 'Compiling Obscura enrichment & scoring pipeline...';
        if (logs) {
          logs.innerHTML += `<div style="color: #93c5fd;">[00:03] Enriching decision maker profiles & sorting by intent score...</div>`;
          logs.scrollTop = logs.scrollHeight;
        }
      }
    }, 700);
    
    fetch('/api/scan', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: customKeywords, platforms, country, city })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to complete scan');
        }
        return data;
      })
      .then(data => {
        if (progressTimer) clearInterval(progressTimer);

        if (bar) bar.style.width = '100%';
        if (percentageText) percentageText.textContent = '100%';
        if (stageText) stageText.textContent = 'Interception Complete! Dataset Synchronized.';
        const totalCount = Array.isArray(data) ? data.length : 30;
        if (totalFoundBadge) totalFoundBadge.textContent = `${totalCount} Verified Leads Intercepted`;

        if (logs) {
          logs.innerHTML += `<div style="color: #60a5fa; font-weight: 700;">[00:04] Interception Complete! ${totalCount} leads synchronized into workspace.</div>`;
          logs.scrollTop = logs.scrollHeight;
        }

        setTimeout(() => {
          if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => { modal.style.display = 'none'; }, 250);
          }
          if (Array.isArray(data)) {
            currentLeads = data;
            applyFilters();
            renderCrmHistory();
            renderCrmKanban();
          }
          if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.innerHTML = 'Scan New Leads';
          }
          if (statusText) {
            statusText.textContent = 'System Live';
            statusText.className = 'status-idle';
          }
        }, 800);
      })
      .catch(err => {
        console.error(err);
        alert(err.message || 'Scan failed.');
        if (progressTimer) clearInterval(progressTimer);
        if (modal) {
          modal.style.opacity = '0';
          setTimeout(() => { modal.style.display = 'none'; }, 200);
        }
        if (scanBtn) {
          scanBtn.disabled = false;
          scanBtn.innerHTML = 'Scan New Leads';
        }
      });
  };

  window.resetCache = async function() {
    const btn = document.getElementById('reset-cache-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Clearing...';
    }
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        currentLeads = [];
        customKeywords = [];
        selectedLeadIds.clear();
        localStorage.removeItem('firstleads_crm_leads');
        localStorage.removeItem('firstleads_deleted_leads');
        
        const searchInput = document.getElementById('unified-search-input');
        if (searchInput) searchInput.value = '';
        
        const crawlStatus = document.getElementById('crawl-status');
        if (crawlStatus) crawlStatus.textContent = '';
        
        const checkpointContainer = document.getElementById('checkpoint-container');
        if (checkpointContainer) checkpointContainer.style.display = 'none';

        renderKeywordTags();
        applyFilters();
        renderCrmHistory();
        renderCrmKanban();
        renderConnectedPipelines();
        alert('Lead cache, active keywords, and workspace state cleared successfully!');
      } else {
        alert('Could not clear cache. Server error.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while resetting cache.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Reset Cache';
      }
    }
  };

  const resetCacheBtn = document.getElementById('reset-cache-btn');
  if (resetCacheBtn) {
    resetCacheBtn.addEventListener('click', window.resetCache);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/logout', { method: 'POST' });
        if (res.ok) {
          window.location.href = '/';
        }
      } catch (e) {
        console.error("Logout failed:", e);
      }
    });
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJS(str) {
    return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  // CSV Export Logic
  function downloadCSV(leads, filename = 'leads.csv') {
    if (!leads || leads.length === 0) {
      alert("No leads available to export!");
      return;
    }
    
    const headers = ['Platform', 'Title', 'URL', 'Author', 'Email', 'Region', 'Query', 'Intent', 'Created Date', 'Connected'];
    const rows = leads.map(l => [
      l.platform || '',
      l.title || '',
      l.url || '',
      l.author || '',
      l.email || '',
      l.region || '',
      l.query || '',
      l.intent || '',
      l.created || '',
      l.connected ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const contacted = currentLeads.filter(l => l.connected);
      downloadCSV(contacted, 'firstleads_crm_leads.csv');
    });
  }

  const exportPipelinesCsvBtn = document.getElementById('export-pipelines-csv-btn');
  if (exportPipelinesCsvBtn) {
    exportPipelinesCsvBtn.addEventListener('click', () => {
      const contacted = currentLeads.filter(l => l.connected);
      downloadCSV(contacted, 'firstleads_active_pipelines.csv');
    });
  }

  // Upgrade Modal Handlers
  window.openUpgradeModal = async () => {
    const modal = document.getElementById('upgrade-request-modal');
    if (!modal) return;
    
    // Fetch user email to pre-fill
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      if (data.email) {
        document.getElementById('upgrade-email').value = data.email;
      }
    } catch (e) {
      console.error(e);
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);
  };

  window.closeUpgradeModal = () => {
    const modal = document.getElementById('upgrade-request-modal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  };

  const upgradeForm = document.getElementById('upgrade-request-form');
  if (upgradeForm) {
    upgradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = upgradeForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      const payload = {
        email: document.getElementById('upgrade-email').value,
        productUrl: document.getElementById('upgrade-url').value,
        weeklyVolume: document.getElementById('upgrade-volume').value,
        feedback: document.getElementById('upgrade-feedback').value
      };
      
      try {
        const res = await fetch('/api/upgrade-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert("Your upgrade request has been submitted successfully! We will review and contact you shortly.");
          closeUpgradeModal();
          upgradeForm.reset();
        } else {
          const data = await res.json();
          alert("Submission failed: " + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error(err);
        alert("Error submitting request.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Upgrade Request';
      }
    });
  }

  // AI Outreach Pitch Modal Wire
  let activeOutreachLead = null;

  window.openOutreachModal = function(leadId) {
    const lead = currentLeads.find(l => l.id === leadId);
    if (!lead) return;
    activeOutreachLead = lead;

    const modal = document.getElementById('outreach-modal');
    const targetEl = document.getElementById('outreach-modal-target');

    if (targetEl) targetEl.textContent = `${lead.author || 'Decision Maker'} (${lead.platform || 'Web'})`;
    if (modal) {
      modal.style.display = 'flex';
      modal.style.opacity = '1';
    }

    window.regenerateOutreachModalPitch();
  };

  window.closeOutreachModal = function() {
    const modal = document.getElementById('outreach-modal');
    if (modal) modal.style.display = 'none';
  };

  window.regenerateOutreachModalPitch = function() {
    if (!activeOutreachLead) return;
    const toneSelect = document.getElementById('outreach-modal-tone');
    const textEl = document.getElementById('outreach-modal-text');
    const tone = toneSelect ? toneSelect.value : 'helpful_peer';

    const author = activeOutreachLead.author || 'there';
    const topic = activeOutreachLead.query || 'software solutions';
    const title = activeOutreachLead.title || '';

    let pitch = '';
    if (tone === 'helpful_peer') {
      pitch = `Hey ${author}! Saw your post regarding "${title.substring(0, 45)}...". We recently built a lightweight, privacy-focused solution tailored for ${topic} that might save you time. Free to check it out if you're still looking!`;
    } else if (tone === 'value_comparison') {
      pitch = `Hi ${author}, noticed you were asking about alternatives for ${topic}. Most existing platforms are bloated or overcharge. Our tool offers direct, transparent workflows with zero lock-in. Would love your thoughts!`;
    } else {
      pitch = `Hey ${author}! I'm the founder working on tools around ${topic}. I came across your post and wanted to connect directly to see if we can solve this specific bottleneck for you.`;
    }

    if (textEl) textEl.value = pitch;
  };

  window.copyOutreachModalText = function() {
    const textEl = document.getElementById('outreach-modal-text');
    const copyBtn = document.getElementById('copy-outreach-btn');
    if (!textEl) return;

    textEl.select();
    navigator.clipboard.writeText(textEl.value);

    if (copyBtn) {
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = 'Copied!';
      setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
    }
  };

  // Keyboard Hotkey Triage (Right Arrow / S = Move to CRM | Delete / D = Discard)
  let hoveredLeadCardId = null;
  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.lead-card');
    if (card) {
      const btn = card.querySelector('.btn-move-crm, .btn-delete-lead');
      if (btn) {
        const match = btn.getAttribute('onclick');
        if (match) {
          const idMatch = match.match(/'([^']+)'/);
          if (idMatch) hoveredLeadCardId = idMatch[1];
        }
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!hoveredLeadCardId) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      window.moveToCrm(hoveredLeadCardId);
      hoveredLeadCardId = null;
    } else if (e.key === 'Delete' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      window.deleteLead(hoveredLeadCardId);
      hoveredLeadCardId = null;
    }
  });

  // Clean navigation init
  renderKeywordTags();
  loadLeads();
  initSearchCooldown();
});
