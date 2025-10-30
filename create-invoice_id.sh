response=$(curl --location 'https://dhamendemo.elm.sa/api/payments/customer-payment' \
--header 'ClientId: 47A00E02-BBDC-442C-B41E-0516B47C1C40' \
--header 'api-version: 2' \
--header 'app-id: 9b00ae80' \
--header 'app-key: 8581fb5817430381803a1936e7be321d' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--header 'Cookie: TS01c01f6c=01663feb1cd076995f751dc0076080243a33b099e1ff82d30e81b7ce3f1e675117b2ad305207ce38e2e98134fb74af334d006b99ecd2cc1f032749661daad6deaeb0b3baf8; BIGipServerDhamen-demo-80=48295946.20480.0000' \
--data '{
  "paymentReferenceId": "'"$(date +%s%N | md5sum | head -c 16)"'",
  "customerPayments": [
    {
      "name": "Visitor 1",
      "customerIdentifier": "2485555553",
      "amount": 100
    }
  ]
}')

invoice_id=$(echo "$response" | jq -r '.customerPayments[0].invoiceId')

echo "=========================================="
echo "✅ Invoice created successfully"
echo ""
echo "✨ Invoice ID: $invoice_id 💳"
echo ""
echo "🔗 Payment URL: https://dhamendemo.elm.sa/pay/$invoice_id"
echo "🔗 Local URL: https://127.0.0.1:8080/cardpayment.html?invoiceId=$invoice_id"
echo ""
echo "💡 Use the invoice ID to embed the payment widget in your website"
echo "=========================================="