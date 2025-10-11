# Local HTTP proxy to avoid CORS when loading remote widget

Steps (local dev without Docker):

1. Install dependencies

   npm install

2. Start the HTTP server

   ```bash
   # default 8080
   npm start

   # or use a custom port
   PORT=8443 npm start
   ```

3. Open the page in your browser. The page loads the remote widget via `/proxy/*` so the browser sees responses with `Access-Control-Allow-Origin` set.

- Default:
   - <http://127.0.0.1:8080/index.html?invoiceid=YOUR_INVOICE_ID&locale=en&paymentbrand=APPLEPAY>
- Custom port:
   - <http://127.0.0.1:8443/index.html?invoiceid=YOUR_INVOICE_ID&locale=ar&paymentbrand=applepay>

Notes:

- This is a local development workaround. For production you should configure the remote server to return proper CORS headers or serve the widget from the same origin.

## Docker

Build the image:

```bash
docker build -t elm-sdk .
```

Run the container (default port 8080):

```bash
docker run --rm -p 8080:8080 --name elm-sdk elm-sdk
```

Run the container on a custom port (e.g., 8443):

```bash
docker run --rm -e PORT=8443 -p 8443:8443 --name elm-sdk-8443 elm-sdk
```

Open in your browser:

- Default:
   - <http://127.0.0.1:8080/index.html?invoiceid=YOUR_INVOICE_ID&locale=en&paymentbrand=APPLEPAY>
- Custom port:
   - <http://127.0.0.1:8443/index.html?invoiceid=YOUR_INVOICE_ID&locale=ar&paymentbrand=applepay>


## Steps to obtain invoiceId from VastMenu API

### Create charge api for elm

### Response

```json
{
    "customerIdentifier": "1b625ec3-2bb8-44f9-9d23-a4519e462872",
    "paymentUrl": "https://dhamendemo.elm.sa/pay/b47c243894d4de7eb6c7791dfa2b018f575018316bd642508ecfaa7fc3608460",
    "invoiceId": "b47c243894d4de7eb6c7791dfa2b018f575018316bd642508ecfaa7fc3608460"
}
```
