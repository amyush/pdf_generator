#!/bin/bash
BASE_URL="http://localhost:3000/api"

echo "=== Health Check ==="
curl -s http://localhost:3000/health | jq .

echo ""
echo "=== Single Purchase Order ==="
curl -s -X POST "$BASE_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "purchase-order",
    "data": {
      "company": {
        "name": "TranZact Technologies Pvt. Ltd.",
        "address": "Unit 401, Pinnacle Business Park, Mahakali Caves Rd, Mumbai 400093",
        "gstin": "27AABCT1234A1ZA",
        "pan": "AABCT1234A",
        "phone": "+91 22 4567 8900",
        "email": "procurement@tranzact.com"
      },
      "poNumber": "PO-2024-001547",
      "date": "2024-03-15",
      "deliveryDate": "2024-04-15",
      "vendor": {
        "name": "Bharat Steel Industries",
        "address": "Plot 45, MIDC Industrial Area, Pune 411019",
        "gstin": "27AADCB5678B1ZB",
        "contact": "+91 20 2345 6789"
      },
      "shipTo": {
        "name": "TranZact Warehouse",
        "address": "Warehouse 7, Bhiwandi Logistics Park, Thane 421302",
        "contact": "+91 22 9876 5432"
      },
      "items": [
        { "description": "MS Flat Bar 50x6mm IS 2062", "hsn": "7216", "quantity": 500, "unit": "Kg", "rate": 62.50, "taxPercent": 18, "amount": 31250.00 },
        { "description": "GI Pipe 1 inch Medium Class", "hsn": "7306", "quantity": 200, "unit": "Mtr", "rate": 185.00, "taxPercent": 18, "amount": 37000.00 },
        { "description": "SS Sheet 304 Grade 1.2mm", "hsn": "7219", "quantity": 50, "unit": "Kg", "rate": 320.00, "taxPercent": 18, "amount": 16000.00 },
        { "description": "Angle Iron 50x50x5mm", "hsn": "7216", "quantity": 300, "unit": "Kg", "rate": 58.00, "taxPercent": 18, "amount": 17400.00 },
        { "description": "HR Coil 2.0mm", "hsn": "7208", "quantity": 1000, "unit": "Kg", "rate": 55.00, "taxPercent": 18, "amount": 55000.00 }
      ],
      "subtotal": 156650.00,
      "cgstPercent": 9,
      "sgstPercent": 9,
      "cgst": 14098.50,
      "sgst": 14098.50,
      "total": 184847.00,
      "terms": [
        "Payment: 30 days from date of invoice",
        "Delivery: Within 30 days from PO date",
        "Material must conform to IS 2062 / IS 1239 standards",
        "Rejected material to be replaced within 7 working days"
      ]
    }
  }' | jq .

echo ""
echo "=== Single Invoice ==="
curl -s -X POST "$BASE_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invoice",
    "data": {
      "company": {
        "name": "TranZact Technologies Pvt. Ltd.",
        "address": "Unit 401, Pinnacle Business Park, Mahakali Caves Rd, Mumbai 400093",
        "gstin": "27AABCT1234A1ZA",
        "pan": "AABCT1234A",
        "phone": "+91 22 4567 8900",
        "email": "billing@tranzact.com"
      },
      "invoiceNumber": "INV-2024-003892",
      "date": "2024-03-15",
      "dueDate": "2024-04-14",
      "billTo": {
        "name": "Sharma Fabrication Works",
        "address": "Industrial Plot 12, Sector 63, Noida 201301",
        "gstin": "09AACCS7890C1ZC",
        "state": "Uttar Pradesh",
        "stateCode": "09"
      },
      "shipTo": {
        "name": "Sharma Fabrication Works",
        "address": "Industrial Plot 12, Sector 63, Noida 201301",
        "state": "Uttar Pradesh",
        "stateCode": "09"
      },
      "items": [
        { "description": "CNC Machined Flange - Type A", "hsn": "7307", "quantity": 100, "unit": "Pcs", "rate": 450.00, "cgst": 4050.00, "sgst": 4050.00, "total": 53100.00 },
        { "description": "Precision Shaft 25mm Dia EN8", "hsn": "7318", "quantity": 50, "unit": "Pcs", "rate": 1200.00, "cgst": 5400.00, "sgst": 5400.00, "total": 70800.00 },
        { "description": "Hydraulic Cylinder Assembly", "hsn": "8412", "quantity": 10, "unit": "Pcs", "rate": 8500.00, "cgst": 7650.00, "sgst": 7650.00, "total": 100300.00 }
      ],
      "subtotal": 192000.00,
      "totalCgst": 17100.00,
      "totalSgst": 17100.00,
      "grandTotal": 226200.00,
      "amountInWords": "Two Lakh Twenty-Six Thousand Two Hundred Rupees Only",
      "bank": {
        "name": "HDFC Bank",
        "accountNo": "50100XXXXXXX789",
        "ifsc": "HDFC0001234",
        "branch": "Andheri East, Mumbai"
      },
      "terms": [
        "Payment due within 30 days of invoice date",
        "Interest of 1.5% per month on overdue payments",
        "Goods once sold will not be taken back"
      ]
    }
  }' | jq .

