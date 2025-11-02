require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve jQuery from node_modules
app.use('/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

// RENAMED: Using /pg instead of /proxy to avoid ad blockers
const PROXY_PATH = process.env.PROXY_PATH || '/pg'; // "pg" = payment gateway
const targetHost = process.env.TARGET_HOST || 'https://dhamendemo.elm.sa';
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || null; // Set this in production (e.g., 'https://poc.vastmenu.com')

// Helper function to get the correct base origin
function getBaseOrigin(req) {
  // If PUBLIC_DOMAIN is set, use it (production override)
  if (PUBLIC_DOMAIN) {
    console.log(`[ORIGIN] Using PUBLIC_DOMAIN: ${PUBLIC_DOMAIN}`);
    return PUBLIC_DOMAIN;
  }
  
  // Check for reverse proxy headers first (nginx, apache, load balancer)
  const forwardedProto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'];
  
  const baseOrigin = `${forwardedProto}://${forwardedHost}`;
  console.log(`[ORIGIN] Detected from headers: ${baseOrigin} (X-Forwarded-Host: ${req.headers['x-forwarded-host']}, Host: ${req.headers['host']})`);
  
  return baseOrigin;
}

// Handle CORS preflight requests
app.options(`${PROXY_PATH}/*`, (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Proxy middleware to forward requests to the remote host and inject CORS header
app.use(PROXY_PATH, createProxyMiddleware({
  target: targetHost,
  changeOrigin: true,
  secure: true,
  selfHandleResponse: true,
  pathRewrite: (pathReq) => {
    const rewritten = pathReq.replace(new RegExp(`^${PROXY_PATH}`), '');
    console.log(`[PROXY] ${pathReq} -> ${targetHost}${rewritten}`);
    return rewritten;
  },
  // Disable compression to avoid content decoding issues
  headers: {
    'Accept-Encoding': 'identity',
    'User-Agent': 'PaymentGatewayProxy/1.0'
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY REQ] ${req.method} ${targetHost}${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${req.url}:`, err.message);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({ 
      error: 'Proxy Error', 
      message: err.message,
      url: req.url,
      target: targetHost 
    }));
  },
  onProxyRes: async (proxyRes, req, res) => {
    try {
      // Collect response body
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        let body = Buffer.concat(chunks);
        const contentType = (proxyRes.headers['content-type'] || '').toString();

        // If this is the widget JS, rewrite absolute remote origin to point to our local proxy
        if (/javascript|application\/ecmascript|text\/.+javascript/.test(contentType) || req.url.includes('/widget')) {
          try {
            let text = body.toString('utf8');
            
            // Get the correct base origin (production domain or detected from headers)
            const baseOrigin = getBaseOrigin(req);
            
            // Replace ELM's URLs with our proxy path
            const replacementUrl = `${baseOrigin}${PROXY_PATH}`;
            text = text.replace(/https?:\/\/dhamendemo\.elm\.sa/g, replacementUrl);
            
            body = Buffer.from(text, 'utf8');
            proxyRes.headers['content-length'] = Buffer.byteLength(body);
            
            console.log(`[PROXY] Rewrote ${req.url} - replaced ${targetHost} with ${replacementUrl}`);
          } catch (e) {
            console.error('Failed to rewrite widget JS:', e.message);
          }
        }

        // Ensure CORS headers for browser
        const baseOrigin = getBaseOrigin(req);
        const reqOrigin = req.headers.origin || baseOrigin;
        
        proxyRes.headers['Access-Control-Allow-Origin'] = reqOrigin;
        proxyRes.headers['Vary'] = [proxyRes.headers['Vary'], 'Origin'].filter(Boolean).join(', ');
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization';

        // Remove compression-related headers
        delete proxyRes.headers['content-encoding'];
        delete proxyRes.headers['transfer-encoding'];

        // Log response status
        console.log(`[PROXY RES] ${req.url} - Status: ${proxyRes.statusCode}`);

        // Send modified response back to client
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(body);
      });
      
      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err.message);
        res.writeHead(500);
        res.end('Proxy response error');
      });
    } catch (err) {
      console.error('onProxyRes handler error:', err.message);
      res.writeHead(500);
      res.end('Proxy error');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => res.json({ 
  ok: true, 
  proxyPath: PROXY_PATH,
  target: targetHost,
  uptime: process.uptime() 
}));

// Metrics endpoint
let requestCount = 0;
let errorCount = 0;

app.use((req, res, next) => {
  requestCount++;
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      errorCount++;
    }
  });
  next();
});

app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    requestCount,
    errorCount,
    memory: process.memoryUsage(),
    proxyPath: PROXY_PATH,
    target: targetHost
  });
});

const port = process.env.PORT || 8080;
const useHttps = process.env.USE_HTTPS === 'true';
const certPath = process.env.CERT_PATH || path.join(__dirname, 'cert.pem');
const keyPath = process.env.KEY_PATH || path.join(__dirname, 'key.pem');

if (useHttps) {
  // Check if certificate files exist
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error(`Certificate files not found:`);
    console.error(`  CERT_PATH: ${certPath}`);
    console.error(`  KEY_PATH: ${keyPath}`);
    console.error('Set USE_HTTPS=false to run without SSL, or provide valid certificate paths.');
    process.exit(1);
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(options, app).listen(port, () => {
    console.log(`✓ HTTPS server running at https://127.0.0.1:${port}`);
    console.log(`✓ Proxying ${PROXY_PATH}/* -> ${targetHost}`);
    console.log(`✓ Health check: https://127.0.0.1:${port}/health`);
  });
} else {
  app.listen(port, () => {
    console.log(`✓ HTTP server running at http://127.0.0.1:${port}`);
    console.log(`✓ Proxying ${PROXY_PATH}/* -> ${targetHost}`);
    console.log(`✓ Health check: http://127.0.0.1:${port}/health`);
  });
}

