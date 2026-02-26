const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://your-frontend-domain.com",
      "http://127.0.0.1:5502",
      "https://shule.memeyai.com",
      "https://shuleaibackend-0fcq.onrender.com",
      "https://shuleainew.onrender.com",
      "https://shuleainew.onrender.com"
    ],
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const paymentRoutes = require("./routes/payments");
const authRoutes = require("./routes/auth");
const tutorRoutes = require("./routes/tutors");

app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tutors", tutorRoutes);

// --- M-Pesa (Daraja) STK Push integration ---
const DARAJA_BASE_URL =
  process.env.DARAJA_BASE_URL || "https://api.safaricom.co.ke";
const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;
const BUSINESS_SHORT_CODE = process.env.BUSINESS_SHORT_CODE;
const PASSKEY = process.env.DARAJA_PASSKEY;
const MPESA_CALLBACK_URL =
  process.env.MPESA_CALLBACK_URL ||
  "https://unsly-interarticular-tiesha.ngrok-free.dev";

console.log("\n🔐 M-Pesa Configuration:");
console.log("   Daraja Base URL:", DARAJA_BASE_URL);
console.log("   Business Short Code:", BUSINESS_SHORT_CODE);
console.log("   Callback URL:", MPESA_CALLBACK_URL);
console.log("   Consumer Key:", CONSUMER_KEY ? "✅ Configured" : "❌ Missing");
console.log(
  "   Consumer Secret:",
  CONSUMER_SECRET ? "✅ Configured" : "❌ Missing",
);
console.log("   Passkey:", PASSKEY ? "✅ Configured" : "❌ Missing");
console.log("");

// Generate access token
async function getAccessToken() {
  try {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString(
      "base64",
    );
    const response = await axios.get(
      `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting access token:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

// Generate timestamp
function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Generate password
function generatePassword(timestamp) {
  const data = BUSINESS_SHORT_CODE + PASSKEY + timestamp;
  return Buffer.from(data).toString("base64");
}

// STK Push endpoint
app.post("/api/stkpush", async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    // Validate credentials
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !BUSINESS_SHORT_CODE || !PASSKEY) {
      console.error("Missing M-Pesa credentials in environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone number and amount are required",
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than 0",
      });
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phoneNumber.replace(/\D/g, ""); // Remove non-digits

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (
      formattedPhone.startsWith("7") ||
      formattedPhone.startsWith("1")
    ) {
      formattedPhone = "254" + formattedPhone;
    } else if (!formattedPhone.startsWith("254")) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number format. Use format: 0712345678 or 254712345678",
      });
    }

    // Validate phone number length
    if (formattedPhone.length !== 12) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 12 digits including country code (254)",
      });
    }

    const accessToken = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    // Add debugging logs
    console.log("Initiating STK Push with:");
    console.log("Phone:", formattedPhone);
    console.log("Amount:", amount);
    console.log("Business Short Code:", BUSINESS_SHORT_CODE);
    console.log("Timestamp:", timestamp);
    console.log("Callback URL:", MPESA_CALLBACK_URL);

    const stkPushData = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: parseInt(amount),
      PartyA: formattedPhone,
      PartyB: 5628512, // This should be your till number or paybill number
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: "SHULEAI",
      TransactionDesc: "ShuleAI Payment",
    };

    const response = await axios.post(
      `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("STK Push Response:", JSON.stringify(response.data, null, 2));

    res.json({
      success: true,
      message: "STK Push sent successfully. Please check your phone.",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "STK Push error:",
      JSON.stringify(error.response?.data || error.message, null, 2),
    );

    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Headers:", error.response.headers);
      console.error("Error Data:", error.response.data);
    }

    res.status(500).json({
      success: false,
      message: "Payment initiation failed",
      error: error.response?.data || error.message,
    });
  }
});

