const appwriteService = require("../utils/appwrite");
const emailService = require("../utils/email");
const { SUBSCRIPTION_PLANS, TILL_NUMBER } = require("../config/constants");
const { Query, Databases } = require("node-appwrite");
const { db } = require("../utils/AppwriteS");
const { Client } = require("node-appwrite");

class PaymentController {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    this.databases = new Databases(this.client);
    this.databaseId = process.env.APPWRITE_DATABASE_ID;
  }

  // Calculate expiry date based on plan type
  // ACCURACY NOTE:
  // - Test/Weekly/Monthly use milliseconds (precise)
  // - Termly uses calendar months (3 calendar months, not 90 days)
  calculateExpiryDate(planType) {
    const now = new Date();
    switch (planType) {
      case "test":
        // Exactly 1 day (86,400,000ms)
        return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      case "weekly":
        // Exactly 7 days (604,800,000ms)
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "monthly":
        // Exactly 30 days (2,592,000,000ms)
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case "termly":
        // Exactly 3 calendar months
        // Using setMonth() for accurate calendar-based periods
        const termlyDate = new Date(now);
        termlyDate.setMonth(termlyDate.getMonth() + 3);
        return termlyDate;
      default:
        // Default: 30 days
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Get games count based on plan
  getGamesCountForPlan(planType) {
    switch (planType) {
      case "test":
        return 7; // Limited demo access
      case "weekly":
        return 7;
      case "monthly":
        return 20;
      case "termly":
        return 999; // Unlimited
      default:
        return 7;
    }
  }

  // Get human-readable plan name
  getPlanName(planType) {
    switch (planType) {
      case "test":
        return "Test Plan (5 KES)";
      case "weekly":
        return "Weekly Plan";
      case "monthly":
        return "Monthly Plan";
      case "termly":
        return "Termly Plan";
      default:
        return "Standard Plan";
    }
  }

  // Submit payment details - Create PENDING subscription, await callback verification
  async submitPayment(req, res) {
    try {
      const { fullName, email, planType, phone } = req.body;

      // Validation - now require phone as well
      if (!fullName || !email || !planType || !phone) {
        return res.status(400).json({
          success: false,
          message: "Full name, email, phone, and plan type are required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      // Validate phone format
      const phoneRegex = /^254\d{9}$/;
      const cleanPhone = phone.replace(/\D/g, "");
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith("0")) {
        formattedPhone = "254" + cleanPhone.substring(1);
      } else if (
        (cleanPhone.startsWith("7") || cleanPhone.startsWith("1")) &&
        cleanPhone.length === 9
      ) {
        formattedPhone = "254" + cleanPhone;
      }

      if (!phoneRegex.test(formattedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone format. Must be: 0712345678 or 254712345678",
        });
      }

      // Validate plan type
      if (!SUBSCRIPTION_PLANS[planType]) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan type. Must be: weekly, monthly, or termly",
        });
      }

      // Calculate amount and expiry date from plan
      const amount = SUBSCRIPTION_PLANS[planType].amount;
      const expiryDate = this.calculateExpiryDate(planType);
      const gamesCount = this.getGamesCountForPlan(planType);

      console.log(
        `⏳ Registering payment - Email: ${email}, Phone: ${formattedPhone}, Plan: ${planType}, Amount: KES ${amount}`,
      );

      // Create PENDING payment record (awaiting M-Pesa callback verification)
      const paymentData = {
        fullName,
        email,
        phone: formattedPhone,
        planType,
        amount,
        expiryDate: expiryDate.toISOString(),
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        status: "pending", // Mark as pending until M-Pesa callback confirms
        createdAt: new Date().toISOString(),
      };

      const result = await appwriteService.createPayment(paymentData);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to record payment registration",
        });
      }

      console.log(
        "⏳ Payment registration created (PENDING). ID:",
        result.payment.$id,
      );
      console.log("   Awaiting M-Pesa callback confirmation...");
      console.log(
        "   📧 Email will be sent after payment verification via M-Pesa callback",
      );

      res.json({
        success: true,
        message:
          "Payment registration created. Awaiting M-Pesa confirmation...",
        paymentId: result.payment.$id,
        data: {
          fullName,
          email,
          phone: formattedPhone,
          planType,
          amount,
          status: "pending",
          message:
            "Complete the M-Pesa prompt on your phone to activate your subscription",
        },
      });
    } catch (error) {
      console.error("Submit Payment Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Check user subscription status
  async checkSubscription(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const result = await appwriteService.getUserActiveSubscription(email);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to check subscription status",
        });
      }

      if (result.subscription) {
        const expiresAt = new Date(result.subscription.expires_at);
        const now = new Date();
        const timeRemaining = expiresAt - now;
        // Math.ceil: if user has 1 hour left, rounds to 1 day for better UX
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        const status = result.subscription.status || "unknown";
        const isActive = status === "active" && timeRemaining > 0;

        console.log(`📋 Subscription Found:`);
        console.log(`   Email: ${result.subscription.email}`);
        console.log(`   Plan: ${result.subscription.plan_type}`);
        console.log(`   Expires: ${expiresAt.toISOString()}`);
        console.log(`   Days Remaining: ${daysRemaining}`);
        console.log(`   Active: ${isActive}`);

        return res.json({
          success: true,
          isActive,
          status,
          subscription: {
            email: result.subscription.email,
            phone: result.subscription.phone,
            planType: result.subscription.plan_type,
            planName: this.getPlanName(result.subscription.plan_type),
            amount: result.subscription.amount,
            expiresAt: result.subscription.expires_at,
            daysRemaining,
            paidAt: result.subscription.paid_at,
            status,
            fullName: result.subscription.full_name,
          },
        });
      }

      res.json({
        success: true,
        isActive: false,
        status: "no_subscription",
        message: "No subscription found. Please complete payment first.",
      });
    } catch (error) {
      console.error("Check Subscription Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Activate subscription after payment verification (called by callback)
  async activateByPhone(req, res) {
    try {
      const { phone, amount } = req.body;

      if (!phone || !amount) {
        return res.status(400).json({
          success: false,
          message: "Phone and amount are required",
        });
      }

      // Find pending payment by phone and amount
      const result = await appwriteService.getPendingPaymentByPhoneAndAmount(
        phone,
        amount,
      );

      if (!result.success || !result.payment) {
        return res.status(404).json({
          success: false,
          message: "No pending payment found for this phone and amount",
        });
      }

      const paymentId = result.payment.$id;
      console.log(
        `✅ Activating subscription ${paymentId} for phone: ${phone}`,
      );

      // Activate the subscription
      const updateResult = await appwriteService.updatePaymentStatus(
        paymentId,
        "active",
      );

      if (!updateResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to activate subscription",
        });
      }

      console.log("✅ Subscription activated!");
      console.log(
        "🎯 User has IMMEDIATE ACCESS to site - status set to 'active' in database",
      );

      // Send activation confirmation email (non-blocking - access is already granted)
      // Email is optional and does not affect access
      emailService
        .sendActivationConfirmation(result.payment)
        .catch((emailError) => {
          console.error(
            "⚠️ Activation email failed (non-critical):",
            emailError.message,
          );
          // Continue - user already has access even if email fails
        });

      res.json({
        success: true,
        message:
          "✅ Subscription activated! You now have IMMEDIATE ACCESS to all content. Email confirmation sent separately.",
        hasAccess: true,
        subscription: updateResult.payment,
      });
    } catch (error) {
      console.error("Activate By Phone Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get payment history
  async getPaymentHistory(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const result = await appwriteService.getUserPaymentHistory(email);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch payment history",
        });
      }

      const formattedPayments = result.payments.map((payment) => ({
        id: payment.$id,

        amount: payment.amount,
        planType: payment.plan_type,
        status: payment.status,
        paidAt: payment.paid_at,
        expiresAt: payment.expires_at,
        verifiedAt: payment.verification_date,
      }));

      res.json({
        success: true,
        payments: formattedPayments,
      });
    } catch (error) {
      console.error("Payment History Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get all pending payments
  async getPendingPayments(req, res) {
    try {
      const result = await appwriteService.getPendingPayments();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch pending payments",
        });
      }

      res.json({
        success: true,
        payments: result.payments,
      });
    } catch (error) {
      console.error("Pending Payments Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get payment by ID
  async getPaymentById(req, res) {
    try {
      const { adminkey, "admin-key": adminKeyHeader } = req.headers;
      const adminKey = adminkey || adminKeyHeader;
      const { paymentId } = req.params;

      // Admin authentication
      if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
        console.log("❌ Unauthorized attempt to get payment:", {
          providedKey: adminKey ? "***" + adminKey.slice(-3) : "none",
          expectedKey: process.env.ADMIN_SECRET
            ? "***" + process.env.ADMIN_SECRET.slice(-3)
            : "none",
        });
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await appwriteService.getPaymentById(paymentId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      res.json({
        success: true,
        payment: result.payment,
      });
    } catch (error) {
      console.error("Get Payment By ID Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Add to your appwrite.js service:
  async getTotalPaymentsCount() {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        process.env.USER_PAYMENTS_COLLECTION_ID,
      );
      return result.total;
    } catch (error) {
      console.error("Get Total Payments Count Error:", error);
      return 0;
    }
  }

  async getPendingPaymentsCount() {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        process.env.USER_PAYMENTS_COLLECTION_ID,
        [Query.equal("status", "pending")],
      );
      return result.total;
    } catch (error) {
      console.error("Get Pending Payments Count Error:", error);
      return 0;
    }
  }

  async getActiveUsersCount() {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        process.env.USER_PAYMENTS_COLLECTION_ID,
        [
          Query.equal("status", "active"),
          Query.greaterThan("expires_at", new Date().toISOString()),
        ],
      );
      return result.total;
    } catch (error) {
      console.error("Get Active Users Count Error:", error);
      return 0;
    }
  }

  async getTotalRevenue() {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        process.env.USER_PAYMENTS_COLLECTION_ID,
        [Query.equal("status", "active")],
      );

      let total = 0;
      result.documents.forEach((payment) => {
        total += parseInt(payment.amount) || 0;
      });

      return total;
    } catch (error) {
      console.error("Get Total Revenue Error:", error);
      return 0;
    }
  }

  async _getPaymentByIdFromDB(paymentId) {
    try {
      const payment = await this.databases.getDocument(
        this.databaseId,
        process.env.USER_PAYMENTS_COLLECTION_ID,
        paymentId,
      );

      return { success: true, payment };
    } catch (error) {
      console.error("Get Payment By ID Error:", error);
      return { success: false, error: error.message };
    }
  }

  // Admin: Get payment statistics
  async getPaymentStats(req, res) {
    try {
      const { adminKey } = req.headers;

      // Admin authentication
      /* if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid admin key",
        });
      } */

      // Get statistics from Appwrite
      const stats = await appwriteService.getPaymentStats();

      res.json({
        success: true,
        totalPayments: stats.totalPayments || 0,
        pendingCount: stats.pendingCount || 0,
        activeUsers: stats.activeUsers || 0,
        totalRevenue: stats.totalRevenue || 0,
      });
    } catch (error) {
      console.error("Get Payment Stats Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Get all payments with filters
  async getAllPayments(req, res) {
    try {
      const { adminKey } = req.headers;
      const {
        page = 1,
        limit = 10,
        dateFrom,
        dateTo,
        status,
        search,
      } = req.query;

      // Admin authentication
      /* if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid admin key",
        });
      } */

      const result = await appwriteService.getAllPayments({
        page: parseInt(page),
        limit: parseInt(limit),
        dateFrom,
        dateTo,
        status,
        search,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch payments",
        });
      }

      res.json({
        success: true,
        payments: result.payments || [],
        total: result.total || 0,
        pages: Math.ceil((result.total || 0) / limit),
        page: parseInt(page),
      });
    } catch (error) {
      console.error("Get All Payments Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { paymentId, status } = req.body;
      const { adminkey, "admin-key": adminKeyHeader } = req.headers;

      // Accept both adminkey and admin-key headers
      const adminKey = adminkey || adminKeyHeader;

      // Simple admin authentication
      if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
        console.log("❌ Unauthorized admin attempt:", {
          providedKey: adminKey ? "***" + adminKey.slice(-3) : "none",
          expectedKey: process.env.ADMIN_SECRET
            ? "***" + process.env.ADMIN_SECRET.slice(-3)
            : "none",
        });
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid admin key",
        });
      }

      if (!paymentId || !status) {
        return res.status(400).json({
          success: false,
          message: "Payment ID and status are required",
        });
      }

      console.log(`🔄 Verifying payment ${paymentId} with status: ${status}`);

      const result = await appwriteService.updatePaymentStatus(
        paymentId,
        status,
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to update payment status",
        });
      }

      console.log("✅ Payment status updated:", result.payment.$id);

      // If payment is activated, user gets IMMEDIATE ACCESS to the site
      if (status === "active") {
        console.log(
          "🎯 Payment verified and activated - User has IMMEDIATE ACCESS",
        );

        // Send confirmation email asynchronously (non-blocking)
        // Email failure does not affect user access
        (async () => {
          try {
            console.log("📧 Sending confirmation email...");

            // Generate 6-digit access code for email reference
            const accessCode = Math.floor(
              100000 + Math.random() * 900000,
            ).toString();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Store access code in database
            const { Query, ID } = require("node-appwrite");

            try {
              // Delete any existing codes for this email
              const existingCodes = await this.databases.listDocuments(
                this.databaseId,
                process.env.SESSIONS_COLLECTION_ID,
                [
                  Query.equal("contact", result.payment.email),
                  Query.equal("type", "access_code"),
                ],
              );

              for (const doc of existingCodes.documents) {
                await this.databases.deleteDocument(
                  this.databaseId,
                  process.env.SESSIONS_COLLECTION_ID,
                  doc.$id,
                );
              }

              // Create new access code
              await this.databases.createDocument(
                this.databaseId,
                process.env.SESSIONS_COLLECTION_ID,
                ID.unique(),
                {
                  contact: result.payment.email,
                  code: accessCode,
                  type: "access_code",
                  expiresAt: expiresAt.toISOString(),
                  attempts: 0,
                  createdAt: new Date().toISOString(),
                },
              );

              console.log("✅ Access code stored:", accessCode);
            } catch (codeError) {
              console.error(
                "⚠️ Error storing access code (non-critical):",
                codeError,
              );
            }

            // Send activation email with access code
            await emailService.sendActivationWithAccessCode(
              result.payment,
              accessCode,
            );
            console.log("✅ Confirmation email sent successfully");
          } catch (emailError) {
            console.error(
              "⚠️ Confirmation email failed (non-critical):",
              emailError.message,
            );
            // DON'T block user access - email is optional
          }
        })();
      }

      res.json({
        success: true,
        message:
          status === "active"
            ? `✅ Payment verified successfully! You now have IMMEDIATE ACCESS to all content.`
            : `Payment status updated to ${status}`,
        hasAccess: status === "active",
        payment: result.payment,
      });
    } catch (error) {
      console.error("Verify Payment Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Admin: Generate access code for user with payment issues
  async generateAccessCode(req, res) {
    try {
      const { adminkey, "admin-key": adminKeyHeader } = req.headers;
      const adminKey = adminkey || adminKeyHeader;

      // Admin authentication
      if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
        console.log("❌ Unauthorized admin attempt to generate access code");
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid admin key",
        });
      }

      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
      }

      // Get payment details
      const paymentResult = await appwriteService.getPaymentById(paymentId);

      if (!paymentResult.success || !paymentResult.payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      const payment = paymentResult.payment;
      const planType = payment.plan_type || "monthly";

      console.log(
        `🔐 Generating access code for payment ${paymentId} - Plan: ${planType}`,
      );

      // Generate 6-digit access code
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store access code in database
      const { Query, ID } = require("node-appwrite");

      try {
        // Delete any existing codes for this email
        const existingCodes = await this.databases.listDocuments(
          this.databaseId,
          process.env.SESSIONS_COLLECTION_ID,
          [
            Query.equal("contact", payment.email),
            Query.equal("type", "access_code"),
          ],
        );

        for (const doc of existingCodes.documents) {
          await this.databases.deleteDocument(
            this.databaseId,
            process.env.SESSIONS_COLLECTION_ID,
            doc.$id,
          );
        }

        // Create new access code
        const codeDocument = await this.databases.createDocument(
          this.databaseId,
          process.env.SESSIONS_COLLECTION_ID,
          ID.unique(),
          {
            contact: payment.email,
            code: accessCode,
            type: "access_code",
            expiresAt: expiresAt.toISOString(),
            attempts: 0,
            createdAt: new Date().toISOString(),
            paymentId: paymentId,
            planType: planType,
            generatedByAdmin: true,
          },
        );

        console.log("✅ Access code generated:", accessCode);

        // Send response immediately - email will be sent in background
        res.json({
          success: true,
          message: `✅ Access code generated successfully for ${payment.full_name}`,
          accessCode,
          email: payment.email,
          planType,
          expiresAt: expiresAt.toISOString(),
          expiresIn: "24 hours",
          instructions: `Share this code with the user. They can use it to sign in: ${accessCode}`,
        });

        // Send email asynchronously in background (non-blocking)
        setImmediate(async () => {
          try {
            await emailService.sendActivationWithAccessCode(
              payment,
              accessCode,
            );
            console.log("📧 Access code email sent to:", payment.email);
          } catch (emailError) {
            console.error(
              "⚠️ Email send failed (non-critical):",
              emailError.message,
            );
          }
        });
      } catch (codeError) {
        console.error("❌ Error generating access code:", codeError.message);
        return res.status(500).json({
          success: false,
          message: "Failed to generate access code",
          error: codeError.message,
        });
      }
    } catch (error) {
      console.error("Generate Access Code Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new PaymentController();
