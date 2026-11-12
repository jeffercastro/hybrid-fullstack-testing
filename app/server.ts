import http from 'http';

export interface AccountRecord {
  id: string;
  name: string;
  email: string;
  balance: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  created_at: string;
}

// Data store representing database tables
export const databaseStore: Map<string, AccountRecord> = new Map();

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // --- INTERNAL DB QUERY INTERFACE: GET /internal/db/accounts/:id ---
    // Simulates direct DB access over the process boundary
    if (method === 'GET' && url.pathname.startsWith('/internal/db/accounts/')) {
      const id = url.pathname.replace('/internal/db/accounts/', '');
      const record = databaseStore.get(id);
      if (!record) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Record not found in DB' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(record));
      return;
    }

    // --- API: POST /api/accounts (Data Seeding) ---
    if (method === 'POST' && url.pathname === '/api/accounts') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const id = data.id || `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const record: AccountRecord = {
            id,
            name: data.name || 'Test User',
            email: data.email || 'test@example.com',
            balance: typeof data.balance === 'number' ? data.balance : 1000,
            status: data.status || 'ACTIVE',
            created_at: new Date().toISOString(),
          };
          databaseStore.set(id, record);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(record));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // --- API: GET /api/accounts/:id ---
    if (method === 'GET' && url.pathname.startsWith('/api/accounts/')) {
      const id = url.pathname.replace('/api/accounts/', '');
      const record = databaseStore.get(id);
      if (!record) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(record));
      return;
    }

    // --- API: PUT /api/accounts/:id/status ---
    if (method === 'PUT' && url.pathname.includes('/status')) {
      const parts = url.pathname.split('/');
      const id = parts[3];
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const record = databaseStore.get(id);
        if (!record) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Account not found' }));
          return;
        }
        const data = JSON.parse(body || '{}');
        if (data.status) record.status = data.status;
        databaseStore.set(id, record);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(record));
      });
      return;
    }

    // --- API: DELETE /api/accounts/:id (Teardown) ---
    if (method === 'DELETE' && url.pathname.startsWith('/api/accounts/')) {
      const id = url.pathname.replace('/api/accounts/', '');
      const deleted = databaseStore.delete(id);
      if (deleted) {
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
      }
      return;
    }

    // --- UI: GET /dashboard/:id ---
    if (method === 'GET' && url.pathname.startsWith('/dashboard/')) {
      const id = url.pathname.replace('/dashboard/', '');
      const record = databaseStore.get(id);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Management Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 22px; margin-bottom: 20px; color: #38bdf8; }
    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155; }
    .label { color: #94a3b8; font-weight: 500; }
    .val { font-weight: 600; color: #f1f5f9; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 13px; text-transform: uppercase; font-weight: bold; }
    .badge-ACTIVE { background: #166534; color: #4ade80; }
    .badge-SUSPENDED { background: #991b1b; color: #f87171; }
    .badge-CLOSED { background: #475569; color: #cbd5e1; }
    .actions { margin-top: 24px; display: flex; gap: 12px; }
    button { flex: 1; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .btn-suspend { background: #dc2626; color: white; }
    .btn-suspend:hover { background: #b91c1c; }
    .btn-activate { background: #16a34a; color: white; }
    .btn-activate:hover { background: #15803d; }
    .btn-deposit { background: #2563eb; color: white; }
    .btn-deposit:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card" id="account-card">
    <h1>Account Dashboard</h1>
    ${record ? `
    <div class="row"><span class="label">Account ID</span><span class="val" id="account-id">${record.id}</span></div>
    <div class="row"><span class="label">Holder Name</span><span class="val" id="account-name">${record.name}</span></div>
    <div class="row"><span class="label">Email</span><span class="val" id="account-email">${record.email}</span></div>
    <div class="row"><span class="label">Current Balance</span><span class="val" id="account-balance">$${record.balance.toFixed(2)}</span></div>
    <div class="row"><span class="label">Status</span><span class="badge badge-${record.status}" id="account-status">${record.status}</span></div>

    <div class="actions">
      <button class="btn-suspend" id="btn-toggle-status" onclick="toggleStatus()">${record.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}</button>
      <button class="btn-deposit" id="btn-add-funds" onclick="addFunds()">Deposit $500</button>
    </div>
    ` : `<p id="not-found-msg">Account record not found</p>`}
  </div>

  <script>
    async function toggleStatus() {
      const current = document.getElementById('account-status').innerText.trim();
      const nextStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await fetch('/api/accounts/${id}/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      location.reload();
    }

    async function addFunds() {
      const rawBalance = document.getElementById('account-balance').innerText.replace('$', '');
      const newBalance = parseFloat(rawBalance) + 500;
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '${id}', name: document.getElementById('account-name').innerText, email: document.getElementById('account-email').innerText, balance: newBalance, status: document.getElementById('account-status').innerText.trim() })
      });
      location.reload();
    }
  </script>
</body>
</html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });
}
