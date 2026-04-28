#!/usr/bin/env node
/**
 * DADLIFTS DEPLOY
 * Run by OpenClaw when Nic says "redeploy dadlifts" or similar.
 * Pulls latest main, rebuilds frontend, restarts PM2.
 *
 * Usage: node cli/deploy.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, label) {
  console.error(`→ ${label}`);
  try {
    const out = execSync(cmd, { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    if (out) console.error(out.toString().trim());
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`${label} failed:\n${msg}`);
  }
}

async function deploy() {
  const steps = [
    ['git pull origin main', 'Pull latest from GitHub'],
    ['npm install --omit=dev', 'Install dependencies'],
    ['npm run build', 'Build frontend'],
    ['pm2 restart dadlifts', 'Restart server'],
  ];

  const results = [];

  for (const [cmd, label] of steps) {
    try {
      run(cmd, label);
      results.push({ step: label, status: 'ok' });
    } catch (err) {
      results.push({ step: label, status: 'failed', error: err.message });
      console.log(JSON.stringify({
        success: false,
        failed_at: label,
        completed: results,
        message: `❌ Deploy failed at: ${label}\n\n${err.message}`,
      }, null, 2));
      process.exit(1);
    }
  }

  // Verify the server is up
  const http = require('http');
  await new Promise((resolve) => {
    setTimeout(() => {
      http.get('http://localhost:3001/health', (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          results.push({ step: 'Health check', status: 'ok', response: JSON.parse(data) });
          resolve();
        });
      }).on('error', (err) => {
        results.push({ step: 'Health check', status: 'failed', error: err.message });
        resolve();
      });
    }, 1500);
  });

  const healthy = results.find(r => r.step === 'Health check')?.status === 'ok';

  console.log(JSON.stringify({
    success: healthy,
    steps: results,
    message: healthy
      ? `✅ DΔDLIFTS deployed successfully.\n\nAll ${steps.length} steps completed. Server is healthy.`
      : `⚠️ Deploy completed but health check failed. Check PM2 logs:\n  pm2 logs dadlifts`,
  }, null, 2));
}

deploy();
