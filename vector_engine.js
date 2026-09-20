/**
 * Vector Embedding & Similarity Engine for FirstLeads (Explee-Plus)
 * 100% Free Vector Generation via HuggingFace Inference API with Local TF-IDF Fallback Guard
 */

const https = require('https');

// Free HuggingFace Feature Extraction Endpoint (all-MiniLM-L6-v2 outputs 384-dim vectors)
const HF_MODEL_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

// 384-dimension local hash vectorizer fallback
function generateLocalFallbackVector(text) {
  const vector = new Array(384).fill(0);
  if (!text) return vector;
  
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return vector;
  
  words.forEach(word => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 384;
    vector[idx] += 1;
  });
  
  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < 384; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 384; i++) vector[i] /= norm;
  }
  
  return vector;
}

function generateVectorEmbedding(text) {
  return new Promise((resolve) => {
    if (!text || text.trim().length === 0) {
      return resolve(generateLocalFallbackVector('b2b software lead'));
    }

    const postData = JSON.stringify({ inputs: text.substring(0, 500) });
    const options = {
      hostname: 'api-inference.huggingface.co',
      path: '/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FirstLeads-Vector-Agent/2.0'
      },
      timeout: 3500
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const arr = JSON.parse(body);
            // Handle nested array outputs
            const flatVec = Array.isArray(arr[0]) ? arr[0] : arr;
            if (Array.isArray(flatVec) && flatVec.length === 384) {
              return resolve(flatVec);
            }
          }
          resolve(generateLocalFallbackVector(text));
        } catch (e) {
          resolve(generateLocalFallbackVector(text));
        }
      });
    });

    req.on('error', () => resolve(generateLocalFallbackVector(text)));
    req.on('timeout', () => {
      req.destroy();
      resolve(generateLocalFallbackVector(text));
    });

    req.write(postData);
    req.end();
  });
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateVectorEmbedding,
  generateLocalFallbackVector,
  cosineSimilarity
};