echo ""
echo "=== Bulk Generation (3 docs) ==="
curl -s -X POST "$BASE_URL/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "type": "purchase-order",
        "data": {
          "company": { "name": "TranZact Tech", "address": "Mumbai", "gstin": "27AABCT1234A1ZA", "pan": "AABCT1234A", "phone": "022-1234", "email": "po@tranzact.com" },
          "poNumber": "PO-BULK-001", "date": "2024-03-15", "deliveryDate": "2024-04-15",
          "vendor": { "name": "Vendor A", "address": "Delhi", "gstin": "07AAA0000A1Z1", "contact": "011-111" },
          "shipTo": { "name": "Warehouse 1", "address": "Bhiwandi", "contact": "022-999" },
          "items": [
            { "description": "Steel Rod 12mm", "hsn": "7214", "quantity": 100, "unit": "Kg", "rate": 70, "taxPercent": 18, "amount": 7000 }
          ],
          "subtotal": 7000, "cgstPercent": 9, "sgstPercent": 9, "cgst": 630, "sgst": 630, "total": 8260,
          "terms": ["Net 30 days"]
        }
      },
      {
        "type": "invoice",
        "data": {
          "company": { "name": "TranZact Tech", "address": "Mumbai", "gstin": "27AABCT1234A1ZA", "pan": "AABCT1234A", "phone": "022-1234", "email": "inv@tranzact.com" },
          "invoiceNumber": "INV-BULK-001", "date": "2024-03-15", "dueDate": "2024-04-14",
          "billTo": { "name": "Customer B", "address": "Pune", "gstin": "27BBBBB0000B1ZB", "state": "Maharashtra", "stateCode": "27" },
          "shipTo": { "name": "Customer B", "address": "Pune", "state": "Maharashtra", "stateCode": "27" },
          "items": [
            { "description": "Widget X", "hsn": "8479", "quantity": 200, "unit": "Pcs", "rate": 150, "cgst": 2700, "sgst": 2700, "total": 35400 }
          ],
          "subtotal": 30000, "totalCgst": 2700, "totalSgst": 2700, "grandTotal": 35400,
          "amountInWords": "Thirty-Five Thousand Four Hundred Rupees Only",
          "bank": { "name": "HDFC Bank", "accountNo": "501001234789", "ifsc": "HDFC0001234", "branch": "Andheri" },
          "terms": ["Net 30"]
        }
      },
      {
        "type": "purchase-order",
        "data": {
          "company": { "name": "TranZact Tech", "address": "Mumbai", "gstin": "27AABCT1234A1ZA", "pan": "AABCT1234A", "phone": "022-1234", "email": "po@tranzact.com" },
          "poNumber": "PO-BULK-002", "date": "2024-03-16", "deliveryDate": "2024-04-16",
          "vendor": { "name": "Vendor C", "address": "Chennai", "gstin": "33CCC0000C1Z1", "contact": "044-333" },
          "shipTo": { "name": "Warehouse 2", "address": "Navi Mumbai", "contact": "022-888" },
          "items": [
            { "description": "Copper Wire 2.5mm", "hsn": "7408", "quantity": 500, "unit": "Mtr", "rate": 25, "taxPercent": 18, "amount": 12500 },
            { "description": "PVC Conduit 25mm", "hsn": "3917", "quantity": 300, "unit": "Mtr", "rate": 35, "taxPercent": 18, "amount": 10500 }
          ],
          "subtotal": 23000, "cgstPercent": 9, "sgstPercent": 9, "cgst": 2070, "sgst": 2070, "total": 27140,
          "terms": ["Delivery within 15 days", "Quality as per IS standards"]
        }
      }
    ]
  }' | jq .
