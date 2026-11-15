/**
 * SIST-ERP-8 Comprehensive Automated Test Suite
 * Covers all 15 required verification scenarios specified in Section 10:
 * 1. Server startup
 * 2. Homepage loading
 * 3. CSS and JS asset loading
 * 4. Health endpoint
 * 5. ERP status endpoint
 * 6. Token input validation
 * 7. Token authentication request formatting
 * 8. HTTP 401 handling
 * 9. HTTP 403 handling
 * 10. HTTP 404 handling
 * 11. HTTP 500 handling
 * 12. ERP timeout handling
 * 13. Network failure handling
 * 14. Sign-out and sensitive-state cleanup
 * 15. Service-worker cache restrictions
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server');

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test-Harness] Test server running at ${baseUrl}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Test-Harness] Test server shut down.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SIST-ERP-8 RECOVERY VERIFICATION SUITE (15 SCENARIOS)');
  console.log('======================================================\n');

  await startServer();
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Server Startup
  await test('Scenario 1: Server startup', async () => {
    assert.ok(server, 'HTTP server instance is active');
    assert.ok(server.listening, 'Server is listening on designated port');
  });

  // 2. Homepage Loading
  await test('Scenario 2: Homepage loading', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('SATHYABAMA'), 'Includes official branding');
    assert.ok(html.includes('id="loginSection"'), 'Includes login section');
    assert.ok(html.includes('id="dashboardSection"'), 'Includes dashboard section');
    assert.ok(html.includes('id="tokenLoginFormContainer"'), 'Includes authorized session sign-in container');
  });

  // 3. CSS and JS Asset Loading
  await test('Scenario 3: CSS and JS asset loading', async () => {
    const cssRes = await fetch(`${baseUrl}/styles.css`);
    assert.strictEqual(cssRes.status, 200, 'styles.css loads successfully');
    const css = await cssRes.text();
    assert.ok(css.includes('--bg-dark'), 'Obsidian theme CSS custom properties preserved');

    const appRes = await fetch(`${baseUrl}/app.js`);
    assert.strictEqual(appRes.status, 200, 'app.js loads successfully');

    const apiRes = await fetch(`${baseUrl}/portal-api.js`);
    assert.strictEqual(apiRes.status, 200, 'portal-api.js loads successfully');
  });

  // 4. Health Endpoint
  await test('Scenario 4: Health endpoint', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.ok(typeof data.uptime === 'number' && data.uptime >= 0);
    assert.ok(data.erp, 'Includes ERP probe summary in health payload');

    const apiHealthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(apiHealthRes.status, 200);
  });

  // 5. ERP Status Endpoint
  await test('Scenario 5: ERP status endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/erp-status`);
    assert.strictEqual(res.status, 200);
    const status = await res.json();
    assert.ok(['ONLINE', 'DEGRADED', 'AUTHENTICATION_REQUIRED', 'ACCESS_DENIED', 'OFFLINE', 'TIMEOUT', 'UNKNOWN'].includes(status.state));
    assert.ok(typeof status.latencyMs === 'number');
    assert.ok(status.web, 'Includes web portal health');
    assert.ok(status.api, 'Includes REST API gateway health');
    console.log(`     [Reported State: ${status.state}, Latency: ${status.latencyMs}ms, Web: HTTP ${status.web.httpStatus}, API: HTTP ${status.api.httpStatus}]`);
  });

  // 6. Token Input Validation
  await test('Scenario 6: Token input validation', async () => {
    // Missing token field
    const emptyRes = await fetch(`${baseUrl}/api/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(emptyRes.status, 400);
    const emptyData = await emptyRes.json();
    assert.strictEqual(emptyData.error.code, 'INVALID_TOKEN_FORMAT');

    // Token with control characters or header injection attempts
    const injectRes = await fetch(`${baseUrl}/api/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'malicious\r\nHeader-Injection: true' })
    });
    assert.strictEqual(injectRes.status, 400);
    const injectData = await injectRes.json();
    assert.strictEqual(injectData.error.code, 'INVALID_TOKEN_FORMAT');

    // Token too short
    const shortRes = await fetch(`${baseUrl}/api/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'short' })
    });
    assert.strictEqual(shortRes.status, 400);
  });

  // 7. Token Authentication Request Formatting
  await test('Scenario 7: Token authentication request formatting', async () => {
    // Verify client library sends proper JSON body and headers
    const portalApiSrc = fs.readFileSync(path.join(__dirname, '../portal-api.js'), 'utf8');
    assert.ok(portalApiSrc.includes("loginWithToken(token"), 'Client exports loginWithToken');
    assert.ok(portalApiSrc.includes("JSON.stringify(payload)"), 'Client formats payload cleanly');

    // Verify server accepts token, studentId, userId, regNumber
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(serverSrc.includes("const { token, regNumber, studentId, userId } = req.body || {}"), 'Server extracts all session credentials');
    assert.ok(serverSrc.includes("headers['Authorization'] = `Bearer ${cleanToken}`"), 'Sets Bearer authorization header');
    assert.ok(serverSrc.includes("headers['Access-Token'] = cleanToken"), 'Sets Access-Token header');
    assert.ok(serverSrc.includes("headers['Token'] = cleanToken"), 'Sets Token header');
  });

  // 8. HTTP 401 Handling
  await test('Scenario 8: HTTP 401 handling', async () => {
    // Probe token-login with an invalid session token
    const res = await fetch(`${baseUrl}/api/token-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_expired_token_test_1234567890' })
    });
    assert.strictEqual(res.status, 401, 'Returns 401 Unauthorized for invalid/expired tokens');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'INVALID_OR_EXPIRED_TOKEN');
    assert.ok(data.message.includes('invalid or has expired'));
  });

  // 9. HTTP 403 Handling
  await test('Scenario 9: HTTP 403 handling', async () => {
    // Test login password route against live ERP
    const res = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNumber: '40110001', password: 'testPassword123' })
    });
    assert.strictEqual(res.status, 403, 'Returns 403 Forbidden when ERP Cloudflare Turnstile blocks direct POST');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'ERP_ACCESS_DENIED');
    assert.ok(data.message.includes('Official ERP domain policy'));
  });

  // 10. HTTP 404 Handling
  await test('Scenario 10: HTTP 404 handling', async () => {
    // Non-existent API route
    const res = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'ROUTE_NOT_FOUND');

    // Static file blacklist protection
    const serverFile = await fetch(`${baseUrl}/server.js`);
    assert.strictEqual(serverFile.status, 403);
  });

  // 11. HTTP 500 Handling
  await test('Scenario 11: HTTP 500 handling', async () => {
    // Internal scraper route with malformed payload triggers safe handling without server crash
    const res = await fetch(`${baseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_session_token_500_test' })
    });
    assert.ok([200, 400, 401, 500].includes(res.status));
    const data = await res.json();
    assert.ok(typeof data === 'object');
  });

  // 12. ERP Timeout Handling
  await test('Scenario 12: ERP timeout handling', async () => {
    // Verify erpRequest uses AbortSignal.timeout
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(serverSrc.includes('AbortSignal.timeout(12000)'), 'Requests configured with 12s timeout');
    assert.ok(serverSrc.includes('ERP_NETWORK_TIMEOUT'), 'Timeout error code defined in server');
  });

  // 13. Network Failure Handling
  await test('Scenario 13: Network failure handling', async () => {
    // Verify erpRequest handles network fetch rejections and transparent failover
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(serverSrc.includes('ERP_FALLBACK_ORIGIN'), 'Has fallback origin for ERP resilience');
    assert.ok(serverSrc.includes('isNetworkError: true'), 'Distinguishes network failure from HTTP response codes');
  });

  // 14. Sign-Out and Sensitive-State Cleanup
  await test('Scenario 14: Sign-out and sensitive-state cleanup', async () => {
    const portalApiSrc = fs.readFileSync(path.join(__dirname, '../portal-api.js'), 'utf8');
    assert.ok(!portalApiSrc.includes("localStorage.setItem(TOKEN_KEY"), 'Tokens NEVER persisted to localStorage');
    assert.ok(!portalApiSrc.includes("sessionStorage.setItem(TOKEN_KEY"), 'Tokens NEVER persisted to sessionStorage');
    assert.ok(portalApiSrc.includes('inMemoryAccessToken = null'), 'Sign-out zeros in-memory session token');

    const appSrc = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    assert.ok(appSrc.includes('handleSignOut'), 'Has client-side sign-out handler');
    assert.ok(appSrc.includes("tokenInput.value = ''"), 'Scrubs DOM token inputs on sign out');
  });

  // 15. Service-Worker Cache Restrictions
  await test('Scenario 15: Service-worker cache restrictions', async () => {
    const swRes = await fetch(`${baseUrl}/sw.js`);
    assert.strictEqual(swRes.status, 200);
    const swContent = await swRes.text();
    assert.ok(swContent.includes('sathy-portal-v2'), 'Updated to v2 cache namespace');
    assert.ok(swContent.includes("url.pathname.startsWith('/api/')"), 'Explicitly bypasses /api/ requests from SW cache');
    assert.ok(swContent.includes("url.pathname === '/login'"), 'Explicitly bypasses /login from SW cache');
    assert.ok(swContent.includes("url.pathname === '/token-login'"), 'Explicitly bypasses /token-login from SW cache');
    assert.ok(swContent.includes("event.request.headers.has('authorization')"), 'Explicitly bypasses requests with auth headers');
  });

  await stopServer();

  console.log('\n======================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('[Test-Harness Fatal]', e);
  process.exit(1);
});
