# Two-Stage Payment Verification System

## Overview
The payment system now verifies payments in two stages:
1. **Stage 1 (Immediate)**: User submits payment → STK Push sent → Provisional registration created
2. **Stage 2 (Verification)**: M-Pesa callback confirms payment → Subscription activated → Full access granted

## User Flow

### Step 1: Payment Form Submission
```
User fills form:
├─ Full Name
├─ Email
├─ Phone Number (stored for callback matching)
├─ Plan Type (weekly/monthly/termly)
└─ Clicks "Pay Now"
```

### Step 2: STK Push Initiated
```
Frontend: POST /api/stkpush
  ├─ Phone: 254712345678
  └─ Amount: 200/600/1650 (based on plan)

Backend Response:
  ├─ CheckoutRequestID (from M-Pesa)
  └─ Message: "STK sent to your phone"

User Action:
  └─ Completes M-Pesa prompt on phone
```

### Step 3: Payment Registration (PENDING)
```
Frontend: POST /api/payments/submit
  ├─ fullName
  ├─ email
  ├─ phone (NOW REQUIRED - stored for callback matching)
  ├─ planType
  └─ amount

Backend Creates:
  ├─ Payment Record (status: "pending")
  ├─ Phone stored for callback verification
  ├─ Email sent: "Payment awaiting confirmation"
  └─ Response: "Payment registration created. Awaiting M-Pesa confirmation..."

Frontend Response:
  └─ "⏳ Payment registration complete. Waiting for M-Pesa confirmation..."
```

### Step 4: Frontend Polling for Verification
```
Frontend: Polls every 2 seconds for 5 minutes
  └─ GET /api/payments/verify-completion/{email}

Loop:
  ├─ Check if subscription.status === "active"
  ├─ If YES → "✅ Payment verified! Full access granted"
  ├─ If NO → Continue polling
  └─ If timeout → "⏱️ Verification pending. Access will activate when payment confirms"
```

### Step 5: M-Pesa Callback Verification (Backend)
```
M-Pesa sends callback: POST /api/callback

Backend:
  ├─ Receives ResultCode=0 (success)
  ├─ Extracts:
  │  ├─ Phone (Initiator)
  │  ├─ Amount (TransactionAmount)
  │  └─ Receipt (ReferenceData)
  │
  ├─ Query Appwrite:
  │  └─ Find pending payment where phone=X AND amount=Y
  │
  ├─ If found:
  │  ├─ Update status: "pending" → "active"
  │  ├─ Set paidAt timestamp
  │  ├─ Send confirmation email
  │  └─ Log: "✅ Subscription activated!"
  │
  └─ If NOT found:
     └─ Log warning: "No matching payment (user may have used different phone)"
```

### Step 6: Frontend Detects Activation
```
Polling continues → Gets response with status: "active"
  ├─ Clears polling interval
  ├─ Shows: "✅ Payment verified! Your subscription is now active."
  ├─ Clears form
  └─ Closes modal after 3 seconds
```

---

## Architecture Changes

### Backend Files Updated

#### 1. `Backend/controllers/paymentController.js`
**Changes:**
- `submitPayment()` now accepts `phone` parameter (REQUIRED)
- Creates subscription with status="**pending**" (not "active")
- Stores phone number for callback matching
- Generates NO access codes (removed - immediate access instead)
- Sends "awaiting confirmation" email instead of "access code" email

**New Method:**
```javascript
activateByPhone(req, res) // Called after M-Pesa callback verifies
```

#### 2. `Backend/index.js`
**Changes:**
- M-Pesa callback handler (`POST /api/callback`) now:
  - Extracts phone and amount from M-Pesa result
  - Queries Appwrite for matching pending payment
  - Calls `appwriteService.updatePaymentStatus()` to activate
  - Sends confirmation email on success
  - Logs warnings if payment not found

#### 3. `Backend/utils/appwrite.js`
**New Method:**
```javascript
getPendingPaymentByPhoneAndAmount(phone, amount)
  // Finds most recent pending payment by phone+amount
  // Used by M-Pesa callback to match verification
```

#### 4. `Backend/routes/payments.js`
**New Routes:**
```javascript
GET /api/payments/verify-completion/:email
  // Returns subscription status (used by frontend polling)

POST /api/payments/activate
  // Activates subscription after callback verification
```

### Frontend Files Updated

#### 1. `index.html` (Payment Form Handler)
**Changes:**
- Form now REQUIRES phone input
- Phone normalized to 254XXXXXXXXX format
- Calls `POST /api/stkpush` with phone + amount
- Calls `POST /api/payments/submit` with phone parameter
- **NEW:** Polls `GET /api/payments/verify-completion/{email}` every 2 seconds
- Shows intermediate status: "Waiting for M-Pesa confirmation..."
- Timeout after 5 minutes with message to check phone

**Polling Logic:**
```javascript
const pollInterval = setInterval(async () => {
  // Poll every 2 seconds
  // Max polls: 150 (5 minutes total)
  
  if (status === 'active') {
    // Payment verified - show success
    clearInterval(pollInterval);
  } else if (pollCount >= maxPolls) {
    // Timeout - show pending message
    clearInterval(pollInterval);
  }
}, 2000);
```

---

## Database Schema Changes

### User Payments Collection
**Before:**
- email, planType, amount, status (always "active")
- NO phone field
- NO pending status support

**After:**
```javascript
{
  email,              // User email
  phone,              // ✨ NEW - Stored for callback matching
  planType,
  amount,
  expiryDate,
  status,             // NOW: "pending" or "active"
  paidAt,             // Set when payment received
  createdAt,
  userAgent,
  ipAddress,
  // ... other fields
}
```

---

## Payment Status Lifecycle

