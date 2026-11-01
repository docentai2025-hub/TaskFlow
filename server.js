#!/usr/bin/env node
'use strict';
/**
 * TaskFlow – simple full-stack student task manager
 * Backend: Node.js built-in HTTP server + built-in SQLite (Node 22.13+)
 * There are deliberately no third-party dependencies.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp' : path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'taskflow.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);
`);

const PORT = Number(process.env.PORT) || 3000;
const SESSION_DAYS = 7;
const SESSION_COOKIE = 'taskflow_session';
const publicDir = path.join(ROOT, 'public');
const contentTypes = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};

function respond(res, code, data, headers = {}) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...headers});
  res.end(JSON.stringify(data));
}
function fail(res, code, error) { respond(res, code, { error }); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function makePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function cookieHeader(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}
function getCookie(req, key) {
  const all = req.headers.cookie || '';
  for (const part of all.split(';')) {
    const index = part.indexOf('=');
    if (index !== -1 && part.slice(0,index).trim() === key) return part.slice(index+1).trim();
  }
  return '';
}
function getUser(req) {
  const token = getCookie(req, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(`SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id=s.user_id
                     WHERE s.token_hash=? AND s.expires_at > datetime('now')`).get(sha256(token)) || null;
}
function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now', '+7 days'))`).run(sha256(token), userId);
  res.setHeader('Set-Cookie', cookieHeader(token, SESSION_DAYS*24*3600));
}
async function readJSON(req) {
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw Object.assign(new Error('Send JSON data.'), { code: 415 });
  let contents = '';
  for await (const chunk of req) {
    contents += chunk;
    if (contents.length > 100_000) throw Object.assign(new Error('Request is too large.'), { code: 413 });
  }
  try {
    const obj = JSON.parse(contents);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error();
    return obj;
  } catch { throw Object.assign(new Error('Invalid JSON object.'), { code: 400 }); }
}
function validateTask(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const priority = body.priority || 'medium';
  const status = body.status || 'pending';
  const dueDate = body.due_date || null;
  if (!title || title.length > 100) return {error:'Task title must be 1–100 characters.'};
  if (description.length > 1000) return {error:'Description must be at most 1000 characters.'};
  if (!['low','medium','high'].includes(priority)) return {error:'Invalid priority.'};
  if (!['pending','in_progress','completed'].includes(status)) return {error:'Invalid status.'};
  if (dueDate !== null && (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate+'T00:00:00Z')))) {
    return {error:'Due date must have YYYY-MM-DD format.'};
  }
  return {title, description, priority, status, due_date:dueDate};
}
function staticFile(res, requestedPath) {
  const filename = requestedPath === '/' ? 'index.html' : decodeURIComponent(requestedPath.slice(1));
  // Restrict frontend files to this small allowlist.
  if (!['index.html','style.css','app.js'].includes(filename)) { fail(res,404,'File not found.'); return; }
  const filepath = path.join(publicDir, filename);
  fs.readFile(filepath, (err, bytes) => {
    if (err) return fail(res,404,'File not found.');
    res.writeHead(200, {'Content-Type':contentTypes[path.extname(filepath)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    res.end(bytes);
  });
}
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;
  if (!pathname.startsWith('/api/')) {
    if (method !== 'GET') return fail(res,405,'Method not allowed.');
    return staticFile(res, pathname);
  }
  if (pathname === '/api/health' && method === 'GET') return respond(res, 200, {status:'ok'});
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readJSON(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || name.length > 60) return fail(res,400,'Name must be 1–60 characters.');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res,400,'Enter a valid email address.');
    if (password.length < 8 || password.length > 128) return fail(res,400,'Password must be 8–128 characters.');
    try {
      const result = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name,email,makePasswordHash(password));
      createSession(res, Number(result.lastInsertRowid));
      return respond(res,201,{user:{id:Number(result.lastInsertRowid),name,email}});
    } catch (err) {
      if (err.message.includes('UNIQUE')) return fail(res,409,'This email is already registered.');
      throw err;
    }
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJSON(req);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const account = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!account || !verifyPassword(password, account.password_hash)) return fail(res,401,'Incorrect email or password.');
    createSession(res, account.id);
    return respond(res,200,{user:{id:account.id,name:account.name,email:account.email}});
  }
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = getUser(req);
    return user ? respond(res,200,{user}) : fail(res,401,'Not signed in.');
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = getCookie(req, SESSION_COOKIE);
    if (/^[a-f0-9]{64}$/.test(token)) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha256(token));
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return respond(res,200,{message:'Signed out.'});
  }
  const user = getUser(req);
  if (!user) return fail(res,401,'Please sign in to continue.');
  if (pathname === '/api/tasks' && method === 'GET') {
    const tasks = db.prepare('SELECT id,title,description,priority,status,due_date,created_at,updated_at FROM tasks WHERE user_id=? ORDER BY id DESC').all(user.id);
    return respond(res,200,{tasks});
  }
  if (pathname === '/api/tasks' && method === 'POST') {
    const task = validateTask(await readJSON(req));
    if (task.error) return fail(res,400,task.error);
    const result = db.prepare(`INSERT INTO tasks(user_id,title,description,priority,status,due_date) VALUES(?,?,?,?,?,?)`)
      .run(user.id,task.title,task.description,task.priority,task.status,task.due_date);
    const created = db.prepare('SELECT * FROM tasks WHERE id=? AND user_id=?').get(Number(result.lastInsertRowid),user.id);
    return respond(res,201,{task:created});
  }
  const match = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (match && ['PUT','DELETE'].includes(method)) {
    const id = Number(match[1]);
    const existing = db.prepare('SELECT id FROM tasks WHERE id=? AND user_id=?').get(id,user.id);
    if (!existing) return fail(res,404,'Task not found.');
    if (method === 'DELETE') {
      db.prepare('DELETE FROM tasks WHERE id=? AND user_id=?').run(id,user.id);
      return respond(res,200,{message:'Task deleted.'});
    }
    const task = validateTask(await readJSON(req));
    if (task.error) return fail(res,400,task.error);
    db.prepare(`UPDATE tasks SET title=?,description=?,priority=?,status=?,due_date=?,updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(task.title,task.description,task.priority,task.status,task.due_date,id,user.id);
    return respond(res,200,{task:db.prepare('SELECT * FROM tasks WHERE id=? AND user_id=?').get(id,user.id)});
  }
  return fail(res,404,'API route not found.');
}

const server = http.createServer((req,res) => {
  route(req,res).catch(err => {
    console.error('Request error:',err);
    if (!res.headersSent) fail(res,err.code || 500,err.code ? err.message : 'Something went wrong.');
    else res.end();
  });
});

if (isVercel) {
  module.exports = server;
} else {
  let currentPort = PORT;
  let attempts = 0;
  const maxAttempts = 10;

  server.on('error', (err) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && !process.env.PORT && attempts < maxAttempts) {
      attempts++;
      console.log(`Port ${currentPort} is unavailable (${err.code}). Trying port ${currentPort + 1}...`);
      currentPort++;
      server.listen(currentPort);
    } else {
      console.error(`Failed to start server on port ${currentPort}:`, err.message);
      process.exit(1);
    }
  });

  server.listen(currentPort, () => {
    console.log(`\n==================================================`);
    console.log(` TaskFlow is running!`);
    console.log(` Open in your browser: http://localhost:${currentPort}`);
    console.log(` Press Ctrl+C to stop.`);
    console.log(`==================================================\n`);
  });
}
