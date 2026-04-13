const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

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
