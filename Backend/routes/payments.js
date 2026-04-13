const express = require("express");
const router = express.Router();
const axios = require("axios");
const paymentController = require("../controllers/paymentController");

// ── M-Pesa STK Push ────────────────────────────────────────────────────────
const DARAJA_BASE_URL = process.env.DARAJA_BASE_URL || "https://api.safaricom.co.ke";
const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;
const BUSINESS_SHORT_CODE = process.env.BUSINESS_SHORT_CODE;
const PASSKEY = process.env.DARAJA_PASSKEY;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://unsly-interarticular-tiesha.ngrok-free.dev";

async function getMpesaAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await axios.get(
    `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

router.post("/stkpush", async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (!CONSUMER_KEY || !CONSUMER_SECRET || !BUSINESS_SHORT_CODE || !PASSKEY) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }
    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: "Phone number and amount are required" });
    }
    if (isNaN(amount) || parseFloat(amount) < 1) {
      return res.status(400).json({ success: false, message: "Amount must be a valid number greater than 0" });
    }

    let phone = phoneNumber.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "254" + phone.substring(1);
    else if ((phone.startsWith("7") || phone.startsWith("1")) && phone.length === 9) phone = "254" + phone;
    else if (!phone.startsWith("254")) {
      return res.status(400).json({ success: false, message: "Invalid phone number format. Use: 0712345678 or 254712345678" });
    }
    if (phone.length !== 12) {
      return res.status(400).json({ success: false, message: "Phone number must be 12 digits including country code (254)" });
    }

    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    const password = Buffer.from(BUSINESS_SHORT_CODE + PASSKEY + timestamp).toString("base64");

    const accessToken = await getMpesaAccessToken();

    console.log("Initiating STK Push | Phone:", phone, "| Amount:", amount);

    const stkRes = await axios.post(
      `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: parseInt(amount),
        PartyA: phone,
        PartyB: 5628512,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: "SHULEAI",
        TransactionDesc: "ShuleAI Payment",
      },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );

    res.json({ success: true, message: "STK Push sent successfully. Please check your phone.", data: stkRes.data });
  } catch (error) {
    console.error("STK Push error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Payment initiation failed", error: error.response?.data || error.message });
  }
});

// Submit payment
router.post("/submit", (req, res) => paymentController.submitPayment(req, res));

// Check subscription status
router.get("/status/:email", (req, res) =>
  paymentController.checkSubscription(req, res),
);

// Verify payment completion (for polling from frontend after STK Push)\nrouter.get(\"/verify-completion/:email\", (req, res) =>\n  paymentController.checkSubscription(req, res)\n);\n\n// Activate subscription after M-Pesa callback verification\nrouter.post(\"/activate\", (req, res) =>\n  paymentController.activateByPhone(req, res)\n);\n\n// Get payment history\nrouter.get(\"/history/:email\", (req, res) =>\n  paymentController.getPaymentHistory(req, res)\n);
router.post("/verify", (req, res) => paymentController.verifyPayment(req, res));

// New admin routes
router.get("/admin/stats", (req, res) =>
  paymentController.getPaymentStats(req, res),
);
router.get("/admin", (req, res) => paymentController.getAllPayments(req, res));
router.get("/admin/:paymentId", (req, res) =>
  paymentController.getPaymentById(req, res),
);

// Admin: Generate access code for user with payment issues
router.post("/admin/generate-code/:paymentId", (req, res) =>
  paymentController.generateAccessCode(req, res),
);

module.exports = router;
