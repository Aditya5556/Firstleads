/* ==========================================================================
   Wall B2B Marketplace Module (Inspired by WhatAreYouBuilding.AI)
   ========================================================================== */

(function () {
  // Global Wall State & Initial Products Data
  window.wallProducts = [
    {
      id: 'prod-1',
      name: 'Advizory AI',
      tagline: 'Your dream group chat: legendary characters who talk to you and to each other.',
      url: 'https://advizory.ai',
      category: 'AI Agents',
      country: 'Israel',
      bidScore: 120,
      clicks: 432,
      leadsCaptured: 38,
      created: 'Just now'
    },
    {
      id: 'prod-2',
      name: 'FirstLeads Engine',
      tagline: 'Empathy-first SaaS marketing engine intercepting high-intent buyers across web channels.',
      url: 'https://firstleads.ai',
      category: 'Marketing',
      country: 'India',
      bidScore: 95,
      clicks: 582,
      leadsCaptured: 71,
      created: '2 hours ago'
    },
    {
      id: 'prod-3',
      name: 'SpotMy.app',
      tagline: 'Rotation-based launch directory for indie tools without pay-to-win bids.',
      url: 'https://spotmy.app',
      category: 'SaaS',
      country: 'Italy',
      bidScore: 60,
      clicks: 219,
      leadsCaptured: 18,
      created: '5 hours ago'
    },
    {
      id: 'prod-4',
      name: 'Ranken AI',
      tagline: 'Turn your domain into a powerful authority engine that ranks in Google & AI search engines.',
      url: 'https://ranken.ai',
      category: 'Dev Tools',
      country: 'United States',
      bidScore: 40,
      clicks: 310,
      leadsCaptured: 24,
      created: '1 day ago'
    },
    {
      id: 'prod-5',
      name: 'OpsAgents AI',
      tagline: 'Supervised autonomous AI agents that run real business operations and logistics.',
      url: 'https://opsagents.ai',
      category: 'AI Agents',
      country: 'India',
      bidScore: 30,
      clicks: 148,
      leadsCaptured: 12,
      created: '1 day ago'
    },
    {
      id: 'prod-6',
      name: 'Shelvr AI',
      tagline: 'Save links, photos, and notes—AI files them into Spaces so you can find them instantly.',
      url: 'https://shelvr.app',
      category: 'Productivity',
      country: 'Canada',
      bidScore: 20,
      clicks: 176,
      leadsCaptured: 15,
      created: '1 day ago'
    },
    {
      id: 'prod-7',
      name: 'Tregovia SaaS',
      tagline: 'A platform that adapts to any service business, not just one specific industry.',
      url: 'https://tregovia.com',
      category: 'SaaS',
      country: 'France',
      bidScore: 15,
      clicks: 112,
      leadsCaptured: 9,
      created: '2 days ago'
    },
    {
      id: 'prod-8',
      name: 'GetMentionedByAI',
      tagline: 'Discover and compare verified AI visibility tools, bot trackers, and ChatGPT SEO.',
      url: 'https://getmentionedbyai.com',
      category: 'Marketing',
      country: 'India',
      bidScore: 10,
      clicks: 264,
      leadsCaptured: 31,
      created: '2 days ago'
    },
    {
      id: 'prod-9',
      name: 'LLMagnet',
      tagline: 'AI visibility for WordPress - llms.txt generator and AI bot traffic tracking.',
      url: 'https://llmagnet.com',
      category: 'Marketing',
      country: 'Israel',
      bidScore: 5,
      clicks: 195,
      leadsCaptured: 17,
      created: '3 days ago'
    },
    {
      id: 'prod-10',
      name: 'Toggletown',
      tagline: 'Feature flag platform built specifically for indie hackers and solo builders.',
      url: 'https://toggletown.dev',
      category: 'Dev Tools',
      country: 'United Kingdom',
      bidScore: 0,
      clicks: 142,
      leadsCaptured: 11,
      created: '3 days ago'
    },
    {
      id: 'prod-11',
      name: 'SightLib AI',
      tagline: 'Turns a photo of your bookshelf into a managed digital library with smart AI tags.',
      url: 'https://sightlib.ai',
      category: 'Productivity',
      country: 'Israel',
      bidScore: 0,
      clicks: 87,
      leadsCaptured: 6,
      created: '4 days ago'
    },
    {
      id: 'prod-12',
      name: 'DeelFlows',
      tagline: 'AI Agents for all WhatsApp customer support scenarios and automated lead conversion.',
      url: 'https://deelflows.com',
      category: 'SaaS',
      country: 'UAE',
      bidScore: 0,
      clicks: 304,
      leadsCaptured: 42,
      created: '4 days ago'
    }
  ];

  window.activeWallCat = 'all';
  window.wallTheme = 'dark'; // default

  window.toggleWallTheme = function () {
    const wallContainer = document.querySelector('.wall-marketplace-container');
    const iconBtn = document.getElementById('wall-theme-icon');
    if (!wallContainer) return;

    if (window.wallTheme === 'dark') {
      window.wallTheme = 'light';
      wallContainer.classList.add('wall-theme-light');
      document.body.classList.add('theme-light');
      if (iconBtn) iconBtn.textContent = '🌙 Dark Mode';
    } else {
      window.wallTheme = 'dark';
      wallContainer.classList.remove('wall-theme-light');
      document.body.classList.remove('theme-light');
      if (iconBtn) iconBtn.textContent = '☀️ Light Mode';
    }
  };

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJS(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  window.renderWallMarketplace = function () {
    const container = document.getElementById('wall-products-container');
    if (!container) return;

    let filtered = window.wallProducts.filter(p => {
      return window.activeWallCat === 'all' || p.category.toLowerCase() === window.activeWallCat.toLowerCase();
    });

    filtered.sort((a, b) => (b.bidScore || 0) - (a.bidScore || 0));

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--wall-text-muted); padding: 40px 0;">No products listed in this category yet. Click "+ Ship Product (Free)" to be the first!</div>`;
      return;
    }

    container.innerHTML = filtered.map((p, index) => {
      let rankClass = 'wall-rank-standard';
      let rankText = `#${index + 1}`;
      if (index === 0) { rankClass = 'wall-rank-gold'; rankText = '#1 Featured'; }
      else if (index === 1) { rankClass = 'wall-rank-silver'; rankText = '#2 Top Bid'; }
      else if (index === 2) { rankClass = 'wall-rank-silver'; rankText = '#3 Hot'; }

      const logoHtml = p.logo 
        ? `<img src="${escapeHTML(p.logo)}" alt="${escapeHTML(p.name)}" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid var(--wall-border);">`
        : `<div style="width:38px;height:38px;border-radius:8px;background:#2b59d1;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1rem;border:1px solid #2b59d1;box-shadow:0 2px 8px rgba(43,89,209,0.2);">${escapeHTML((p.name || 'P').charAt(0))}</div>`;

      return `
        <div class="wall-card-item">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${logoHtml}
          </div>
          <div class="wall-card-info">
            <div class="wall-card-title-row">
              <span class="wall-card-rank ${rankClass}">${rankText}</span>
              <a href="${escapeHTML(p.url)}" target="_blank" onclick="window.trackProductClick('${p.id}')" class="wall-card-title">
                <span>${escapeHTML(p.name)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
              <span class="wall-card-tag">${escapeHTML(p.category)} · ${escapeHTML(p.country)}</span>
            </div>
            <p class="wall-card-tagline">${escapeHTML(p.tagline)}</p>
          </div>

          <div class="wall-card-right-actions">
            <div class="wall-metrics-block">
              <span class="wall-clicks-count">${p.clicks || 0} Clicks</span>
              <span class="wall-leads-count">${p.leadsCaptured || 0} Leads</span>
            </div>
            <button onclick="window.interceptWallLead('${p.id}', '${escapeJS(p.name)}')" class="wall-btn-capture">
              Capture Lead
            </button>
            <a href="${escapeHTML(p.url)}" target="_blank" onclick="window.trackProductClick('${p.id}')" class="wall-btn-visit">
              Visit →
            </a>
          </div>
        </div>
      `;
    }).join('');
  };

  window.filterWallCategory = function (cat, btn) {
    window.activeWallCat = cat;
    document.querySelectorAll('.wall-filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.renderWallMarketplace();
  };

  window.openSubmitProductModal = function () {
    const modal = document.getElementById('submit-product-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeSubmitProductModal = function () {
    const modal = document.getElementById('submit-product-modal');
    if (modal) modal.style.display = 'none';
  };

  window.updateLogoPreview = function (val) {
    const previewBox = document.getElementById('logo-preview-box');
    if (!previewBox) return;

    if (val && (val.startsWith('http') || val.startsWith('data:image'))) {
      previewBox.innerHTML = `<img src="${escapeHTML(val)}" style="width:100%;height:100%;object-fit:cover;">`;
    } else if (val && val.length <= 4) {
      previewBox.innerHTML = val;
      previewBox.style.background = '#2b59d1';
    } else {
      const nameInput = document.getElementById('prod-name');
      const initial = (nameInput && nameInput.value.trim()) ? nameInput.value.trim().charAt(0).toUpperCase() : 'P';
      previewBox.innerHTML = initial;
      previewBox.style.background = '#2b59d1';
    }
  };

  window.setLogoPreset = function (emoji, color) {
    const previewBox = document.getElementById('logo-preview-box');
    const logoUrlInput = document.getElementById('prod-logo-url');
    if (logoUrlInput) logoUrlInput.value = emoji;
    if (previewBox) {
      previewBox.innerHTML = `<span style="font-size: 1.3rem;">${emoji}</span>`;
      previewBox.style.background = color || '#2b59d1';
    }
  };

  window.handleLogoFileUpload = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const dataUrl = event.target.result;
        const logoUrlInput = document.getElementById('prod-logo-url');
        if (logoUrlInput) logoUrlInput.value = dataUrl;
        window.updateLogoPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  window.handleProductSubmit = async function (e) {
    e.preventDefault();
    const name = document.getElementById('prod-name').value.trim();
    const tagline = document.getElementById('prod-tagline').value.trim();
    let url = document.getElementById('prod-url').value.trim();
    const logo = document.getElementById('prod-logo-url').value.trim();
    const category = document.getElementById('prod-category').value;
    const country = document.getElementById('prod-country').value;
    const pricing = document.getElementById('prod-pricing') ? document.getElementById('prod-pricing').value : 'Freemium';
    const twitter = document.getElementById('prod-twitter') ? document.getElementById('prod-twitter').value.trim() : '';

    if (!name || !tagline || !url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const payload = { name, tagline, url, logo: logo || null, category, country, pricing, twitter };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success && result.product) {
        window.wallProducts.unshift(result.product);
      } else {
        window.wallProducts.unshift({
          id: `prod-${Date.now()}`,
          name, tagline, url, logo: logo || null, category, country, pricing, twitter,
          bidScore: 0, clicks: 0, leadsCaptured: 0, created: 'Just now'
        });
      }
    } catch (err) {
      window.wallProducts.unshift({
        id: `prod-${Date.now()}`,
        name, tagline, url, logo: logo || null, category, country, pricing, twitter,
        bidScore: 0, clicks: 0, leadsCaptured: 0, created: 'Just now'
      });
    }

    window.renderWallMarketplace();
    window.closeSubmitProductModal();

    document.getElementById('submit-product-form').reset();
    window.updateLogoPreview('');

    alert(`"${name}" published instantly on the Wall & saved to server backend!`);
  };

  window.openBidModal = function () {
    const modal = document.getElementById('bid-rank-modal');
    const select = document.getElementById('bid-product-select');
    if (!modal || !select) return;

    select.innerHTML = window.wallProducts.map(p => `<option value="${p.id}">${p.name} (Current Rank Score: ${p.bidScore})</option>`).join('');
    modal.style.display = 'flex';
  };

  window.closeBidModal = function () {
    const modal = document.getElementById('bid-rank-modal');
    if (modal) modal.style.display = 'none';
  };

  window.selectBidAmount = function (amount, btn) {
    document.getElementById('selected-bid-amount').value = amount;
    document.querySelectorAll('.bid-amount-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  };

  window.handleBidSubmit = async function (e) {
    e.preventDefault();
    const prodId = document.getElementById('bid-product-select').value;
    const amount = parseInt(document.getElementById('selected-bid-amount').value) || 10;
    const prod = window.wallProducts.find(p => p.id === prodId);

    if (prod) {
      prod.bidScore = (prod.bidScore || 0) + amount;
      window.renderWallMarketplace();
      window.closeBidModal();
      try {
        await fetch('/api/products/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prodId, amount })
        });
      } catch (err) {}
      alert(`Bid of $${amount} confirmed! "${prod.name}" boosted up the Wall!`);
    }
  };

  window.trackProductClick = function (prodId) {
    const prod = window.wallProducts.find(p => p.id === prodId);
    if (prod) {
      prod.clicks = (prod.clicks || 0) + 1;
      window.renderWallMarketplace();
    }
  };

  // Lead Capture Modal Logic
  window.interceptWallLead = function (prodId, prodName) {
    const modal = document.getElementById('wall-lead-capture-modal');
    const targetText = document.getElementById('lead-target-product-name');
    const idInput = document.getElementById('lead-prod-id');
    const nameInput = document.getElementById('lead-prod-name');

    if (modal && targetText) {
      targetText.textContent = `Direct lead capture for "${prodName}". Will sync into founder's CRM.`;
      if (idInput) idInput.value = prodId;
      if (nameInput) nameInput.value = prodName;
      modal.style.display = 'flex';
    }
  };

  window.closeWallLeadModal = function () {
    const modal = document.getElementById('wall-lead-capture-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleWallLeadSubmit = async function (e) {
    e.preventDefault();
    const prodId = document.getElementById('lead-prod-id').value;
    const prodName = document.getElementById('lead-prod-name').value;
    const name = document.getElementById('visitor-name').value.trim();
    const email = document.getElementById('visitor-email').value.trim();
    const company = document.getElementById('visitor-company').value.trim();
    const message = document.getElementById('visitor-message').value.trim();

    if (!name || !email) return;

    // Increment lead counter on Wall UI
    const prod = window.wallProducts.find(p => p.id === prodId);
    if (prod) {
      prod.leadsCaptured = (prod.leadsCaptured || 0) + 1;
      window.renderWallMarketplace();
    }

    try {
      await fetch('/api/wall/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: prodId,
          visitorName: name,
          visitorEmail: email,
          visitorCompany: company,
          visitorRole: '',
          message: message
        })
      });
    } catch (err) {
      console.warn('Wall connect post warning:', err.message);
    }

    // Sync lead into Outreach CRM if available locally
    if (window.syncWallLeadToCrm) {
      window.syncWallLeadToCrm({
        id: `wall-lead-${Date.now()}`,
        productName: prodName,
        productUrl: prod ? prod.url : '',
        country: prod ? prod.country : 'Global',
        name,
        email,
        company,
        message
      });
    }

    window.closeWallLeadModal();
    document.getElementById('wall-lead-capture-form').reset();
    alert(`Lead Captured Successfully!\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || 'N/A'}\nProduct: "${prodName}"\n\nDelivered directly to the founder's lead inbox!`);
  };

  window.fetchProductsFromBackend = async function () {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          window.wallProducts = data;
          window.renderWallMarketplace();
        }
      }
    } catch (e) {}
  };

  // Event Delegation for Button Reliability & Hotkeys
  document.addEventListener('click', (e) => {
    const shipBtn = e.target.closest('#ship-product-btn') || e.target.closest('.wall-ship-btn');
    if (shipBtn) {
      window.openSubmitProductModal();
    }
    const bidBtn = e.target.closest('.wall-bid-btn');
    if (bidBtn) {
      window.openBidModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeSubmitProductModal();
      window.closeBidModal();
      window.closeWallLeadModal();
    }
  });

  // Initial render & backend fetch when script loads
  document.addEventListener('DOMContentLoaded', () => {
    window.renderWallMarketplace();
    window.fetchProductsFromBackend();
  });
})();
