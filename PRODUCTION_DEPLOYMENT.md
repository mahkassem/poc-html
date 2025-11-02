# Production Deployment Guide

## Understanding ERR_BLOCKED_BY_CLIENT Error

The `ERR_BLOCKED_BY_CLIENT` error in production typically occurs due to:

### 1. **Ad Blockers** (Most Common)
Ad blockers often block URLs containing keywords like:
- `api`, `feapi`, `proxy`
- `analytics`, `tracking`
- Certain patterns that match advertising networks

**Solutions:**
- Ask users to whitelist your domain
- Use a different proxy path name (e.g., `/api-gateway`, `/payment-gateway`)
- Use a subdomain for the proxy (e.g., `api.yourdomain.com`)

### 2. **Browser Extensions**
Security extensions, privacy tools, or corporate security policies may block requests.

### 3. **CORS Preflight Issues**
The browser sends OPTIONS requests before actual requests, which must be handled properly.

### 4. **Duplicate Path Issue**
The URL `/proxy/feapi/feapi/...` shows path duplication, which suggests the ELM widget is prepending paths.

---

## Why You NEED the Proxy Server in Production

You **CANNOT** bypass the proxy server because:

1. ✅ **ELM's server doesn't have CORS headers** - Direct requests from browser will fail
2. ✅ **Browser security (Same-Origin Policy)** - Prevents direct cross-origin requests
3. ✅ **Widget URL rewriting** - The proxy rewrites internal widget URLs to use your proxy
4. ✅ **Security** - Keeps your integration secure

---

## Production Deployment Checklist

### 1. **Use a Subdomain for API/Proxy** (Recommended)
Instead of using `/proxy` path, use a subdomain:

**Setup:**
```nginx
# Nginx configuration
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Update your code:**
```javascript
// Instead of /proxy, use full subdomain
const targetHost = 'https://dhamendemo.elm.sa';
app.use('/', createProxyMiddleware({...}));
```

### 2. **Alternative: Rename Proxy Path**
Change `/proxy` to something less likely to be blocked:

```javascript
// server.js
app.use('/payment-gateway', createProxyMiddleware({...}));

// cardpayment.html
<script src="/payment-gateway/widget/dhamen-pay.js" type="text/javascript"></script>
```

### 3. **Environment Variables for Production**
Create a `.env.production` file:

```env
PORT=8080
USE_HTTPS=true
CERT_PATH=/path/to/cert.pem
KEY_PATH=/path/to/key.pem
TARGET_HOST=https://dhamendemo.elm.sa
PROXY_PATH=/proxy
```

Update `server.js`:
```javascript
const targetHost = process.env.TARGET_HOST || 'https://dhamendemo.elm.sa';
const proxyPath = process.env.PROXY_PATH || '/proxy';

app.use(proxyPath, createProxyMiddleware({...}));
```

### 4. **Docker Production Best Practices**

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  payment-widget:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - USE_HTTPS=false  # Let nginx handle SSL
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5. **Nginx Reverse Proxy (Recommended)**
Use Nginx in front of your Node.js app:

```nginx
upstream payment_backend {
    server localhost:8080;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    location / {
        proxy_pass http://payment_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Debugging Production Issues

### 1. **Check Server Logs**
```bash
# Docker logs
docker-compose logs -f payment-widget

# Direct logs
tail -f /var/log/your-app/access.log
```

### 2. **Test Proxy Endpoint**
```bash
# Test health endpoint
curl https://yourdomain.com/health

# Test proxy endpoint
curl https://yourdomain.com/proxy/widget/dhamen-pay.js
```

### 3. **Browser DevTools**
- Open Network tab
- Look for requests to `/proxy/`
- Check if they're being blocked (red color)
- Look at the response headers for CORS headers

### 4. **Common Issues & Fixes**

| Issue | Solution |
|-------|----------|
| ERR_BLOCKED_BY_CLIENT | Rename proxy path or use subdomain |
| CORS errors | Check CORS headers in response |
| 502 Bad Gateway | Check if Node.js app is running |
| 404 on /proxy/* | Check path rewriting configuration |
| Double path (/feapi/feapi) | Check widget URL rewriting logic |

---

## Testing Before Production

### 1. **Local Docker Test**
```bash
# Build and test locally first
docker-compose up --build

# Test all endpoints
curl http://localhost:8080/health
curl http://localhost:8080/proxy/widget/dhamen-pay.js
```

### 2. **Load Testing**
```bash
# Install apache bench
apt-get install apache2-utils

# Test proxy performance
ab -n 1000 -c 10 http://localhost:8080/proxy/widget/dhamen-pay.js
```

### 3. **Browser Testing**
- Test in Chrome
- Test in Safari
- Test with ad blocker enabled/disabled
- Test from different networks (mobile, wifi, corporate)

---

## Monitoring in Production

### 1. **Add Monitoring**
```javascript
// Add to server.js
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
    memory: process.memoryUsage()
  });
});
```

### 2. **Log Rotation**
```javascript
const fs = require('fs');
const path = require('path');

const logFile = fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' });

app.use((req, res, next) => {
  logFile.write(`${new Date().toISOString()} ${req.method} ${req.url}\n`);
  next();
});
```

---

## Quick Fixes for Your Current Issue

### Option 1: Rename Proxy Path (Quick)
```javascript
// server.js - Change this line:
app.use('/payment-gateway', createProxyMiddleware({...}));

// cardpayment.html - Update script tag:
<script src="/payment-gateway/widget/dhamen-pay.js"></script>
```

### Option 2: Use Subdomain (Better)
Set up a subdomain `api.yourdomain.com` and point it to your proxy server.

### Option 3: Whitelist Instructions
Provide users with instructions to whitelist your domain in their ad blockers.

---

## Need Help?

If issues persist:
1. Check server logs for detailed errors
2. Test with ad blocker disabled
3. Check if corporate firewall is blocking
4. Contact ELM support for CORS configuration on their end

---

## Summary

✅ **YES, you need the proxy in production** - ELM doesn't support CORS
✅ **ERR_BLOCKED_BY_CLIENT** - Likely ad blocker, rename proxy path
✅ **Use HTTPS in production** - Required for payment security
✅ **Monitor and log everything** - Essential for debugging
✅ **Test thoroughly before deploying** - Avoid production issues

