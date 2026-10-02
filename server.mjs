import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4180);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const requested = decodeURIComponent(url.pathname);
    const target = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    if (!target.startsWith(root) || requested.includes('..') || !['.html', '.css', '.js', '.png', '.svg'].includes(path.extname(target))) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const file = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(file);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`THINK 1 词汇手账 · http://localhost:${port}`));
