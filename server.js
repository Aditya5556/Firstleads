const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { runScout, generateDraftReply, generateKeywordsFromWebsiteText, getDaemonStatus, startExpleeDaemon, stopExpleeDaemon, getInstantLeadsForICP, purgeExpiredLeads } = require('./scout');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
let userPlanState = 'Free';

// Initialize Supabase if credentials exist
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log('Successfully connected to Supabase Client Backend Database.');
  } catch (e) {
    console.error('Failed to initialize Supabase Client:', e.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

function fetchUrlContent(targetUrl) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      
      client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = new URL(redirectUrl, targetUrl).href;
          }
          return fetchUrlContent(redirectUrl).then(resolve).catch(reject);
        }
        
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => { resolve(data); });
      }).on('error', (err) => { reject(err); });
    } catch (e) {
      reject(e);
    }
  });
}

function getCookie(req, name) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list[name];
}

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // Wall Marketplace Products Endpoints
  if (url === '/api/products' && method === 'GET') {
    const productsPath = path.join(__dirname, 'products.json');
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('bid_score', { ascending: false });
        if (!error && data && data.length > 0) {
          const formatted = data.map(p => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            url: p.url,
            logo: p.logo,
            category: p.category,
            country: p.country,
            pricing: p.pricing || 'Freemium',
            twitter: p.twitter || '',
            bidScore: p.bid_score || 0,
            clicks: p.clicks || 0,
            leadsCaptured: p.leads_captured || 0,
            created: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Just now'
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formatted));
          return;
        }
      } catch (e) {
        console.error('Supabase products fetch error:', e.message);
      }
    }

    // Local file fallback
    if (fs.existsSync(productsPath)) {
      try {
        const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        products.sort((a, b) => (b.bidScore || 0) - (a.bidScore || 0));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(products));
        return;
      } catch (e) {}
    }

    // Default initial seed products
    const initialProducts = [
      { id: 'prod-1', name: 'Advizory AI', tagline: 'Your dream group chat: legendary characters who talk to you and to each other.', url: 'https://advizory.ai', category: 'AI Agents', country: 'Israel', pricing: 'Freemium', twitter: '@advizoryai', bidScore: 120, clicks: 432, leadsCaptured: 38, created: 'Just now' },
      { id: 'prod-2', name: 'FirstLeads Engine', tagline: 'Empathy-first SaaS marketing engine intercepting high-intent buyers across web channels.', url: 'https://firstleads.ai', category: 'Marketing', country: 'India', pricing: 'Freemium', twitter: '@firstleadsai', bidScore: 95, clicks: 582, leadsCaptured: 71, created: '2 hours ago' },
      { id: 'prod-3', name: 'SpotMy.app', tagline: 'Rotation-based launch directory for indie tools without pay-to-win bids.', url: 'https://spotmy.app', category: 'SaaS', country: 'Italy', pricing: 'Free', twitter: '@spotmyapp', bidScore: 60, clicks: 219, leadsCaptured: 18, created: '5 hours ago' },
      { id: 'prod-4', name: 'Ranken AI', tagline: 'Turn your domain into a powerful authority engine that ranks in Google & AI search engines.', url: 'https://ranken.ai', category: 'Dev Tools', country: 'United States', pricing: 'Paid', twitter: '@rankenai', bidScore: 40, clicks: 310, leadsCaptured: 24, created: '1 day ago' }
    ];
    fs.writeFileSync(productsPath, JSON.stringify(initialProducts, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(initialProducts));
    return;
  }

  if (url === '/api/products' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        let { name, tagline, url: prodUrl, logo, category, country, pricing, twitter } = payload;
        if (!name || !tagline || !prodUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name, tagline, and website URL are required.' }));
          return;
        }

        if (!prodUrl.startsWith('http://') && !prodUrl.startsWith('https://')) {
          prodUrl = `https://${prodUrl}`;
        }

        const newProduct = {
          id: `prod-${Date.now()}`,
          name,
          tagline,
          url: prodUrl,
          logo: logo || null,
          category: category || 'SaaS',
          country: country || 'Global',
          pricing: pricing || 'Freemium',
          twitter: twitter || '',
          bidScore: 0,
          clicks: 0,
          leadsCaptured: 0,
          created: 'Just now',
          timestamp: Date.now()
        };

        // Write to local disk products.json
        const productsPath = path.join(__dirname, 'products.json');
        let products = [];
        if (fs.existsSync(productsPath)) {
          try { products = JSON.parse(fs.readFileSync(productsPath, 'utf8')); } catch (e) { products = []; }
        }
        products.unshift(newProduct);
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

        // Sync with Supabase if available
        if (supabase) {
          try {
            await supabase.from('products').insert([{
              id: newProduct.id,
              name: newProduct.name,
              tagline: newProduct.tagline,
              url: newProduct.url,
              logo: newProduct.logo,
              category: newProduct.category,
              country: newProduct.country,
              pricing: newProduct.pricing,
              twitter: newProduct.twitter,
              bid_score: 0,
              clicks: 0,
              leads_captured: 0
            }]);
          } catch (e) {
            console.error('Supabase product insert error:', e.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, product: newProduct }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/products/bid' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { prodId, amount } = JSON.parse(body);
        const boost = parseInt(amount) || 10;
        const productsPath = path.join(__dirname, 'products.json');

        if (fs.existsSync(productsPath)) {
          let products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
          const prod = products.find(p => p.id === prodId);
          if (prod) {
            prod.bidScore = (prod.bidScore || 0) + boost;
            fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
          }
        }

        if (supabase) {
          try {
            const { data } = await supabase.from('products').select('bid_score').eq('id', prodId).single();
            const currentScore = data ? (data.bid_score || 0) : 0;
            await supabase.from('products').update({ bid_score: currentScore + boost }).eq('id', prodId);
          } catch (e) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.startsWith('/api/buska/mentions')) {
    try {
      const { DIRECT_LEADS_DATABASE } = require('./scout');
      const sentiments = ['positive', 'neutral', 'neutral', 'positive'];
      const mentions = DIRECT_LEADS_DATABASE.map((lead, idx) => ({
        id: `buska_${Buffer.from(lead.url).toString('base64').substring(0, 8)}`,
        platform: lead.platform,
        title: lead.title,
        content: `Looking for recommendations or tools matching keyword: ${lead.query}.`,
        url: lead.url,
        author: lead.author,
        sentiment: sentiments[idx % sentiments.length],
        created_at: new Date(Date.now() - idx * 3600000).toISOString()
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        total_results: mentions.length,
        mentions: mentions
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  function extractSubpageLinks(html, baseUrl) {
    const links = [];
    const regex = /href=["']([^"']+)["']/g;
    let match;
    const keywords = ['/services', '/products', '/features', '/testimonials', '/pricing', '/about', '/reviews'];
    
    try {
      const parsedBase = new URL(baseUrl);
      const domain = parsedBase.hostname;
      
      while ((match = regex.exec(html)) !== null) {
        let link = match[1];
        if (link.startsWith('/')) {
          link = `${parsedBase.protocol}//${domain}${link}`;
        }
        if (link.startsWith('http') && link.includes(domain)) {
          const cleanLink = link.split('?')[0].split('#')[0];
          const matchKeyword = keywords.some(kw => cleanLink.toLowerCase().includes(kw));
          if (matchKeyword && !links.includes(cleanLink) && cleanLink !== baseUrl) {
            links.push(cleanLink);
          }
        }
      }
    } catch (e) {
      console.warn("Error parsing links:", e.message);
    }
    return links.slice(0, 3);
  }

  if ((url === '/api/crawl' || url === '/api/crawl-keywords') && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url: targetUrl } = JSON.parse(body);
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }
        
        console.log(`Crawling website: ${targetUrl}...`);
        let html = '';
        let combinedText = '';
        try {
          html = await fetchUrlContent(targetUrl);
          combinedText += html;
          
          const sublinks = extractSubpageLinks(html, targetUrl);
          if (sublinks.length > 0) {
            console.log(`Found ${sublinks.length} relevant subpages to enrich content:`, sublinks);
            const subpagePromises = sublinks.map(link => 
              fetchUrlContent(link).catch(err => {
                console.warn(`[Subpage Warning] Failed to crawl ${link}: ${err.message}`);
                return '';
              })
            );
            const results = await Promise.all(subpagePromises);
            results.forEach(content => {
              combinedText += '\n\n' + content;
            });
          }
        } catch (crawlErr) {
          console.warn(`[Crawler Warning] Crawl failed for ${targetUrl}: ${crawlErr.message}. Triggering domain parser fallback.`);
        }
        const keywords = await generateKeywordsFromWebsiteText(combinedText || html, targetUrl);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, keywords }));
      } catch (e) {
        console.error("Crawl/Gen failed: ", e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/expand-prompt' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing prompt' }));
          return;
        }

        const raw = prompt.toLowerCase().trim();
        const keywords = [raw];

        const stopWords = ['looking', 'for', 'any', 'good', 'best', 'tool', 'tools', 'software', 'platform', 'app', 'apps', 'recommendation', 'recommendations', 'how', 'to', 'need', 'needs', 'want', 'wants', 'a', 'the', 'in', 'on', 'with', 'seeking', 'suggest'];
        const words = raw.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
        
        if (words.length > 0) {
          const coreTopic = words.join(' ');
          keywords.push(coreTopic);
          keywords.push(`looking for ${coreTopic}`);
          keywords.push(`alternative to ${coreTopic}`);
          keywords.push(`best ${coreTopic}`);
          keywords.push(`recommend ${coreTopic}`);
        }

        const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 6);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, keywords: uniqueKeywords }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/form-to-keywords' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { productName, problemSolved, targetAudience } = JSON.parse(body);
        
        const keywords = [];
        if (productName) keywords.push(productName.toLowerCase());
        
        if (problemSolved) {
          const rawProb = problemSolved.toLowerCase();
          keywords.push(rawProb);
          keywords.push(`looking for ${rawProb}`);
          keywords.push(`alternative for ${rawProb}`);
        }

        if (targetAudience && problemSolved) {
          keywords.push(`${targetAudience.toLowerCase()} ${problemSolved.toLowerCase()}`);
        }

        if (productName) {
          keywords.push(`alternative to ${productName.toLowerCase()}`);
          keywords.push(`best ${productName.toLowerCase()}`);
        }

        const uniqueKeywords = Array.from(new Set(keywords)).filter(k => k && k.length > 2).slice(0, 6);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, keywords: uniqueKeywords.length > 0 ? uniqueKeywords : ['b2b srvices'] }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  function saveLocalRequest(email, productUrl, weeklyVolume, feedback) {
    const requestsPath = path.join(__dirname, 'upgrade_requests.json');
    let requests = [];
    if (fs.existsSync(requestsPath)) {
      try {
        requests = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
      } catch (e) {
        requests = [];
      }
    }
    requests.push({
      email,
      productUrl,
      weeklyVolume,
      feedback,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));
  }

  if (url === '/api/logout' && method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'firstleads_auth=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (url === '/api/user' && method === 'GET') {
    const auth = getCookie(req, 'firstleads_auth');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ email: auth || '' }));
    return;
  }

  if (url === '/api/upgrade-request' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, productUrl, weeklyVolume, feedback } = JSON.parse(body);
        
        if (supabase) {
          const { error } = await supabase
            .from('upgrade_requests')
            .insert([{
              email,
              product_url: productUrl,
              weekly_volume: weeklyVolume,
              feedback
            }]);
          if (error) {
            console.error("Supabase upgrade request insert failed, falling back to local storage:", error.message);
            // Fall back to local file system if insert fails
            saveLocalRequest(email, productUrl, weeklyVolume, feedback);
          }
        } else {
          saveLocalRequest(email, productUrl, weeklyVolume, feedback);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.startsWith('/api/leads') && method === 'GET') {
    let leadsData = [];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          leadsData = data;
        }
      } catch (e) {}
    }

    if (leadsData.length === 0) {
      const matchesPath = path.join(__dirname, 'matches.json');
      if (fs.existsSync(matchesPath)) {
        try {
          leadsData = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
        } catch (e) {
          leadsData = [];
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leadsData));
    return;
  }

  if (url === '/api/plan' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ plan: userPlanState }));
    return;
  }

  if (url === '/api/upgrade' && method === 'POST') {
    userPlanState = 'Pro';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, plan: 'Pro' }));
    return;
  }

  if (url === '/api/scan' && method === 'POST') {
    // Daily scan limit temporarily disabled per user request
    /*
    if (userPlanState === 'Free') {
      const userEmail = getCookie(req, 'firstleads_auth') || 'anonymous';
      const scansLogPath = path.join(__dirname, 'scans_log.json');
      let scansDb = {};
      if (fs.existsSync(scansLogPath)) {
        try {
          scansDb = JSON.parse(fs.readFileSync(scansLogPath, 'utf8'));
        } catch (e) {
          scansDb = {};
        }
      }
      
      if (Array.isArray(scansDb)) {
        scansDb = {};
      }
      
      let userScans = scansDb[userEmail] || [];
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      userScans = userScans.filter(t => t > oneDayAgo);
      
      if (userScans.length >= 5) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Daily scan limit reached. You can perform at most 5 scans every 24 hours on the Free plan.' }));
        return;
      }
      
      userScans.push(now);
      scansDb[userEmail] = userScans;
      fs.writeFileSync(scansLogPath, JSON.stringify(scansDb, null, 2));
    }
    */

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let keywords = [];
        let platforms = [];
        let country = 'Global';
        let city = '';
        if (body) {
          try {
            const parsed = JSON.parse(body);
            if (parsed.keywords && Array.isArray(parsed.keywords)) {
              keywords = parsed.keywords;
            }
            if (parsed.platforms && Array.isArray(parsed.platforms)) {
              platforms = parsed.platforms;
            }
            if (parsed.country) {
              country = parsed.country;
            }
            if (parsed.city) {
              city = parsed.city.trim();
            }
          } catch (pe) {}
        }
        const userEmail = getCookie(req, 'firstleads_auth') || 'anonymous';
        await runScout(keywords, platforms, userPlanState, userEmail, country, city);
        
        // Return latest list
        if (supabase) {
          const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
          }
        }

        const matchesPath = path.join(__dirname, 'matches.json');
        let data = '[]';
        if (fs.existsSync(matchesPath)) {
          data = fs.readFileSync(matchesPath, 'utf8');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/clear' && method === 'POST') {
    try {
      if (supabase) {
        try {
          await supabase.from('leads').delete().neq('id', '0');
        } catch (e) {}
      }
      
      const matchesPath = path.join(__dirname, 'matches.json');
      const historyPath = path.join(__dirname, 'history.json');
      fs.writeFileSync(matchesPath, JSON.stringify([], null, 2));
      if (fs.existsSync(historyPath)) {
        fs.writeFileSync(historyPath, JSON.stringify([], null, 2));
      }
    } catch (e) {
      console.warn('[Cache Clear Warning]:', e.message);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leads: [] }));
    return;
  }

  if (url === '/api/subscribe' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body);
        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email address' }));
          return;
        }

        if (supabase) {
          const { error } = await supabase
            .from('waitlists')
            .insert([{ email }]);
          if (error && error.code !== '23505') {
            throw error;
          }
        } else {
          const waitlistPath = path.join(__dirname, 'waitlist.json');
          let list = [];
          if (fs.existsSync(waitlistPath)) {
            list = JSON.parse(fs.readFileSync(waitlistPath, 'utf8'));
          }
          if (!list.includes(email)) {
            list.push(email);
            fs.writeFileSync(waitlistPath, JSON.stringify(list, null, 2));
          }
        }

        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Set-Cookie': `firstleads_auth=${encodeURIComponent(email)}; Path=/; HttpOnly; Max-Age=3600` // 1 hour session
        });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/connect' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id, connected } = JSON.parse(body);
        
        if (supabase) {
          // Identify if UUID or text URL string
          const matchField = id.includes('-') && id.length > 24 ? 'id' : 'url';
          const { error } = await supabase
            .from('leads')
            .update({ connected })
            .eq(matchField, id);

          if (!error) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        const matchesPath = path.join(__dirname, 'matches.json');
        if (fs.existsSync(matchesPath)) {
          const leads = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
          const lead = leads.find(l => l.id === id);
          if (lead) {
            lead.connected = connected;
            fs.writeFileSync(matchesPath, JSON.stringify(leads, null, 2));

            // Persistent Outreach Database Update
            const historyPath = path.join(__dirname, 'history.json');
            let history = [];
            if (fs.existsSync(historyPath)) {
              try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch (e) { history = []; }
            }
            if (connected) {
              if (!history.some(h => h.url === lead.url)) history.push(lead);
            } else {
              history = history.filter(h => h.url !== lead.url);
            }
            fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  if (url === '/api/delete-lead' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body);
        if (supabase) {
          try {
            const matchField = id.includes('-') && id.length > 24 ? 'id' : 'url';
            await supabase.from('leads').delete().eq(matchField, id);
          } catch (e) {}
        }

        const matchesPath = path.join(__dirname, 'matches.json');
        if (fs.existsSync(matchesPath)) {
          let leads = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
          leads = leads.filter(l => l.id !== id);
          fs.writeFileSync(matchesPath, JSON.stringify(leads, null, 2));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/enrich-lead' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body);
        const matchesPath = path.join(__dirname, 'matches.json');
        let leads = [];
        if (fs.existsSync(matchesPath)) {
          leads = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
        }
        const leadIndex = leads.findIndex(l => l.id === id);
        if (leadIndex !== -1) {
          const { runObscuraEnrichment } = require('./obscura_stealth');
          const enrichedLead = await runObscuraEnrichment(leads[leadIndex]);
          leads[leadIndex] = enrichedLead;
          fs.writeFileSync(matchesPath, JSON.stringify(leads, null, 2));

          if (supabase) {
            try {
              const matchField = id.includes('-') && id.length > 24 ? 'id' : 'url';
              await supabase.from('leads').update({
                phone: enrichedLead.phone,
                address: enrichedLead.address,
                email: enrichedLead.email,
                enriched: true
              }).eq(matchField, id);
            } catch (e) {}
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, lead: enrichedLead }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Lead not found' }));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  if (url === '/api/draft' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id, title, query, tone } = JSON.parse(body);
        let leadItem = null;

        if (supabase) {
          const matchField = id.includes('-') && id.length > 24 ? 'id' : 'url';
          const { data, error } = await supabase.from('leads').select('*').eq(matchField, id).single();
          if (!error && data) {
            leadItem = data;
          }
        }

        if (!leadItem) {
          const matchesPath = path.join(__dirname, 'matches.json');
          if (fs.existsSync(matchesPath)) {
            const leads = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
            leadItem = leads.find(l => l.id === id);
          }
        }

        if (leadItem) {
          const draft = await generateDraftReply(title, '', query, tone);
          
          if (supabase) {
            const matchField = id.includes('-') && id.length > 24 ? 'id' : 'url';
            await supabase.from('leads').update({ draft }).eq(matchField, id);
          }

          const matchesPath = path.join(__dirname, 'matches.json');
          if (fs.existsSync(matchesPath)) {
            const leads = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
            const localLead = leads.find(l => l.id === id);
            if (localLead) {
              localLead.draft = draft;
              fs.writeFileSync(matchesPath, JSON.stringify(leads, null, 2));
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, draft }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Lead not found' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/campaigns/create' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { productName, productUrl, valueProposition, targetIcp, country, city } = JSON.parse(body || '{}');
        const { generateVectorEmbedding } = require('./vector_engine');
        
        const icpText = `${productName || ''} ${valueProposition || ''} ${targetIcp || ''}`.trim();
        const vector = await generateVectorEmbedding(icpText);
        
        const campaign = {
          id: `camp_${Date.now()}`,
          productName,
          productUrl,
          valueProposition,
          targetIcp,
          country: country || 'Global',
          city: city || '',
          embeddingLength: vector.length,
          dailyQuota: 25,
          created: new Date().toISOString()
        };

        if (supabase) {
          try {
            await supabase.from('user_campaigns').insert([{
              user_email: getCookie(req, 'firstleads_auth') || 'anonymous',
              product_name: productName,
              product_url: productUrl,
              value_proposition: valueProposition,
              target_icp: targetIcp,
              location_country: country || 'Global',
              location_city: city || '',
              embedding: vector
            }]);
          } catch (e) {
            console.error('Supabase campaign creation error:', e.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, campaign }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/daemon/status' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getDaemonStatus()));
    return;
  }

  if (url === '/api/daemon/start' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { interval } = JSON.parse(body || '{}');
        startExpleeDaemon(interval || 10);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, daemon: getDaemonStatus() }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url === '/api/daemon/stop' && method === 'POST') {
    stopExpleeDaemon();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, daemon: getDaemonStatus() }));
    return;
  }

  if (url === '/api/leads/purge' && method === 'POST') {
    const purged = purgeExpiredLeads(30);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, purged }));
    return;
  }

  if (url === '/api/scout/instant' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { keywords, country, city } = JSON.parse(body || '{}');
        const instantLeads = await getInstantLeadsForICP(keywords || ['b2b srvices'], country || 'Global', city || '');
        
        const matchesPath = path.join(__dirname, 'matches.json');
        fs.writeFileSync(matchesPath, JSON.stringify(instantLeads, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(instantLeads));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static File Server
  const cleanUrl = url.split('?')[0];
  let targetFile = '';
  if (cleanUrl === '' || cleanUrl === '/' || cleanUrl === '/index.html' || cleanUrl === 'index.html') {
    targetFile = 'index.html';
  } else if (cleanUrl === '/dashboard' || cleanUrl === '/dashboard.html' || cleanUrl === 'dashboard.html') {
    targetFile = 'dashboard.html';
  } else {
    targetFile = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
  }

  let filePath = path.join(__dirname, targetFile);
  
  const ext = path.extname(filePath) || '.html';
  const fileBase = path.basename(filePath);
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.css', '.js', '.json', '.html'];
  const isAllowedFile = 
    cleanUrl === '' ||
    cleanUrl === '/' ||
    cleanUrl === '/dashboard' ||
    cleanUrl === '/dashboard.html' ||
    fileBase === 'index.html' || 
    fileBase === 'dashboard.html' || 
    fileBase === 'dashboard.js' || 
    fileBase === 'wall.js' || 
    fileBase === 'wall.css' || 
    allowedExtensions.includes(ext);

  if (!isAllowedFile || !filePath.startsWith(__dirname)) {
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`FirstLeads Marketing Dashboard is active!`);
  console.log(`Open in browser: http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to terminate the dashboard server.`);
  console.log(`==================================================`);
  startExpleeDaemon(10);
});