// Callback endpoint (for M-Pesa to send payment results)
app.post("/api/callback", async (req, res) => {
  try {
    const body = req.body;
    console.log("📥 M-Pesa Callback received at:", new Date().toISOString());
    console.log("   Raw body:", JSON.stringify(body, null, 2));

    // Handle nested callback structure from STK Push
    let callback = body;
    if (body.Body && body.Body.stkCallback) {
      callback = body.Body.stkCallback;
      console.log("   ✅ Detected nested STK Push callback structure");
    }

    console.log("   ResultCode:", callback.ResultCode);
    console.log("   ResultDesc:", callback.ResultDesc);

    if (callback.ResultCode === 0 && callback.CallbackMetadata) {
      // Successful payment - Extract metadata from CallbackMetadata
      let phone = null;
      let amount = null;
      let receipt = "N/A";
      let transactionDate = null;
      let transactionId = null;

      console.log(
        "   Parsing CallbackMetadata:",
        JSON.stringify(callback.CallbackMetadata, null, 2),
      );

      // Extract phone and amount from CallbackMetadata.Item array
      if (callback.CallbackMetadata && callback.CallbackMetadata.Item) {
        const items = callback.CallbackMetadata.Item;
        items.forEach((item) => {
          console.log(`   - ${item.Name}: ${item.Value}`);
          if (item.Name === "PhoneNumber") {
            phone = item.Value.toString();
          } else if (item.Name === "Amount") {
            amount = item.Value;
          } else if (item.Name === "MpesaReceiptNumber") {
            receipt = item.Value;
          } else if (item.Name === "TransactionDate") {
            transactionDate = item.Value;
          }
        });
      }

      transactionId =
        callback.TransactionID || callback.OriginatorConversationID || "N/A";

      console.log("✅ Payment successful from M-Pesa!");
      console.log("   Phone:", phone);
      console.log("   Amount:", amount);
      console.log("   Receipt:", receipt);
      console.log("   Transaction ID:", transactionId);
      console.log("   Transaction Date:", transactionDate);

      if (!phone || !amount) {
        console.warn("   ⚠️ Missing phone or amount in callback metadata", {
          phone,
          amount,
        });
        return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      // Find and activate the pending subscription
      console.log(
        "   🔍 Looking up pending subscription for phone:",
        phone,
        "amount:",
        amount,
      );

      const appwriteService = require("./utils/appwrite");
      const lookupResult =
        await appwriteService.getPendingPaymentByPhoneAndAmount(
          phone,
          Math.round(amount),
        );

      if (lookupResult.success && lookupResult.payment) {
        console.log("   ✅ Found pending payment:", lookupResult.payment.$id);

        // Activate the payment
        const activateResult = await appwriteService.updatePaymentStatus(
          lookupResult.payment.$id,
          "active",
        );

        if (activateResult.success) {
          console.log("   ✅ Payment activated!");
          console.log(
            "   📧 Sending welcome email to:",
            lookupResult.payment.email,
          );

          // Send welcome email to user
          const emailService = require("./utils/email");
          try {
            const emailResult = await emailService.sendActivationConfirmation(
              activateResult.payment,
            );
            if (emailResult.success) {
              console.log("   ✅ Welcome email sent successfully!");
            } else {
              console.warn("   ⚠️ Welcome email failed:", emailResult.error);
            }
          } catch (emailError) {
            console.error("   ⚠️ Email sending exception:", emailError.message);
          }
        } else {
          console.error(
            "   ❌ Failed to activate payment:",
            activateResult.error,
          );
        }
      } else {
        console.warn(
          "   ⚠️ No matching pending payment found for phone:",
          phone,
          "amount:",
          amount,
        );
        console.log("   📝 User may have used a different phone number");
      }
    } else {
      // Failed payment
      console.log("❌ Payment failed:", callback.ResultDesc);
    }

    // Always respond with ResultCode 0 to M-Pesa to mark callback as delivered
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("❌ Callback processing error:", error);
    // Still accept to avoid M-Pesa retries
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "ShuleAI Backend",
  });
});

// Debug: Get recent payments (for testing)
app.get("/api/debug/recent-payments", async (req, res) => {
  try {
    const { password } = req.query;
    // Simple debug password check
    if (password !== "debug2025") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const appwriteService = require("./utils/appwrite");
    const result = await appwriteService.getPendingPayments(20);

    if (result.success) {
      res.json({
        success: true,
        pendingPayments: result.payments.map((p) => ({
          id: p.$id,
          email: p.email,
          phone: p.phone,
          amount: p.amount,
          status: p.status,
          createdAt: p.$createdAt,
        })),
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Debug: Manually trigger payment activation (for testing callback)
app.post("/api/debug/activate-payment", async (req, res) => {
  try {
    const { password, phone, amount } = req.body;
    // Simple debug password check
    if (password !== "debug2025") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: "Phone and amount are required",
      });
    }

    console.log("\n🧪 DEBUG: Manually activating payment", { phone, amount });

    const appwriteService = require("./utils/appwrite");
    const lookupResult =
      await appwriteService.getPendingPaymentByPhoneAndAmount(
        phone,
        Math.round(amount),
      );

    if (!lookupResult.success || !lookupResult.payment) {
      return res.status(404).json({
        success: false,
        message: "No pending payment found for phone: " + phone,
      });
    }

    console.log(
      "Found payment:",
      lookupResult.payment.$id,
      "->",
      lookupResult.payment.email,
    );

    // Activate the payment
    const activateResult = await appwriteService.updatePaymentStatus(
      lookupResult.payment.$id,
      "active",
    );

    if (!activateResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to activate payment",
        error: activateResult.error,
      });
    }

    console.log("✅ Payment activated successfully!");

    // Send activation email
    const emailService = require("./utils/email");
    try {
      await emailService.sendActivationConfirmation(activateResult.payment);
      console.log("✅ Activation email sent");
    } catch (emailErr) {
      console.warn("⚠️ Email failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Payment activated successfully",
      payment: activateResult.payment,
    });
  } catch (error) {
    console.error("Activation error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📝 API Documentation available at http://localhost:${PORT}/api/docs`,
  );
});
