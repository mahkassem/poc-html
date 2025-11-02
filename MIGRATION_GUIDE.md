# Migration Guide: Fixing ERR_BLOCKED_BY_CLIENT

## Quick Fix for Production

The `ERR_BLOCKED_BY_CLIENT` error is caused by ad blockers blocking URLs with `/proxy` in them.

### Option 1: Use the Alternative Server (RECOMMENDED)

1. **Start using the production server:**
   ```bash
   # Instead of: node server.js
   node server-production.js
   ```

2. **Update cardpayment.html** - Change line 13:
   ```html
   <!-- OLD (blocked by ad blockers) -->
   <script src="/proxy/widget/dhamen-pay.js" type="text/javascript"></script>
   
   <!-- NEW (less likely to be blocked) -->
   <script src="/pg/widget/dhamen-pay.js" type="text/javascript"></script>
   ```

3. **Rebuild and restart Docker:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Option 2: Use Environment Variable

1. **Create `.env` file:**
   ```env
   PORT=8080
   PROXY_PATH=/pg
   TARGET_HOST=https://dhamendemo.elm.sa
   USE_HTTPS=false
   ```

2. **Update Dockerfile to use production server:**
   ```dockerfile
   # Change CMD line to:
   CMD ["node", "server-production.js"]
   ```

3. **Update package.json scripts:**
   ```json
   {
     "scripts": {
       "start": "node server-production.js",
       "dev": "nodemon server.js",
       "prod": "NODE_ENV=production node server-production.js"
     }
   }
   ```

### Option 3: Update Existing server.js

Replace `/proxy` with `/pg` throughout your current server.js:

```javascript
// Line ~22: Change proxy path
app.use('/pg', createProxyMiddleware({...}));

// Update pathRewrite
pathRewrite: (pathReq) => pathReq.replace(/^\/pg/, ''),

// Update URL rewriting
text = text.replace(/https?:\/\/dhamendemo\.elm\.sa/g, `${baseOrigin}/pg`);
```

Then update cardpayment.html:
```html
<script src="/pg/widget/dhamen-pay.js" type="text/javascript"></script>
```

---

## Testing the Fix

### 1. Test Locally First
```bash
# Start server
node server-production.js

# Test in browser
open http://localhost:8080/health

# Check proxy endpoint
curl http://localhost:8080/pg/widget/dhamen-pay.js
```

### 2. Test with Ad Blocker Enabled
- Install uBlock Origin or Adblock Plus
- Load your payment page
- Check if requests to `/pg/` are blocked
- Check browser console for errors

### 3. Docker Testing
```bash
# Build
docker-compose build

# Run
docker-compose up

# Test
curl http://localhost:8085/health
curl http://localhost:8085/pg/widget/dhamen-pay.js
```

---

## Why This Works

| Path | Blocked by Ad Blockers? | Why |
|------|------------------------|-----|
| `/proxy/*` | ✗ YES | Common word in blocklists |
| `/api/*` | ✗ YES | Commonly blocked |
| `/feapi/*` | ✗ YES | Contains "api" |
| `/pg/*` | ✓ NO | Short, uncommon abbreviation |
| `/payment-gateway/*` | ✓ MAYBE | Descriptive but longer |
| `/widget/*` | ✓ NO | Widget-specific, not blocked |

---

## Alternative Solutions

### Use Subdomain (Best for Production)
Point `api.yourdomain.com` to your proxy server:

1. **DNS Configuration:**
   ```
   api.yourdomain.com -> Your Server IP
   ```

2. **Update server to use root path:**
   ```javascript
   // Remove proxy path, use root
   app.use('/', createProxyMiddleware({...}));
   ```

3. **Update HTML:**
   ```html
   <script src="https://api.yourdomain.com/widget/dhamen-pay.js"></script>
   ```

### Use Nginx Reverse Proxy
```nginx
location /payment {
    proxy_pass https://dhamendemo.elm.sa/;
    # ... proxy headers
}
```

---

## Checklist

- [ ] Changed proxy path from `/proxy` to `/pg`
- [ ] Updated `cardpayment.html` script src
- [ ] Tested locally with ad blocker enabled
- [ ] Updated Docker configuration
- [ ] Tested in production
- [ ] Checked browser console for errors
- [ ] Verified payment flow works end-to-end

---

## Troubleshooting

### Still getting ERR_BLOCKED_BY_CLIENT?

1. **Check ad blocker logs:**
   - Right-click ad blocker icon
   - Click "Open logger"
   - Look for blocked requests

2. **Try incognito/private mode:**
   - Disable all extensions
   - Test if it works

3. **Check corporate firewall:**
   - Some companies block proxy-related keywords
   - Contact IT department

4. **Use different path:**
   - Try `/w/` (widget)
   - Try `/gw/` (gateway)
   - Try `/pmt/` (payment)

### CORS errors?

Check server logs:
```bash
# Docker
docker-compose logs -f

# Direct
tail -f /var/log/app/server.log
```

Look for:
- `[PROXY ERROR]` messages
- Origin mismatch
- OPTIONS request failures

---

## Need More Help?

1. Check `PRODUCTION_DEPLOYMENT.md` for comprehensive guide
2. Check server logs for detailed errors
3. Test with `curl` to isolate browser issues
4. Contact ELM support if their server is blocking requests

