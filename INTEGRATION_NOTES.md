# DhamenPay Custom Form Integration

## Overview

The `cardpayment.html` file now features a custom-styled payment form that integrates with the DhamenPay widget behind the scenes.

## Implementation Details

### Architecture

1. **Custom Form (Visible)**: A beautifully designed payment form matching the `payment-form.html` reference design
2. **DhamenPay Widget (Hidden)**: The actual payment widget loaded but hidden from view
3. **JavaScript Bridge**: Code that attempts to sync data between the custom form and the widget

### Key Features

✅ **Modern UI Design**
- Dark theme with centered layout
- Unified input fields for card details
- Card icon, payment brand logos (Visa, Mastercard, Mada)
- Smooth animations and hover effects

✅ **Input Validation & Formatting**
- Card number: Auto-formatted with spaces (e.g., `4111 1111 1111 1111`)
- Expiry: Auto-formatted as MM/YY
- CVV: Numbers only, max 4 digits
- Cardholder: Required field

✅ **Card Brand Detection**
- Automatically detects card brand as user types
- Updates card icon in real-time (Visa, Mastercard, Mada)
- Icon opacity increases when brand is detected
- Supports Visa (starts with 4), Mastercard (51-55, 2221-2720), and Mada (specific BINs)

✅ **DhamenPay Integration**
- Widget loaded with jQuery and proper scripts
- Hidden using CSS (`display: none`, positioned off-screen)
- Attempts to populate iframe fields when form is submitted
- Triggers DhamenPay submission programmatically

## How It Works

### Form Submission Flow

1. User fills out the custom form
2. Data is validated on client-side
3. JavaScript attempts to:
   - Access DhamenPay iframe fields
   - Populate them with form data
   - Trigger the DhamenPay submit button
4. Payment is processed through DhamenPay

### Data Syncing Methods

The implementation tries multiple approaches:

**Method 1: Direct Iframe Access**
- Attempts to access iframe `contentDocument`
- Sets values directly if same-origin policy allows
- Most reliable if iframes are from same domain

**Method 2: postMessage API**
- Sends data via `window.postMessage()`
- Works if widget listens for messages
- Cross-origin compatible

**Method 3: Widget APIs**
- Checks for `window.wpwl` global object
- Uses widget-provided methods if available

## Important Limitations

### Iframe Security (CORS)

⚠️ **Critical**: Due to browser security (same-origin policy), iframe fields cannot be accessed if they're from a different domain than the parent page.

**Scenarios:**

- ✅ **Same Domain**: If `/proxy/widget/dhamen-pay.js` serves iframes from the same domain, direct access works
- ❌ **Cross-Domain**: If iframes are from `https://dhamendemo.elm.sa` while your site is `https://yourdomain.com`, direct access is blocked

### Testing Iframe Accessibility

The code includes a test that runs when the widget loads:

```javascript
// Check browser console for:
"✓ Iframe fields are accessible - direct value setting possible"
// or
"✗ Iframe fields are not accessible due to CORS policy"
```

## Configuration

### Invoice ID

The widget uses an invoice ID that can be set:

1. **Hardcoded** (line 270):
   ```html
   <dhamen-pay invoiceid="e8e2805f41c7c024a42a90159723675e4e60ac5c9b2522f002d832ac7816fee5"></dhamen-pay>
   ```

2. **Query String** (auto-detected):
   ```
   ?invoiceId=YOUR_INVOICE_ID
   ```

### wpwlOptions

Configure widget behavior in the `wpwlOptions` object:

```javascript
var wpwlOptions = {
    onReady: function() {
        // Widget loaded
    },
    onBeforeSubmitCard: function() {
        // Before submission
        return true; // or false to cancel
    },
    onAfterSubmit: function() {
        // After submission
    }
};
```

## Production Recommendations

### If Iframes ARE Accessible (Same-Origin)

✅ Current implementation should work perfectly
- Form data syncs automatically
- Clean user experience
- No changes needed

### If Iframes Are NOT Accessible (Cross-Origin)

Choose one of these approaches:

**Option 1: Request API Access from DhamenPay**
- Ask for official JavaScript APIs to set field values
- Most secure and reliable solution

**Option 2: Overlay Technique**
- Make DhamenPay widget visible but style it identically
- Use custom form as an overlay
- Let users interact directly with actual widget fields

**Option 3: Hybrid Approach**
- Keep custom form for initial data collection
- Reveal styled DhamenPay widget when user clicks "Pay Now"
- Pre-fill what you can, user confirms in actual widget

**Option 4: Server-Side Integration**
- Use DhamenPay's server API
- Send card data securely from server
- Requires PCI compliance on your end

## File Structure

```
public/
├── cardpayment.html          # Main file with custom form + widget
├── source/
│   └── payment-form.html     # Reference design (static)
```

## Browser Console Logging

The implementation logs helpful debug information:

- Widget load status
- Iframe accessibility check results
- Field population attempts
- Success/failure for each field
- Payment submission events

Check browser DevTools Console for detailed logs.

## Customization

### Styling

All styles are in the `<style>` section. Key classes:

- `.card-details` - Card container background
- `.unified-input` - Input field rows
- `.pay-button` - Submit button
- `.payment-methods` - Brand logos
- `#dhamen-pay-widget` - Hidden widget container

### Payment Brands

Edit the SVG logos in lines 236-258 to change displayed payment methods.

### Colors

Current theme uses:
- Background: `#1a1a1a`
- Card: `#2a2a2a`
- Inputs: `#3a3a3a`
- Borders: `#4a4a4a`
- Button: `#4ade80` (hover: `#22c55e`)

## Testing Checklist

- [ ] Widget loads without errors
- [ ] Custom form displays correctly
- [ ] Input formatting works (card number, expiry, CVV)
- [ ] Card brand detection works (try Visa: 4111..., Mastercard: 5555..., Mada: 5888...)
- [ ] Card icon changes dynamically as you type
- [ ] Validation messages appear
- [ ] Check console for iframe accessibility
- [ ] Submit button triggers payment flow
- [ ] Error messages display properly
- [ ] Invoice ID can be set via query string
- [ ] Responsive design works on mobile

### Test Card Numbers for Brand Detection

**Visa:**
- Start with `4` (e.g., `4111 1111 1111 1111`)

**Mastercard:**
- Start with `51-55` (e.g., `5555 5555 5555 4444`)
- Or `2221-2720` range

**Mada:**
- Try `5888 4500 0000 0000` (common Mada BIN)
- Or `4406 4700 0000 0000`

## Troubleshooting

### "Payment system is loading"
- Widget hasn't finished loading
- Wait a moment and try again

### "Payment widget not found"
- DhamenPay script failed to load
- Check network tab for script errors
- Verify `/proxy/widget/dhamen-pay.js` is accessible

### Form submits but no payment
- Iframes might not be accessible (check console)
- See "Production Recommendations" above

### Styling doesn't match reference
- Clear browser cache
- Check for conflicting CSS
- Verify all styles have `!important` where needed

## Support

For DhamenPay-specific questions:
- Documentation: Check `Customization_Guide.txt`
- API Support: Contact DhamenPay team
- Widget Issues: Check `/proxy/widget/` endpoint

## Version History

- **v1.0** (2025-10-26): Initial implementation with custom form and widget integration

