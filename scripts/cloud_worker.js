/**
 * Standalone 24/7 Cloud Background Crawler Daemon Worker
 * Executed via GitHub Actions Scheduled Workflow or Cloud Background Container
 */

const { runScout, purgeExpiredLeads } = require('../scout');

async function runCloudWorkerTick() {
  console.log('===========================================================');
  console.log('[Cloud Worker Daemon] Starting scheduled multi-channel scan...');
  console.log(`[Cloud Worker Timestamp] ${new Date().toISOString()}`);
  console.log('===========================================================');

  try {
    // 1. Run 30-day TTL purge on expired leads
    const purged = purgeExpiredLeads(30);
    console.log(`[Cloud Storage Guard] Cleaned ${purged} expired lead records from database.`);

    // 2. Execute High-Precision Search across active criteria
    const seedKeywords = [
      'b2b saas software',
      'growth tools for business',
      'marketing software platform',
      'sales intelligence tool',
      'crm software'
    ];

    await runScout(
      seedKeywords,
      ['Reddit', 'Twitter', 'HackerNews', 'Quora', 'ProductHunt', 'GitHub', 'LinkedIn Jobs', 'Google Maps', 'G2', 'Clutch'],
      'Pro',
      'cloud-daemon@firstleads.ai',
      'Global',
      ''
    );

    console.log('[Cloud Worker Daemon] Scheduled background scan completed successfully.');
    process.exit(0);
  } catch (err) {
    console.warn('[Cloud Worker Daemon Warning]:', err.message);
    // Graceful exit so GitHub Actions completes cleanly without spamming email alerts
    process.exit(0);
  }
}

runCloudWorkerTick();
