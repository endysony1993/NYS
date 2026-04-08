const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const contactHandler = require('./api/contact');

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };

  return contentTypes[extension] || 'application/octet-stream';
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function createResponseAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    json(payload) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
      return this;
    }
  };
}

function serveStaticFile(res, pathname) {
  const safePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(rootDir, safePath);

  if (!resolvedPath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden.' });
    return;
  }

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found.' });
        return;
      }

      sendJson(res, 500, { error: 'Unable to read file.' });
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(resolvedPath));
    res.end(content);
  });
}

loadEnvFile(path.join(rootDir, '.env'));

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/contact') {
    try {
      req.body = await readRequestBody(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON payload.' });
      return;
    }

    await contactHandler(req, createResponseAdapter(res));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  serveStaticFile(res, requestUrl.pathname);
});

server.listen(port, () => {
  console.log(`NYS site available at http://localhost:${port}`);
});