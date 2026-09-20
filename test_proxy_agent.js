const https = require('https');

function fetchProxies() {
  return new Promise((resolve) => {
    const url = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&proxy_type=http';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const list = data.split('\n')
          .map(l => l.trim())
          .filter(l => l.startsWith('http://') || l.startsWith('https://'));
        resolve(list);
      });
    }).on('error', () => resolve([]));
  });
}

async function runTest() {
  console.log("Loading HttpsProxyAgent dynamically...");
  const { HttpsProxyAgent } = await import('https-proxy-agent');
  
  console.log("Fetching proxy list from ProxyScrape...");
  const list = await fetchProxies();
  console.log(`Fetched ${list.length} HTTP proxies! Testing first few...`);
  
  const query = encodeURIComponent('site:reddit.com robo advisor');
  const targetUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  
  for (let i = 0; i < Math.min(list.length, 15); i++) {
    const proxyStr = list[i];
    console.log(`Testing proxy ${i + 1}: ${proxyStr}`);
    try {
      const agent = new HttpsProxyAgent(proxyStr);
      
      const success = await new Promise((resolveOpt) => {
        const req = https.get(targetUrl, { 
          agent, 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0' },
          timeout: 5000,
          rejectUnauthorized: false // Skip SSL validation for proxy tunnels
        }, (res) => {
          console.log(`  Proxy status code: ${res.statusCode}`);
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200 && body.includes('<item>')) {
              console.log("  SUCCESS! Found items in feed via proxy!");
              resolveOpt(true);
            } else {
              resolveOpt(false);
            }
          });
        });
        req.on('error', (err) => {
          console.log(`  Proxy connection error: ${err.message}`);
          resolveOpt(false);
        });
        req.on('timeout', () => {
          req.destroy();
          console.log("  Proxy request timed out.");
          resolveOpt(false);
        });
      });
      
      if (success) {
        break;
      }
    } catch (e) {
      console.log(`  Failed initialization: ${e.message}`);
    }
  }
}

runTest();
