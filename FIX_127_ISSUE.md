# Fix: Widget Making Requests to 127.0.0.1 Instead of Production Domain

## ❌ The Problem

When deployed to production at `poc.vastmenu.com`, the payment widget makes API requests to:
```
https://127.0.0.1:8085/pg/feapi/feapi/payments/get-checkout/...
```

Instead of:
```
https://poc.vastmenu.com/pg/feapi/feapi/payments/get-checkout/...
```

**Result:** `net::ERR_CONNECTION_REFUSED` because the browser can't connect to `127.0.0.1` (Docker's internal address).

## 🔍 Root Cause

When the widget JavaScript is loaded, the proxy server rewrites ELM's URLs with the detected host. However, inside Docker:
- `req.headers.host` = `127.0.0.1:8085` (Docker's internal address)
- NOT `poc.vastmenu.com` (your public domain)

So the widget ends up with hardcoded references to `127.0.0.1`.

## ✅ The Solution

### **Set the `PUBLIC_DOMAIN` Environment Variable**

This tells the proxy to use your production domain instead of auto-detecting from headers.

## 🚀 How to Fix

### **Option 1: Update docker-compose.yaml (DONE! ✅)**

Your `docker-compose.yaml` has been updated with:

```yaml
environment:
  - PUBLIC_DOMAIN=https://poc.vastmenu.com
```

**Just rebuild and restart Docker:**

```bash
cd /path/to/your/project

# Stop containers
docker-compose down

# Rebuild with new configuration
docker-compose up --build -d

# Check logs
docker-compose logs -f frontend-poc
```

### **Option 2: Set via .env File**

Create `.env` file in project root:

```env
PORT=8080
PROXY_PATH=/pg
TARGET_HOST=https://dhamendemo.elm.sa
PUBLIC_DOMAIN=https://poc.vastmenu.com
USE_HTTPS=false
```

Then rebuild Docker:
```bash
docker-compose down
docker-compose up --build -d
```

### **Option 3: Set Directly in Docker Run**

If not using docker-compose:

```bash
docker run -d \
  -p 8085:8080 \
  -e PUBLIC_DOMAIN=https://poc.vastmenu.com \
  -e PROXY_PATH=/pg \
  --name frontend-poc \
  your-image-name
```

## 🧪 Testing the Fix

### **1. Check Server Logs**

After restart, look for this in logs:
```bash
docker-compose logs -f frontend-poc
```

**You should see:**
```
[ORIGIN] Using PUBLIC_DOMAIN: https://poc.vastmenu.com
[PROXY] Rewrote /pg/widget/dhamen-pay.js - replaced https://dhamendemo.elm.sa with https://poc.vastmenu.com/pg
```

### **2. Test in Browser**

1. Open: `https://poc.vastmenu.com/public/cardpayment.html?invoiceId=YOUR_INVOICE_ID`

2. Open DevTools (F12) → Network tab

3. Look for API requests to `/pg/feapi/...`

4. **Verify URL is:**
   ```
   ✅ https://poc.vastmenu.com/pg/feapi/...
   ❌ NOT https://127.0.0.1:8085/pg/feapi/...
   ```

### **3. Test Health Endpoint**

```bash
curl https://poc.vastmenu.com/health
```

**Expected response:**
```json
{
  "ok": true,
  "proxyPath": "/pg",
  "target": "https://dhamendemo.elm.sa",
  "uptime": 123.45
}
```

## 📋 Verification Checklist

After deploying:

- [ ] Docker container rebuilt with new config
- [ ] Logs show `Using PUBLIC_DOMAIN: https://poc.vastmenu.com`
- [ ] Browser Network tab shows requests to `poc.vastmenu.com` (not `127.0.0.1`)
- [ ] No `ERR_CONNECTION_REFUSED` errors
- [ ] Payment widget loads successfully
- [ ] Can enter card details
- [ ] Payment flow works end-to-end

## 🔧 How It Works

### **Before Fix:**

```
1. Browser requests: https://poc.vastmenu.com/pg/widget/dhamen-pay.js
2. Nginx forwards to Docker: http://127.0.0.1:8085/pg/widget/dhamen-pay.js
3. Node.js sees: req.headers.host = "127.0.0.1:8085"
4. Proxy rewrites URLs to: https://127.0.0.1:8085/pg/...
5. Widget makes requests to: https://127.0.0.1:8085/pg/feapi/... ❌
6. Browser can't connect → ERR_CONNECTION_REFUSED
```

### **After Fix:**

```
1. Browser requests: https://poc.vastmenu.com/pg/widget/dhamen-pay.js
2. Node.js uses PUBLIC_DOMAIN env var instead of req.headers.host
3. Proxy rewrites URLs to: https://poc.vastmenu.com/pg/...
4. Widget makes requests to: https://poc.vastmenu.com/pg/feapi/... ✅
5. Requests work correctly!
```

## 🌐 Alternative: Configure Reverse Proxy Headers

If you're using Nginx, you can also fix this by setting proper headers:

### **Nginx Configuration:**

```nginx
location / {
    proxy_pass http://localhost:8085;
    
    # These headers tell the app what the real domain is
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

**Then DON'T set `PUBLIC_DOMAIN`** - the app will detect it from `X-Forwarded-Host` header.

## 🐛 Troubleshooting

### **Issue: Still seeing 127.0.0.1 in requests**

**Check:**
1. Did you rebuild Docker? (`docker-compose up --build`)
2. Is `PUBLIC_DOMAIN` set correctly in docker-compose.yaml?
3. Check logs for "Using PUBLIC_DOMAIN" message

```bash
docker-compose logs frontend-poc | grep PUBLIC_DOMAIN
```

### **Issue: Wrong domain in PUBLIC_DOMAIN**

Update docker-compose.yaml:
```yaml
environment:
  - PUBLIC_DOMAIN=https://your-correct-domain.com  # Include https://
```

Then rebuild:
```bash
docker-compose down && docker-compose up --build -d
```

### **Issue: Logs don't show "Using PUBLIC_DOMAIN"**

The environment variable might not be passed correctly.

**Check inside container:**
```bash
docker exec -it frontend-poc env | grep PUBLIC_DOMAIN
```

**Should show:**
```
PUBLIC_DOMAIN=https://poc.vastmenu.com
```

If not, check docker-compose.yaml formatting.

## 📝 Summary

**Problem:** Widget requests going to `127.0.0.1:8085`  
**Cause:** Docker's internal host being used instead of public domain  
**Solution:** Set `PUBLIC_DOMAIN=https://poc.vastmenu.com` in docker-compose.yaml  
**Action Required:** Rebuild Docker (`docker-compose up --build -d`)  

## ⚠️ Important Notes

1. **Include protocol in PUBLIC_DOMAIN:**
   - ✅ `https://poc.vastmenu.com`
   - ❌ `poc.vastmenu.com`

2. **No trailing slash:**
   - ✅ `https://poc.vastmenu.com`
   - ❌ `https://poc.vastmenu.com/`

3. **Match your SSL setup:**
   - If using HTTPS, use `https://`
   - If using HTTP, use `http://`

4. **Must rebuild Docker:**
   - Environment variables only take effect after rebuild
   - `docker-compose restart` is NOT enough
   - Must use `docker-compose up --build`

## 🎯 Next Steps

1. **Deploy the fix:**
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

2. **Verify in logs:**
   ```bash
   docker-compose logs -f frontend-poc | grep ORIGIN
   ```

3. **Test in browser:**
   - Load payment page
   - Check Network tab
   - Verify URLs are correct

4. **Monitor for errors:**
   ```bash
   docker-compose logs -f frontend-poc | grep ERROR
   ```

---

**The fix is ready! Just rebuild Docker and the 127.0.0.1 issue will be resolved.** 🎉

