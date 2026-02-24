const nodemailer = require("nodemailer");
const {
  SUBSCRIPTION_PLANS,
  TILL_NUMBER,
  SUPPORT_WHATSAPP,
} = require("../config/constants");

class EmailService {
  constructor() {
    // Configure transporter based on EMAIL_SERVICE setting
    const transportConfig = {
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    };

    // Use custom SMTP if EMAIL_SERVICE is 'smtp', otherwise use service name
    if (process.env.EMAIL_SERVICE === "smtp") {
      transportConfig.host = process.env.EMAIL_HOST || "mail.memeyai.com";
      transportConfig.port = parseInt(process.env.EMAIL_PORT || "587");
      transportConfig.secure = process.env.EMAIL_SECURE === "true";
    } else {
      transportConfig.service = process.env.EMAIL_SERVICE || "gmail";
      if (process.env.EMAIL_SERVICE === "gmail") {
        transportConfig.host = "smtp.gmail.com";
        transportConfig.port = 465;
        transportConfig.secure = true;
      }
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP connection verified");
    } catch (error) {
      console.warn("⚠️ SMTP connection warning:", error.message);
    }
  }

  async sendAccessCode(email, accessCode) {
    console.log("📧 Sending access code to:", email);

    const mailOptions = {
      from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your ShuleAI Access Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2e7d4a, #4caf50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .code-box { background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #4caf50; }
                .code { font-size: 36px; font-weight: bold; color: #2e7d4a; letter-spacing: 8px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Your Access Code</h1>
                    <p>Welcome to ShuleAI Learning Platform</p>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <p>You requested access to ShuleAI. Here is your 6-digit access code:</p>
                    
                    <div class="code-box">
                        <div class="code">${accessCode}</div>
                    </div>

                    <p><strong>⏰ This code expires in 5 minutes.</strong></p>
                    
                    <p>If you didn't request this code, please ignore this email.</p>

                    <div class="footer">
                        <p>Need help? Contact us at ${
                          process.env.SUPPORT_EMAIL || "support@shuleai.com"
                        }</p>
                        <p>© ${new Date().getFullYear()} ShuleAI. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `Your ShuleAI access code is: ${accessCode}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Access code email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error("❌ Failed to send access code email:", error);
      throw error;
    }
  }

  async sendPaymentRequestEmail(email) {
    console.log("📧 Sending payment request to:", email);

    const mailOptions = {
      from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Payment Required - ShuleAI Access",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2e7d4a, #4caf50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .payment-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #4caf50; }
                .till-number { font-size: 32px; font-weight: bold; color: #2e7d4a; text-align: center; letter-spacing: 3px; margin: 15px 0; }
                .price { font-size: 24px; color: #2e7d4a; font-weight: bold; }
                .steps { margin: 20px 0; }
                .step { display: flex; margin: 10px 0; align-items: start; }
                .step-num { background: #4caf50; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💳 Payment Required</h1>
                    <p>Subscribe to access ShuleAI Learning Platform</p>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <p>You attempted to access ShuleAI, but no active subscription was found for your account.</p>
                    
                    <div class="payment-box">
                        <h3 style="text-align: center; margin-top: 0;">Pay via M-PESA</h3>
                        <p style="text-align: center; margin: 10px 0;">Till Number:</p>
                        <div class="till-number">${TILL_NUMBER}</div>
                        <p style="text-align: center; margin: 5px 0;"><strong>Business Name:</strong> MemeyAI Digital Solutions</p>
                    </div>

                    <h3>📱 Payment Instructions:</h3>
                    <div class="steps">
                        <div class="step"><div class="step-num">1</div><div>Go to M-Pesa on your phone</div></div>
                        <div class="step"><div class="step-num">2</div><div>Select Lipa na M-Pesa</div></div>
                        <div class="step"><div class="step-num">3</div><div>Select Buy Goods and Services</div></div>
                        <div class="step"><div class="step-num">4</div><div>Enter Till Number: <strong>${TILL_NUMBER}</strong></div></div>
                        <div class="step"><div class="step-num">5</div><div>Enter amount based on your plan</div></div>
                        <div class="step"><div class="step-num">6</div><div>Enter your M-Pesa PIN</div></div>
                        <div class="step"><div class="step-num">7</div><div>Wait for confirmation SMS</div></div>
                    </div>

                    <h3>💰 Subscription Plans:</h3>
                    <div class="payment-box">
                        <p><strong>Weekly:</strong> <span class="price">KES 50</span> (7 days access)</p>
                        <p><strong>Monthly:</strong> <span class="price">KES 150</span> (30 days access)</p>
                        <p><strong>Termly:</strong> <span class="price">KES 400</span> (90 days access)</p>
                    </div>

                    <p><strong>What happens after payment?</strong></p>
                    <ol>
                        <li>Our admin will verify your payment within 24 hours</li>
                        <li>You'll receive an access code via email</li>
                        <li>Use the code to sign in and enjoy unlimited learning!</li>
                    </ol>

                    <div class="footer">
                        <p>Need help? Contact us at ${
                          process.env.SUPPORT_EMAIL || "support@shuleai.com"
                        }</p>
                        <p>WhatsApp: ${
                          process.env.SUPPORT_WHATSAPP || "+254723456789"
                        }</p>
                        <p>© ${new Date().getFullYear()} ShuleAI. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `Payment Required - ShuleAI Access\n\nYou need an active subscription to access ShuleAI.\n\nPay via M-PESA:\nTill Number: ${TILL_NUMBER}\nBusiness: MemeyAI Digital Solutions\n\nPlans:\n- Weekly: KES 50\n- Monthly: KES 150\n- Termly: KES 400\n\nAfter payment, our admin will verify and send you an access code within 24 hours.`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Payment request email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Failed to send payment request email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentConfirmation(paymentData) {
    console.log("📧 sendPaymentConfirmation called with:", {
      email: paymentData.email,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
    });
    const plan = SUBSCRIPTION_PLANS[paymentData.planType];
    const fullName =
      paymentData.fullName || paymentData.full_name || "Valued User";

    const mailOptions = {
      from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
      to: paymentData.email,
      subject: `⏳ Payment Received - Awaiting Verification`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { font-size: 28px; margin-bottom: 10px; }
                .header p { font-size: 16px; opacity: 0.95; }
                .icon { font-size: 3rem; margin-bottom: 15px; }
                .content { padding: 30px; }
                .greeting { font-size: 16px; margin-bottom: 20px; }
                .status-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 6px; margin: 20px 0; }
                .status-box strong { color: #856404; }
                .details-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #ddd; }
                .detail-row:last-child { border-bottom: none; }
                .detail-label { font-weight: 600; color: #555; }
                .detail-value { color: #667eea; font-weight: 600; }
                .amount-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .amount-value { font-size: 32px; font-weight: bold; margin: 10px 0; }
                .features-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }
                .features-box h3 { color: #667eea; margin-bottom: 15px; font-size: 16px; }
                .feature { display: flex; align-items: center; padding: 8px 0; }
                .feature-icon { color: #4caf50; margin-right: 10px; font-size: 18px; }
                .feature-text { color: #555; }
                .timeline { margin: 25px 0; }
                .step { display: flex; margin: 15px 0; }
                .step-number { background: #667eea; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
                .step-content { padding-top: 5px; }
                .step-title { font-weight: 600; color: #333; margin-bottom: 5px; }
                .step-desc { color: #666; font-size: 14px; }
                .action-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; width: 100%; box-sizing: border-box; }
                .action-button:hover { opacity: 0.95; }
                .support-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 20px 0; }
                .support-box h4 { color: #667eea; margin-bottom: 10px; }
                .support-box p { color: #555; margin: 5px 0; font-size: 14px; }
                .footer { background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #ddd; }
                .footer p { color: #666; font-size: 12px; margin: 5px 0; }
                .footer-links { margin-top: 10px; }
                .footer-links a { color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">⏳</div>
                    <h1>Payment Received!</h1>
                    <p>Thank you for your purchase</p>
                </div>

                <div class="content">
                    <div class="greeting">
                        <p>Hello <strong>${fullName}</strong>,</p>
                        <p>We have successfully received your payment for <strong>${plan.name}</strong>. Your subscription is now being processed.</p>
                    </div>

                    <div class="status-box">
                        <strong>⏳ Status: Awaiting Verification</strong>
                        <p style="margin-top: 8px; font-size: 14px;">Our admin team is verifying your payment with M-Pesa. This typically takes 1-5 minutes. Once verified, you'll receive a confirmation email with immediate access to all features.</p>
                    </div>

                    <div class="amount-box">
                        <div style="font-size: 14px; opacity: 0.9;">Amount Paid</div>
                        <div class="amount-value">KES ${paymentData.amount}</div>
                        <div style="font-size: 12px; opacity: 0.85; margin-top: 5px;">Phone: ${paymentData.phone}</div>
                    </div>

                    <div class="details-box">
                        <div class="detail-row">
                            <span class="detail-label">📋 Plan</span>
                            <span class="detail-value">${plan.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💳 Amount</span>
                            <span class="detail-value">KES ${paymentData.amount}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📞 Payment Method</span>
                            <span class="detail-value">M-Pesa</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">✉️ Email</span>
                            <span class="detail-value">${paymentData.email}</span>
                        </div>
                    </div>

                    <div class="features-box">
                        <h3>✨ What You'll Get:</h3>
                        <div class="feature">
                            <span class="feature-icon">🎮</span>
                            <span class="feature-text">54+ Educational Games aligned with CBC curriculum</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📚</span>
                            <span class="feature-text">All subjects covered: Math, Science, English, Kiswahili & more</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📊</span>
                            <span class="feature-text">Progress tracking and detailed performance insights</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">⭐</span>
                            <span class="feature-text">Interactive learning experiences and achievements</span>
                        </div>
                    </div>

                    <div class="timeline">
                        <h3 style="margin-bottom: 15px; color: #333;">What Happens Next:</h3>
                        <div class="step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <div class="step-title">Verification (1-5 minutes)</div>
                                <div class="step-desc">Our admin team verifies your M-Pesa payment</div>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <div class="step-title">Confirmation Email</div>
                                <div class="step-desc">You'll receive an email confirming your subscription activation</div>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <div class="step-title">Start Learning</div>
                                <div class="step-desc">Sign in and immediately access all games and features</div>
                            </div>
                        </div>
                    </div>

                    <a href="${process.env.FRONTEND_URL || "https://shule.memeyai.com"}" class="action-button">Visit ShuleAI Now →</a>

                    <div class="support-box">
                        <h4>❓ Need Help?</h4>
                        <p>📧 Email: ${process.env.SUPPORT_EMAIL || "support@shuleai.com"}</p>
                        <p>💬 WhatsApp: ${SUPPORT_WHATSAPP || "+254111579473"}</p>
                        <p>If you have any questions or concerns, feel free to reach out to our support team.</p>
                    </div>
                </div>

                <div class="footer">
                    <p><strong>Thank you for choosing ShuleAI!</strong></p>
                    <p>We're committed to providing the best learning experience for students</p>
                    <div class="footer-links">
                        <a href="${process.env.FRONTEND_URL || "https://shule.memeyai.com"}">Visit Website</a>
                        <a href="mailto:${process.env.SUPPORT_EMAIL || "support@shuleai.com"}">Contact Us</a>
                    </div>
                    <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                        © 2026 Shule AI Plus +. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `Payment Received - Thank You!

Hello ${fullName},

We have successfully received your payment for ${plan.name}.

Payment Details:
- Plan: ${plan.name}
- Amount: KES ${paymentData.amount}
- Payment Method: M-Pesa
- Email: ${paymentData.email}

Status: Awaiting Verification

Our admin team is verifying your payment with M-Pesa. This typically takes 1-5 minutes. Once verified, you'll receive a confirmation email with immediate access to all features.

What You Get:
✓ 54+ Educational Games aligned with CBC curriculum
✓ All subjects covered: Math, Science, English, Kiswahili & more
✓ Progress tracking and detailed performance insights
✓ Interactive learning experiences

What Happens Next:
1. Verification (1-5 minutes) - Our admin team verifies your M-Pesa payment
2. Confirmation Email - You'll receive confirmation of your subscription activation
3. Start Learning - Sign in and access all games and features immediately

Need Help?
Email: ${process.env.SUPPORT_EMAIL || "support@shuleai.com"}
WhatsApp: ${SUPPORT_WHATSAPP || "+254111579473"}

Visit: ${process.env.FRONTEND_URL || "https://shule.memeyai.com"}

Thank you for choosing ShuleAI!
© 2026 Shule AI Plus +. All rights reserved.`,
    };

    try {
      console.log(
        "📤 Attempting to send payment confirmation email via transporter",
      );
      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        "✅ Payment confirmation email sent successfully:",
        info.messageId,
      );
      return { success: true };
    } catch (error) {
      console.error("Email Error:", error);
      return { success: false, error: error.message };
    }
  }

  async sendActivationWithAccessCode(paymentData, accessCode) {
    try {
      console.log("📧 Sending activation email with access code:", {
        email: paymentData.email,
        accessCode: accessCode,
      });

      const planType = paymentData.planType || paymentData.plan_type;
      const plan = SUBSCRIPTION_PLANS[planType];

      if (!plan) {
        console.error("❌ Invalid plan type:", planType);
        return { success: false, error: "Invalid plan type" };
      }

      const mailOptions = {
        from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
        to: paymentData.email,
        subject: "🎉 Payment Approved - Your ShuleAI Access Code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #2e7d4a, #4caf50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                  .code-box { background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; border: 3px solid #4caf50; }
                  .code { font-size: 42px; font-weight: bold; color: #2e7d4a; letter-spacing: 10px; margin: 20px 0; }
                  .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
                  .btn { background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9rem; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>🎉 Payment Approved!</h1>
                      <p>Welcome to ShuleAI Learning Platform</p>
                  </div>
                  <div class="content">
                      <h2>Hello ${paymentData.full_name || "Student"}!</h2>
                      <p>Great news! Your payment has been approved and verified by our admin.</p>
                      
                      <div class="code-box">
                          <h3 style="margin-top: 0; color: #2e7d4a;">🔐 Your Access Code</h3>
                          <div class="code">${accessCode}</div>
                          <p style="margin-bottom: 0;"><strong>⏰ Valid for 5 minutes</strong></p>
                      </div>

                      <h3>How to Sign In:</h3>
                      <ol>
                          <li>Go to <a href="${
                            process.env.FRONTEND_URL ||
                            "https://shule.memeyai.com"
                          }">${process.env.FRONTEND_URL || "ShuleAI"}</a></li>
                          <li>Click "Sign In"</li>
                          <li>Enter your email: <strong>${
                            paymentData.email
                          }</strong></li>
                          <li>Click "Send Access Code"</li>
                          <li>Enter the 6-digit code above</li>
                          <li>Start learning! 🚀</li>
                      </ol>

                      <div class="info-box">
                          <h3>Your Subscription Details:</h3>
                          <p><strong>Plan:</strong> ${plan.name}</p>
                          <p><strong>Amount Paid:</strong> KSh ${
                            paymentData.amount
                          }</p>
                          <p><strong>Transaction Code:</strong> ${
                            paymentData.transaction_code
                          }</p>
                          <p><strong>Valid Until:</strong> ${new Date(
                            paymentData.expires_at,
                          ).toLocaleDateString()}</p>
                      </div>

                      <p><strong>✨ What's included:</strong></p>
                      <ul>
                          <li>Access to all educational games</li>
                          <li>Math, Science, English, and more!</li>
                          <li>Interactive learning experiences</li>
                          <li>Progress tracking</li>
                      </ul>

                      <div style="text-align: center;">
                          <a href="${
                            process.env.FRONTEND_URL ||
                            "https://shule.memeyai.com"
                          }" class="btn">Start Learning Now →</a>
                      </div>

                      <div class="footer">
                          <p>Need help? Contact us:</p>
                          <p>📧 ${
                            process.env.SUPPORT_EMAIL || "support@shuleai.com"
                          }</p>
                          <p>📱 WhatsApp: ${
                            process.env.SUPPORT_WHATSAPP || "+254723456789"
                          }</p>
                          <p>© ${new Date().getFullYear()} ShuleAI. All rights reserved.</p>
                      </div>
                  </div>
              </div>
          </body>
          </html>
        `,
        text: `Payment Approved - Your ShuleAI Access Code\n\nYour 6-digit access code: ${accessCode}\n\nValid for: 5 minutes\n\nSubscription: ${
          plan.name
        }\nAmount: KSh ${paymentData.amount}\nValid Until: ${new Date(
          paymentData.expires_at,
        ).toLocaleDateString()}\n\nTo sign in:\n1. Go to ${
          process.env.FRONTEND_URL || "ShuleAI"
        }\n2. Click "Sign In"\n3. Enter your email: ${
          paymentData.email
        }\n4. Enter the code above\n\nStart learning now!`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Activation email with access code sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Failed to send activation email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendActivationConfirmation(paymentData) {
    try {
      console.log("📧 Activation email payment data:", {
        planType: paymentData.planType,
        plan_type: paymentData.plan_type,
        keys: Object.keys(paymentData),
      });

      // Use plan_type (from database) if planType is not available
      const planType = paymentData.planType || paymentData.plan_type;

      if (!planType) {
        console.error("❌ Plan type not found in payment data");
        return { success: false, error: "Plan type not found" };
      }

      const plan = SUBSCRIPTION_PLANS[planType];

      if (!plan) {
        console.error("❌ Invalid plan type:", planType);
        console.log("Available plans:", Object.keys(SUBSCRIPTION_PLANS));
        return { success: false, error: `Invalid plan type: ${planType}` };
      }

      const expiresAt = new Date(paymentData.expires_at);
      const fullName =
        paymentData.full_name || paymentData.fullName || "Valued User";
      const email = paymentData.email;

      if (!email) {
        console.error("❌ Email not found in payment data");
        return { success: false, error: "Email not found" };
      }

      console.log("✅ Preparing activation email for:", {
        email,
        fullName,
        planType,
        planName: plan.name,
        expiresAt: expiresAt.toISOString(),
      });

      const mailOptions = {
        from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🎉 Your ShuleAI Subscription is Now Active!`,
        html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #4caf50, #2e7d4a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .success-icon { font-size: 4rem; margin: 20px 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .cta-button { display: inline-block; background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9rem; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="success-icon">✅</div>
                            <h1>Subscription Activated!</h1>
                            <p>Your ShuleAI access is now active</p>
                        </div>
                        <div class="content">
                            <h2>Welcome to ShuleAI Premium, ${fullName}!</h2>
                            
                            <p>Your <strong>${
                              plan.name
                            }</strong> subscription has been verified and activated.</p>
                            
                            <h3>Your Subscription Details:</h3>
                            <ul>
                                <li><strong>Plan:</strong> ${plan.name}</li>
                                <li><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</li>
                                <li><strong>Days Remaining:</strong> ${Math.ceil(
                                  (expiresAt - new Date()) /
                                    (1000 * 60 * 60 * 24),
                                )} days</li>
                                <li><strong>Access Level:</strong> Full access to all games and features</li>
                            </ul>
                            
                            <a href="${
                              process.env.FRONTEND_URL ||
                              "https://shule.memeyai.com"
                            }" class="cta-button">
                                Start Playing Now! 🎮
                            </a>
                            
                            <p><strong>Need Help?</strong></p>
                            <ul>
                                <li>Email: ${
                                  process.env.SUPPORT_EMAIL ||
                                  process.env.EMAIL_USER
                                }</li>
                                <li>WhatsApp: ${SUPPORT_WHATSAPP}</li>
                                <li>Website: ${
                                  process.env.FRONTEND_URL ||
                                  "hhttps://shule.memeyai.com"
                                }</li>
                            </ul>
                            
                            <div class="footer">
                                <p>Happy learning!<br>The ShuleAI Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
      };

      console.log("📤 Sending activation email to:", email);
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Activation email sent successfully:", info.messageId);

      return { success: true };
    } catch (error) {
      console.error("❌ Activation Email Error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  /* async sendActivationConfirmation(paymentData) {
    const plan = SUBSCRIPTION_PLANS[paymentData.planType];
    const expiresAt = new Date(paymentData.expires_at);

    const mailOptions = {
      from: `"ShuleAI" <${process.env.EMAIL_USER}>`,
      to: paymentData.email,
      subject: `🎉 Your ShuleAI Subscription is Now Active!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4caf50, #2e7d4a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .success-icon { font-size: 4rem; margin: 20px 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .cta-button { display: inline-block; background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">✅</div>
                    <h1>Subscription Activated!</h1>
                    <p>Your ShuleAI access is now active</p>
                </div>
                <div class="content">
                    <h2>Welcome to ShuleAI Premium, ${
                      paymentData.full_name
                    }!</h2>
                    
                    <p>Your <strong>${
                      plan.name
                    }</strong> subscription has been verified and activated.</p>
                    
                    <h3>Your Subscription Details:</h3>
                    <ul>
                        <li><strong>Plan:</strong> ${plan.name}</li>
                        <li><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</li>
                        <li><strong>Days Remaining:</strong> ${Math.ceil(
                          (expiresAt - new Date()) / (1000 * 60 * 60 * 24)
                        )} days</li>
                        <li><strong>Access Level:</strong> Full access to all games and features</li>
                    </ul>
                    
                    <a href="${
                      process.env.FRONTEND_URL || "http://localhost:5500"
                    }" class="cta-button">
                        Start Playing Now! 🎮
                    </a>
                    
                    <p><strong>Need Help?</strong></p>
                    <ul>
                        <li>Email: ${process.env.SUPPORT_EMAIL}</li>
                        <li>WhatsApp: ${SUPPORT_WHATSAPP}</li>
                        <li>Website: ${
                          process.env.FRONTEND_URL || "http://localhost:5500"
                        }</li>
                    </ul>
                    
                    <div class="footer">
                        <p>Happy learning!<br>The ShuleAI Team</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Activation Email Error:", error);
      return { success: false, error: error.message };
    }
  } */
}

module.exports = new EmailService();