```
┌─────────────────┐
│   Form Submit   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  STK Push Sent  │ ← User sees prompt on phone
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PENDING       │ ← Payment record created in DB
│  Subscription   │
└────────┬────────┘
         │
         ↓ (User completes M-Pesa)
         │
┌─────────────────┐
│  M-Pesa sends   │
│    callback     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   ACTIVE        │ ← Frontend polling detects this
│  Subscription   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Full Access    │ ← User gets immediate access to games
│  Granted        │
└─────────────────┘
```

---

## Error Handling & Edge Cases

### Case 1: User Completes M-Pesa Successfully
```
✅ Flow works perfectly
└─ Payment record activated via callback
```

### Case 2: User Uses Different Phone for M-Pesa
```
⚠️ Your phone ≠ M-Pesa phone
└─ Backend logs: "No matching payment found"
└─ User must either:
   ├─ Try again with correct phone, OR
   └─ Contact support
```

### Case 3: User Doesn't Complete M-Pesa (5-min timeout)
```
⏱️ Frontend shows: "Payment pending. Check your phone."
└─ User can:
   ├─ Complete the M-Pesa prompt later (auto-activates), OR
   └─ Try again with fresh form submission
```

### Case 4: M-Pesa Callback Arrives After User Leaves
```
✅ Still works!
└─ Callback processes independently
└─ Payment activated in backend
└─ When user returns, subscription already active
```

---

## Testing Checklist

### ✅ Backend Testing
- [ ] `POST /api/stkpush` accepts phone, returns CheckoutRequestID
- [ ] `POST /api/payments/submit` creates PENDING subscription
- [ ] Phone stored in payment record
- [ ] `POST /api/callback` receives M-Pesa result
- [ ] Callback finds pending payment by phone+amount
- [ ] Callback activates subscription (status → "active")
- [ ] `GET /api/payments/verify-completion/:email` returns status

### ✅ Frontend Testing
- [ ] Payment form requires phone input
- [ ] Phone normalized correctly (0712... → 254712...)
- [ ] STK Push triggered on form submit
- [ ] Form data sent to `/api/payments/submit` with phone
- [ ] Polling starts after submit
- [ ] Polling detects status="active" from callback
- [ ] Success message shown before modal closes
- [ ] Handles timeout gracefully

### ✅ M-Pesa Flow
- [ ] STK Push prompt appears on phone
- [ ] User can enter M-Pesa PIN
- [ ] Callback triggers on payment success
- [ ] Callback logs success with amount/phone
- [ ] Payment status changes from pending to active

---

## Configuration

### Environment Variables Required
```bash
# M-Pesa Daraja API
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
BUSINESS_SHORT_CODE=your_short_code
LIPA_NA_MPESA_PASSKEY=your_passkey
M_PESA_CALLBACK_URL=https://<your-backend>/api/callback

# Appwrite Database
APPWRITE_API_KEY=your_api_key
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_DATABASE_ID=your_database_id
USER_PAYMENTS_COLLECTION_ID=your_collection_id
```

### Frontend Configuration
Update `API_BASE_URL` in `index.html`:
```javascript
// Development
const API_BASE_URL = 'http://localhost:5000';

// Production
const API_BASE_URL = 'https://shuleaibackend-0fcq.onrender.com';
```

---

## Implementation Timeline

1. **Phase 1** ✅ Backend preparation
   - Updated payment controller to accept phone
   - Added Appwrite methods for callback lookup
   - Implemented callback activation logic

2. **Phase 2** ✅ Frontend updates
   - Added phone parameter to form and API calls
   - Implemented polling mechanism
   - Added status messages for user feedback

3. **Phase 3** ⏳ Testing & Refinement
   - Test with actual M-Pesa credentials
   - Monitor callback delivery and activation times
   - Collect user feedback on UX

4. **Phase 4** ⏳ Production Deployment
   - Update frontend with production API URL
   - Configure M-Pesa callback webhook
   - Monitor first payments in production

---

## Key Improvements Over Previous System

| Feature | Before | After |
|---------|--------|-------|
| **Payment Verification** | Manual | Automated callback |
| **Access Control** | Immediate (always) | Verified (after callback) |
| **Access Method** | Email code | Immediate in-app |
| **Timeout** | Manual check email | 5-minute auto-timeout |
| **Phone Storage** | No | Yes (for callback matching) |
| **Subscription Status** | Active only | Pending/Active |
| **Error Handling** | Basic | Comprehensive logging |

---

## Support & Debugging

### Common Issues

**❌ "Phone must be in format 0712345678"**
- User entered wrong format
- Solution: Accept leading zero or 254 prefix

**❌ "No matching pending payment found"**
- User used different phone in M-Pesa
- Solution: Have them retry with correct phone or contact support

**⏳ "Payment pending for 5+ minutes"**
- M-Pesa callback delayed
- Solution: Usually resolves within 5 mins, refresh page if past timeout

**🔴 Backend timeout error**
- Appwrite query slow
- Check: Database performance, pending payments count, network latency

---

## Next Steps

1. **Email Templates**
   - Create "Awaiting Confirmation" email
   - Create "Payment Activated" email
   - Update `emailService.js`

2. **Admin Dashboard**
   - Show "Pending" subscriptions
   - Manual activation option for edge cases
   - Payment verification logs

3. **User Dashboard**
   - Show subscription status (Active/Pending)
   - Allow manual verification retry
   - Payment history with timestamps

4. **Analytics**
   - Track callback times
   - Monitor activation success rate
   - Identify payment failure patterns

---

## Questions?

See [API-INTEGRATION.md](Backend/API-INTEGRATION.md) for M-Pesa API details.
See [README-AUTH.md](README-AUTH.md) for authentication integration.
