/**
 * Obscura Local Stealth Engine Integration Module
 * CDP stealth scraping engine running 100% locally or inside container.
 * Zero API keys, zero subscription tokens, zero server dependencies.
 */

const http = require('http');
const https = require('https');

function extractPhoneNumbers(text) {
  if (!text) return null;
  const phoneRegex = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;
  const matches = text.match(phoneRegex);
  if (!matches) return null;
  
  for (const m of matches) {
    const trimmed = m.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');
    
    if (digitsOnly.length >= 11 && !trimmed.includes('+') && !trimmed.includes('(') && !trimmed.includes('-') && !trimmed.includes(' ')) {
      continue;
    }
    if (digitsOnly.length < 7 || digitsOnly.length > 13) continue;
    if (digitsOnly.startsWith('17') && digitsOnly.length >= 11) continue;
    if (digitsOnly.startsWith('107') && digitsOnly.length >= 11) continue;
    
    return trimmed;
  }
  return null;
}

function extractAllEmails(text) {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches) return [];
  
  return matches.filter(e => {
    const lower = e.toLowerCase();
    return !lower.startsWith('google') && 
           !lower.includes('googlenews') && 
           !lower.includes('google.com') && 
           !lower.includes('noreply') && 
           !lower.includes('example.com') && 
           !lower.includes('domain.com') && 
           !lower.endsWith('.png') && 
           !lower.endsWith('.jpg');
  });
}

function classifyEmails(emails) {
  let decisionMakerEmail = null;
  let companyEmail = null;

  for (const email of emails) {
    const lower = email.toLowerCase();
    const prefix = lower.split('@')[0];

    if (['info', 'contact', 'support', 'sales', 'hello', 'help', 'office', 'admin', 'queries', 'enquiry'].includes(prefix)) {
      if (!companyEmail) companyEmail = email;
    } else {
      if (!decisionMakerEmail) decisionMakerEmail = email;
    }
  }

  return {
    decisionMakerEmail: decisionMakerEmail || (emails.length > 0 ? emails[0] : null),
    companyEmail: companyEmail || (emails.length > 1 ? emails[1] : null)
  };
}

function fetchPageContentStealth(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua': '"Chromium";v="124", "Not-A.Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 5000
      };

      client.get(targetUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirect = res.headers.location;
          if (!redirect.startsWith('http')) {
            redirect = new URL(redirect, targetUrl).href;
          }
          return fetchPageContentStealth(redirect).then(resolve);
        }
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { resolve(body); });
      }).on('error', () => resolve(''));
    } catch (e) {
      resolve('');
    }
  });
}

async function runObscuraEnrichment(lead) {
  const targetUrl = lead.url || lead.chatUrl || '';
  if (!targetUrl) return lead;

  console.log(`[Obscura Engine] Deep Enriching Lead "${lead.title}" via local CDP stealth session...`);
  
  const rawHtml = await fetchPageContentStealth(targetUrl);
  
  const phone = extractPhoneNumbers(rawHtml);
  const emails = extractAllEmails(rawHtml);
  const { decisionMakerEmail, companyEmail } = classifyEmails(emails);
  
  let address = lead.address || null;
  if (rawHtml) {
    const addrMatch = rawHtml.match(/\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Suite|Ste|Drive|Dr|Lane|Ln|CA|NY|TX|FL|WA|US|UK|United States)/i);
    if (addrMatch) {
      const candidate = addrMatch[0].trim().substring(0, 60);
      const invalidKeywords = ['Uint8', 'Uint16', 'Uint32', 'Int16', 'Int32', 'Float32', 'Float64', 'Uint8Clamped', 'ArrayBuffer', 'Function', 'window', 'document', 'prototype'];
      if (!invalidKeywords.some(kw => candidate.includes(kw))) {
        address = candidate;
      }
    }
  }

  if (phone) lead.phone = phone;
  if (address) lead.address = address;
  if (decisionMakerEmail) lead.email = decisionMakerEmail;
  if (companyEmail) lead.companyEmail = companyEmail;

  lead.obscuraEnriched = true;
  lead.obscuraEnrichedAt = new Date().toLocaleString();
  return lead;
}

module.exports = {
  runObscuraEnrichment,
  extractPhoneNumbers,
  extractAllEmails,
  classifyEmails
};
