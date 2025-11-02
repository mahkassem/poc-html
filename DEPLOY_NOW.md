# 🚀 Deploy Now - Quick Commands

## The Fix is Ready!

All code has been updated to fix the `127.0.0.1` issue.

## 📦 What Changed

✅ **server.js** - Added `PUBLIC_DOMAIN` environment variable support  
✅ **docker-compose.yaml** - Added environment variables including `PUBLIC_DOMAIN=https://poc.vastmenu.com`  
✅ **All HTML files** - Updated to use `/pg/` instead of `/proxy/`  

## 🎯 Deploy to Production (3 Commands)

```bash
# 1. Stop current containers
docker-compose down

# 2. Rebuild with new configuration
docker-compose up --build -d

# 3. Check logs
docker-compose logs -f frontend-poc
```

**Look for this in logs:**
```
✓ HTTP server running at http://127.0.0.1:8080
✓ Proxying /pg/* -> https://dhamendemo.elm.sa
✓ Health check: http://127.0.0.1:8080/health
[ORIGIN] Using PUBLIC_DOMAIN: https://poc.vastmenu.com
```

## ✅ Verify It Works

### **1. Test Health Endpoint**
```bash
curl https://poc.vastmenu.com/health
```

**Expected:**
```json
{
  "ok": true,
  "proxyPath": "/pg",
  "target": "https://dhamendemo.elm.sa",
  "uptime": 123.45
}
```

### **2. Test in Browser**

1. Open: `https://poc.vastmenu.com/public/cardpayment.html?invoiceId=YOUR_INVOICE_ID`

2. Open DevTools (F12) → Network tab

3. **Check requests go to:**
   - ✅ `https://poc.vastmenu.com/pg/feapi/...`
   - ❌ NOT `https://127.0.0.1:8085/pg/feapi/...`

4. **No errors:**
   - ✅ No `ERR_CONNECTION_REFUSED`
   - ✅ No `ERR_BLOCKED_BY_CLIENT`
   - ✅ Widget loads correctly

## 🔧 If You Need to Change the Domain

Edit `docker-compose.yaml`:

```yaml
environment:
  - PUBLIC_DOMAIN=https://your-domain.com  # Change this line
```

Then redeploy:
```bash
docker-compose down && docker-compose up --build -d
```

## 📊 Monitor After Deployment

```bash
# Watch logs in real-time
docker-compose logs -f frontend-poc

# Check for errors only
docker-compose logs frontend-poc | grep -i error

# Check container status
docker-compose ps

# Check resource usage
docker stats frontend-poc
```

## 🐛 Quick Troubleshooting

### Still seeing 127.0.0.1 in requests?

```bash
# Check if PUBLIC_DOMAIN is set
docker exec -it frontend-poc env | grep PUBLIC_DOMAIN

# Should show: PUBLIC_DOMAIN=https://poc.vastmenu.com
```

### Container not starting?

```bash
# Check logs
docker-compose logs frontend-poc

# Check if port is in use
lsof -i :8085
```

### Need to force rebuild?

```bash
# Nuclear option - rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📋 Post-Deployment Checklist

- [ ] Container is running (`docker-compose ps`)
- [ ] Health endpoint returns `ok: true`
- [ ] Logs show "Using PUBLIC_DOMAIN"
- [ ] Browser requests go to `poc.vastmenu.com` (not `127.0.0.1`)
- [ ] Payment widget loads
- [ ] Can enter card details
- [ ] Payment flow works

## 🎉 That's It!

The fix is deployed. The widget should now make requests to `https://poc.vastmenu.com` instead of `https://127.0.0.1:8085`.

---

## 📚 Detailed Documentation

- `FIX_127_ISSUE.md` - Detailed explanation of this fix
- `QUICK_FIX.md` - Complete testing guide
- `SUMMARY.md` - Overview of all changes
- `PRODUCTION_DEPLOYMENT.md` - Comprehensive deployment guide

---

**Commands at a Glance:**

```bash
# Deploy
docker-compose down && docker-compose up --build -d

# Test
curl https://poc.vastmenu.com/health

# Monitor
docker-compose logs -f frontend-poc

# Check env
docker exec -it frontend-poc env | grep PUBLIC_DOMAIN
```

**Ready to deploy? Run the first command! 🚀**

