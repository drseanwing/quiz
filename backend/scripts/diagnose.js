#!/usr/bin/env node
/**
 * Container diagnostic script — run inside the container to check:
 * 1. Environment variables are set
 * 2. Database is reachable
 * 3. Server is listening on the expected port
 * 4. Login endpoint responds
 *
 * Usage: docker exec redi-quiz-backend node scripts/diagnose.js
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

function httpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, (res) => {
      let responseBody = '';
      res.on('data', (c) => (responseBody += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== REdI Quiz Platform - Container Diagnostics ===\n');

  // 1. Check environment variables
  console.log('1. Environment variables:');
  const vars = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGIN'];
  for (const v of vars) {
    const val = process.env[v];
    if (!val) {
      console.log(`   ${v}: *** NOT SET ***`);
    } else if (v === 'DATABASE_URL' || v.includes('SECRET')) {
      console.log(`   ${v}: (set, ${val.length} chars)`);
    } else {
      console.log(`   ${v}: ${val}`);
    }
  }
  console.log('');

  // 2. Check if node process is listening
  console.log(`2. Server on port ${PORT}:`);
  try {
    const result = execSync(`netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null`, { encoding: 'utf8' });
    const listening = result.split('\n').filter((l) => l.includes(`:${PORT}`));
    if (listening.length > 0) {
      console.log(`   LISTENING - ${listening[0].trim()}`);
    } else {
      console.log('   *** NOT LISTENING ***');
      console.log('   The server is not bound to the expected port.');
    }
  } catch {
    console.log('   (could not check — netstat/ss not available)');
  }
  console.log('');

  // 3. Health check
  console.log('3. Health check (GET /api/health):');
  try {
    const health = await httpRequest('GET', '/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Body: ${JSON.stringify(health.body)}`);
  } catch (err) {
    console.log(`   *** FAILED: ${err.message} ***`);
  }
  console.log('');

  // 4. Login test
  console.log('4. Login test (POST /api/auth/login):');
  try {
    const login = await httpRequest('POST', '/api/auth/login', {
      email: 'admin@health.qld.gov.au',
      password: 'Password1!',
    });
    console.log(`   Status: ${login.status}`);
    if (login.status === 200 && login.body?.success) {
      console.log(`   SUCCESS — logged in as ${login.body.data?.user?.email} (${login.body.data?.user?.role})`);
    } else {
      console.log(`   FAILED — ${JSON.stringify(login.body)}`);
    }
  } catch (err) {
    console.log(`   *** FAILED: ${err.message} ***`);
  }
  console.log('');

  // 5. Check log files
  console.log('5. Log files:');
  try {
    const { statSync, readFileSync } = require('fs');
    for (const f of ['/app/logs/error.log', '/app/logs/combined.log']) {
      try {
        const stat = statSync(f);
        console.log(`   ${f}: ${stat.size} bytes`);
        if (stat.size > 0 && f.includes('error')) {
          const tail = readFileSync(f, 'utf8').split('\n').filter(Boolean).slice(-3).join('\n   ');
          console.log(`   Last errors:\n   ${tail}`);
        }
      } catch {
        console.log(`   ${f}: does not exist`);
      }
    }
  } catch {
    console.log('   (could not check log files)');
  }

  console.log('\n=== Diagnostics complete ===');
}

main().catch((err) => {
  console.error('Diagnostic script failed:', err);
  process.exit(1);
});
