const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Proxy middleware to forward requests to the remote host and inject CORS header
const targetHost = 'https://dhamendemo.elm.sa';
app.use('/proxy', createProxyMiddleware({
  target: targetHost,
  changeOrigin: true,
  secure: true,
  selfHandleResponse: true, // we'll stream & optionally modify some responses
  pathRewrite: (pathReq) => pathReq.replace(/^\/proxy/, ''),
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
            // Replace remote host occurrences with local proxy path so the widget's XHR calls go through us
            const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
            const host = req.headers.host;
            const baseOrigin = `${proto}://${host}`;
            text = text.replace(/https?:\/\/dhamendemo\.elm\.sa/g, `${baseOrigin}/proxy`);
            body = Buffer.from(text, 'utf8');
            proxyRes.headers['content-length'] = Buffer.byteLength(body);
          } catch (e) {
            // if rewrite fails, continue with original body
            console.error('Failed to rewrite widget JS:', e.message);
          }
        }

        // Ensure CORS headers for browser (echo the request origin if present)
        const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
        const host = req.headers.host;
        const baseOrigin = `${proto}://${host}`;
        const reqOrigin = req.headers.origin || baseOrigin;
        proxyRes.headers['Access-Control-Allow-Origin'] = reqOrigin;
        // Helpful when different origins may hit the proxy
        proxyRes.headers['Vary'] = [proxyRes.headers['Vary'], 'Origin'].filter(Boolean).join(', ');
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization';

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

// Helpful endpoint to check CORS
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`HTTP server running at http://127.0.0.1:${port}`);
  console.log('Proxying /proxy/* ->', targetHost);
});
