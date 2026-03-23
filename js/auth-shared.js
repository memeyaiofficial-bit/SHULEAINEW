// Shared Authentication JavaScript for ShuleAI
console.log("🚀 Starting to load auth-shared.js...");

// API Configuration
const AUTH_API_BASE_URL = "https://shuleaiv1.onrender.com/api";

// Quick Notification Function
function showQuickNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById("quick-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "quick-notification";
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #2e7d4a 0%, #1e5a35 100%);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-size: 0.9rem;
      max-width: 300px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.style.opacity = "1";

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
  }, 3000);
}

// Check if user is already signed in on page load
window.addEventListener("DOMContentLoaded", () => {
  const isSignedIn = localStorage.getItem("shuleai_signed_in");
  const accessCode = localStorage.getItem("shuleai_access_code");
  const accessType = localStorage.getItem("shuleai_access_type");
  const expiryTime = localStorage.getItem("shuleai_access_expiry");

  if (isSignedIn === "true" && accessCode) {
    // Check if it's a special code and if it has expired
    if (accessType === "special" && expiryTime) {
      const now = Date.now();
      const expiry = parseInt(expiryTime);

      if (now > expiry) {
        // Special code has expired
        alert(
          "⏰ Your special access has expired. Please use regular payment options or contact admin for a new special code.",
        );
        signOut();
        return;
      }
    }

    showMainApp();
  }
});

function openSignInModal() {
  document.getElementById("signInModal").style.display = "block";
  document.getElementById("paymentInfoStep").style.display = "block";
  document.getElementById("signInStep").style.display = "none";
  document.getElementById("verifyCodeStep").style.display = "none";
}

function closeSignInModal() {
  document.getElementById("signInModal").style.display = "none";
}

function showPaymentInfo() {
  document.getElementById("signInStep").style.display = "none";
  document.getElementById("verifyCodeStep").style.display = "none";
  document.getElementById("paymentInfoStep").style.display = "block";
}

function backToSignIn() {
  document.getElementById("signInStep").style.display = "block";
  document.getElementById("verifyCodeStep").style.display = "none";
  document.getElementById("paymentInfoStep").style.display = "none";
}

function showSignInStep() {
  document.getElementById("signInStep").style.display = "block";
  document.getElementById("verifyCodeStep").style.display = "none";
  document.getElementById("paymentInfoStep").style.display = "none";
}

// Handle game play - check if signed in and game is accessible
function playGame(gameName, gameFile) {
  const isSignedIn = localStorage.getItem("shuleai_signed_in");

  if (isSignedIn !== "true") {
    // Not signed in - show sign in modal
    openSignInModal();
    return;
  }

  // User has access - launch the game (no restrictions)
  if (gameFile) {
    window.location.href = gameFile;
  } else {
    alert("Game is coming soon!");
  }
}

// Request new code function
async function requestNewCode() {
  const contact =
    document.getElementById("phoneOrEmail").value ||
    localStorage.getItem("shuleai_contact");

  if (!contact) {
    alert("Please enter your email or phone number first.");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE_URL}/auth/request-new-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      // Show success message
      document.getElementById("signInStep").style.display = "none";
      document.getElementById("verifyCodeStep").style.display = "block";
    } else {
      alert(data.message || "Error requesting new code. Please try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error requesting new code. Please check your connection.");
  }
}

function showMainApp() {
  const landingPage = document.getElementById("landing-page");
  const mainApp = document.getElementById("mainApp");

  if (landingPage) landingPage.style.display = "none";
  if (mainApp) mainApp.style.display = "block";

  // Get user data from localStorage
  const userDataStr = localStorage.getItem("shuleai_user_data");
  const accessType = localStorage.getItem("shuleai_access_type");
  const expiryTime = localStorage.getItem("shuleai_access_expiry");
  let userData = null;

  if (userDataStr) {
    try {
      userData = JSON.parse(userDataStr);
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  // Show user status for special codes
  if (accessType === "special" && expiryTime) {
    const userStatus = document.getElementById("userStatus");
    const daysRemainingElement = document.getElementById("daysRemaining");

    if (userStatus && daysRemainingElement) {
      const now = Date.now();
      const expiry = parseInt(expiryTime);
      const timeRemaining = expiry - now;

      if (timeRemaining > 0) {
        const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

        let displayText = "";
        if (daysRemaining > 1) {
          displayText = `🎁 Special Access: ${daysRemaining} days left`;
        } else {
          displayText = `🎁 Special Access: ${hoursRemaining} hours left`;
        }

        daysRemainingElement.textContent = displayText;
        daysRemainingElement.style.background =
          "linear-gradient(135deg, #ff6b6b, #ee5a24)";
        daysRemainingElement.style.color = "white";
        daysRemainingElement.style.padding = "8px 15px";
        daysRemainingElement.style.borderRadius = "20px";
        daysRemainingElement.style.fontSize = "0.9rem";
        daysRemainingElement.style.fontWeight = "bold";
        userStatus.style.display = "block";
      } else {
        // Special code expired
        alert(
          "⏰ Your special access has expired. Please use regular payment options or contact admin for a new special code.",
        );
        signOut();
      }
    }
  }

  // Game access restrictions removed - all games are now accessible
}

// Apply game access control based on user's plan
// NOTE: Game restrictions have been removed - all games are now accessible
function applyGameAccessControl(gamesAllowed, planType) {
  // This function is now deprecated and does nothing
  // All games are accessible regardless of plan
  console.log("Game access restrictions disabled - all games are accessible");
}

// Sign out function
function signOut() {
  localStorage.removeItem("shuleai_signed_in");
  localStorage.removeItem("shuleai_access_code");
  localStorage.removeItem("shuleai_access_expiry");
  localStorage.removeItem("shuleai_access_type");
  localStorage.removeItem("shuleai_contact");
  localStorage.removeItem("shuleai_user_data");
  window.location.href = "index.html";
}

// Handle payment submission - This needs to be initialized after DOM load
function initializePaymentForm() {
  const paymentForm = document.getElementById("paymentSubmissionForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = {
        fullName: document.getElementById("paymentFullName").value,
        email: document.getElementById("paymentEmail").value,
        phone: document.getElementById("paymentPhone").value,
        transactionCode: document
          .getElementById("transactionCode")
          .value.toUpperCase(),
        planType: document.getElementById("planType").value,
      };

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;

      // Basic validation
      if (
        !formData.fullName ||
        !formData.email ||
        !formData.phone ||
        !formData.transactionCode ||
        !formData.planType
      ) {
        alert("Please fill in all required fields");
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/payments/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          alert(
            "✅ Payment submitted successfully!\n\n" +
              "Your payment is now pending admin approval.\n\n" +
              "Once approved, you will receive your access code via email.\n\n" +
              "You can then use your email/phone and access code to sign in.",
          );
          // Reset form
          document.getElementById("paymentSubmissionForm").reset();
          // Go back to sign in
          backToSignIn();
        } else {
          alert(data.message || "Error submitting payment. Please try again.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert(
          "Error submitting payment. Please check your connection and try again.",
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

// Handle special code validation and access
function handleSpecialCode(
  phoneOrEmail,
  accessCode,
  submitBtn,
  originalBtnText,
) {
  // ADMIN ONLY: Single master access code
  // This code grants unlimited access to admin email only
  const ADMIN_EMAIL = "shuleaiadmin@memeyai.com";
  const NGO_EMAIL = "shuleaingo@memeyai.com";
  const ADMIN_CODE = "SHULEAI-ADMIN-2025";
  const NGO_CODE = "SHULEAI-NGO-2026";

  // Check if email is admin or NGO email
  const emailLower = phoneOrEmail.toLowerCase();
  if (emailLower !== ADMIN_EMAIL && emailLower !== NGO_EMAIL) {
    alert(
      "❌ This access code is for admin or NGO use only.\n\nPlease contact admin at " +
        ADMIN_EMAIL +
        " or NGO at " +
        NGO_EMAIL +
        " for valid access codes.",
    );
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    return true; // Handled
  }

  // Check if code matches admin or NGO code
  if (
    (emailLower === ADMIN_EMAIL && accessCode !== ADMIN_CODE) ||
    (emailLower === NGO_EMAIL && accessCode !== NGO_CODE)
  ) {
    alert(
      "❌ Invalid code. Please enter the correct admin or NGO access code.",
    );
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    return true; // Handled
  }

  // Admin or NGO code is valid - grant unlimited access
  console.log("🔐 SPECIAL ACCESS GRANTED");

  // Set permanent access (no expiry)
  const permanentExpiry = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).getTime(); // 1 year (effectively permanent)

  localStorage.setItem("shuleai_signed_in", "true");
  localStorage.setItem("shuleai_access_code", accessCode);
  localStorage.setItem("shuleai_contact", phoneOrEmail);
  localStorage.setItem("shuleai_access_expiry", permanentExpiry);
  localStorage.setItem(
    "shuleai_access_type",
    emailLower === ADMIN_EMAIL ? "admin" : "ngo",
  );
  localStorage.setItem(
    "shuleai_user_data",
    JSON.stringify({
      contact: ADMIN_EMAIL,
      accessType: "admin",
      role: "Administrator",
      accessLevel: "unlimited",
      expiryDate: permanentExpiry,
      createdAt: new Date().toISOString(),
    }),
  );

  // Success notification
  showQuickNotification(
    "✅ Admin access granted! Unlimited access to all resources.",
  );

  console.log("📋 Admin session created:", {
    email: ADMIN_EMAIL,
    accessType: "admin",
    expiresAt: new Date(permanentExpiry).toISOString(),
  });

  // Close modal and show main app
  closeSignInModal();
  showMainApp();

  return true; // Handled
}

// Handle sign in form - This needs to be initialized after DOM load
function initializeSignInForm() {
  const signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const phoneOrEmail = document.getElementById("phoneOrEmail").value;
      const accessCode = document.getElementById("accessCode").value;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;

      // Check if it's an admin code
      if (accessCode.startsWith("SHULEAI-")) {
        if (
          handleSpecialCode(
            phoneOrEmail,
            accessCode,
            submitBtn,
            originalBtnText,
          )
        ) {
          return;
        }
      }

      // Validate regular code format
      if (accessCode.length !== 6 || !/^\d{6}$/.test(accessCode)) {
        alert(
          "Please enter a valid 6-digit code or admin code (SHULEAI-XXXXX)",
        );
        return;
      }

      // Store the phone/email
      localStorage.setItem("shuleai_contact", phoneOrEmail);

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/auth/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact: phoneOrEmail,
            code: accessCode,
          }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          // Store authentication data
          localStorage.setItem("shuleai_signed_in", "true");
          localStorage.setItem("shuleai_access_code", accessCode);
          localStorage.setItem(
            "shuleai_access_expiry",
            data.user?.expiryDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
          );
          if (data.user) {
            localStorage.setItem(
              "shuleai_user_data",
              JSON.stringify(data.user),
            );
          }

          // Close modal and show main app
          closeSignInModal();
          showMainApp();
        } else {
          // Check if code expired
          if (data.message && data.message.includes("expired")) {
            const requestNew = confirm(
              "⚠️ Your access code has expired.\n\n" +
                "Would you like to request a new code from the admin?",
            );
            if (requestNew) {
              requestNewCode();
            }
          } else {
            alert(
              data.message ||
                "Invalid code or email/phone. Please check and try again.",
            );
          }
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error signing in. Please check your connection and try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

// Initialize forms when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // initializePaymentForm(); // ← Disabled: using new STK Push handler in index.html instead
  initializeSignInForm();
});

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("signInModal");
  if (event.target == modal) {
    closeSignInModal();
  }
};

// ============================================
// PAGE ROUTING FUNCTIONS
// ============================================

function showPage(page) {
  document.querySelectorAll(".page-content").forEach((el) => {
    el.style.display = "none";
  });

  const pageElement = document.getElementById(`${page}-page`);
  if (pageElement) {
    pageElement.style.display = "block";
  } else {
    document.getElementById("home-page").style.display = "block";
  }
}

function updateNavigation() {
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const page = href.substring(1);
        window.location.hash = page;
        showPage(page);
      });
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 ShuleAI Initialized");

  let page = window.location.hash.substring(1) || "home";
  showPage(page);
  updateNavigation();

  window.addEventListener("hashchange", function () {
    page = window.location.hash.substring(1) || "home";
    showPage(page);
  });
});

// Worksheet Functions
function downloadWorksheet(worksheetId) {
  // Check if user is signed in
  const isSignedIn = localStorage.getItem("shuleai_signed_in");

  if (isSignedIn !== "true") {
    alert("⚠️ Please sign in to download worksheets");
    openSignInModal();
    return;
  }

  console.log(`📥 Downloading worksheet: ${worksheetId}`);
  showQuickNotification(`📥 Generating ${worksheetId} PDF worksheet...`);

  // Function to check if jsPDF is loaded
  function checkJsPDFLoaded(callback, attempts = 0) {
    const maxAttempts = 20; // Wait up to 2 seconds

    if (window.jspdf || window.jsPDF) {
      callback();
    } else if (attempts < maxAttempts) {
      setTimeout(() => checkJsPDFLoaded(callback, attempts + 1), 100);
    } else {
      console.error("❌ jsPDF library failed to load after waiting");
      showQuickNotification(
        "⚠️ PDF library not loaded. Please refresh the page.",
      );
      alert("PDF library not loaded. Please refresh the page and try again.");
    }
  }

  // Wait for jsPDF to be available
  checkJsPDFLoaded(() => {
    try {
      // Check if jsPDF is available with multiple fallbacks
      let jsPDF;
      if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
        console.log("✅ Using window.jspdf.jsPDF");
      } else if (window.jsPDF) {
        jsPDF = window.jsPDF;
        console.log("✅ Using window.jsPDF");
      } else {
        console.error("❌ jsPDF not found in window object");
        console.log(
          "Available window properties:",
          Object.keys(window).filter((k) => k.toLowerCase().includes("pdf")),
        );
        throw new Error("jsPDF library not loaded. Please refresh the page.");
      }

      const doc = new jsPDF();

      // Header
      doc.setFillColor(46, 125, 74);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont(undefined, "bold");
      doc.text("ChezaAI - ShuleAI", 105, 15, { align: "center" });
      doc.setFontSize(14);
      doc.text(`CBC ${worksheetId} Worksheet`, 105, 25, { align: "center" });

      // Reset colors
      doc.setTextColor(0, 0, 0);
      let yPos = 45;

      // Worksheet Details
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("WORKSHEET DETAILS", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`Subject: ${worksheetId}`, 20, yPos);
      yPos += 5;
      doc.text("Grade Levels: Grades 1-9 (CBC Aligned)", 20, yPos);
      yPos += 5;
      doc.text("Duration: 45-60 minutes", 20, yPos);
      yPos += 5;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 10;

      // Learning Outcomes
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("LEARNING OUTCOMES:", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      const outcomes = [
        `Master key concepts in ${worksheetId}`,
        "Apply problem-solving skills effectively",
        "Demonstrate understanding through practice",
        "Connect learning to real-world scenarios",
      ];
      outcomes.forEach((outcome) => {
        doc.text(`• ${outcome}`, 25, yPos);
        yPos += 5;
      });
      yPos += 5;

      // Instructions
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("INSTRUCTIONS FOR STUDENTS:", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text("1. Read each question carefully before answering", 25, yPos);
      yPos += 5;
      doc.text("2. Show all your working where required", 25, yPos);
      yPos += 5;
      doc.text("3. Check your answers before submitting", 25, yPos);
      yPos += 5;
      doc.text("4. Ask your teacher if you need clarification", 25, yPos);
      yPos += 10;

      // Sample Questions Section
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("PRACTICE QUESTIONS:", 20, yPos);
      yPos += 10;

      // Generate subject-specific questions
      const questions = generateWorksheetQuestions(worksheetId);
      questions.forEach((q, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, "bold");
        doc.text(`Question ${index + 1}:`, 20, yPos);
        yPos += 6;
        doc.setFont(undefined, "normal");
        const lines = doc.splitTextToSize(q.question, 170);
        lines.forEach((line) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 8;
      });

      // New page for answers
      doc.addPage();
      yPos = 20;

      // Answer Key
      doc.setFillColor(46, 125, 74);
      doc.rect(0, 10, 210, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("ANSWER KEY (For Teachers)", 105, 20, { align: "center" });
      doc.setTextColor(0, 0, 0);
      yPos = 35;

      questions.forEach((q, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${q.answer}`, 20, yPos);
        yPos += 6;
        if (q.explanation) {
          doc.setFont(undefined, "italic");
          doc.setFontSize(9);
          const expLines = doc.splitTextToSize(
            `   Explanation: ${q.explanation}`,
            170,
          );
          expLines.forEach((line) => {
            doc.text(line, 20, yPos);
            yPos += 4;
          });
        }
        yPos += 4;
      });

      // CBC Competencies
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("CBC COMPETENCIES ADDRESSED:", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      const competencies = [
        "Critical thinking and problem solving",
        "Communication and collaboration",
        "Creativity and imagination",
        "Digital literacy",
        "Learning to learn",
      ];
      competencies.forEach((comp) => {
        doc.text(`✓ ${comp}`, 25, yPos);
        yPos += 5;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `© 2025 ChezaAI - ShuleAI Platform | Page ${i} of ${pageCount}`,
          105,
          290,
          { align: "center" },
        );
      }

      // Save PDF
      doc.save(`CBC_${worksheetId}_Worksheet.pdf`);

      setTimeout(() => {
        showQuickNotification(`✅ ${worksheetId} worksheet downloaded!`);
      }, 500);
    } catch (error) {
      console.error("PDF generation error:", error);
      showQuickNotification(
        "⚠️ Error generating PDF. Opening printable version instead...",
      );

      // Fallback to HTML worksheet
      setTimeout(() => {
        openPrintableWorksheet(worksheetId);
      }, 1000);
    }
  });
}

// Fallback: Create printable HTML worksheet
function openPrintableWorksheet(worksheetId) {
  const questions = generateWorksheetQuestions(worksheetId);
  const date = new Date().toLocaleDateString();

  const worksheet = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CBC ${worksheetId} Worksheet</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #2e7d4a, #4caf50); color: white; padding: 20px; text-align: center; margin-bottom: 20px; border-radius: 10px; }
    .section-title { background: #e8f5e8; padding: 10px; margin: 20px 0 10px 0; font-weight: bold; border-left: 4px solid #2e7d4a; }
    .question { margin: 15px 0; padding: 10px; border-left: 3px solid #4caf50; background: #f9f9f9; }
    .answer-section { page-break-before: always; margin-top: 40px; }
    @media print { .no-print { display: none; } }
    .print-btn { background: #4caf50; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 20px 0; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Worksheet</button>
  <div class="header"><h1>ChezaAI - ShuleAI</h1><h2>CBC ${worksheetId} Worksheet</h2></div>
  <div style="margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 5px;">
    <strong>Subject:</strong> ${worksheetId}<br><strong>Date:</strong> ${date}<br><strong>Student Name:</strong> _______________________________
  </div>
  <div class="section-title">LEARNING OUTCOMES</div>
  <ul><li>Master key concepts in ${worksheetId}</li><li>Apply problem-solving skills effectively</li></ul>
  <div class="section-title">PRACTICE QUESTIONS</div>
  ${questions
    .map(
      (q, i) =>
        `<div class="question"><strong>Question ${i + 1}:</strong> ${
          q.question
        }<br><div style="margin-top:15px;padding:10px;background:white;min-height:60px;border:1px dashed #ccc;"><strong>Answer:</strong></div></div>`,
    )
    .join("")}
  <div class="answer-section">
    <div class="section-title">ANSWER KEY (For Teachers)</div>
    ${questions
      .map(
        (q, i) =>
          `<div class="question"><strong>${i + 1}.</strong> ${
            q.answer
          }<br><em style="color:#666;">Explanation: ${q.explanation}</em></div>`,
      )
      .join("")}
  </div>
  <div class="section-title">CBC COMPETENCIES ADDRESSED</div>
  <ul><li>✓ Critical thinking and problem solving</li><li>✓ Communication and collaboration</li><li>✓ Creativity and imagination</li></ul>
  <div style="text-align:center;margin-top:40px;padding:20px;color:#666;font-size:12px;border-top:2px solid #2e7d4a;">© 2025 ChezaAI - ShuleAI Platform</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(worksheet);
    printWindow.document.close();
    showQuickNotification(
      `✅ ${worksheetId} worksheet opened! You can now print it.`,
    );
  } else {
    alert("Please allow popups to view worksheets");
  }
}

// Helper function to generate subject-specific questions
function generateWorksheetQuestions(subject) {
  const questionBank = {
    "addition-subtraction": [
      {
        question: "Solve: 245 + 378 = ?",
        answer: "623",
        explanation:
          "Add units: 5+8=13 (carry 1), tens: 4+7+1=12 (carry 1), hundreds: 2+3+1=6",
      },
      {
        question: "Calculate: 856 - 429 = ?",
        answer: "427",
        explanation: "Subtract from right to left, borrowing where needed",
      },
      {
        question:
          "A farmer had 567 mangoes. He sold 289. How many mangoes are left?",
        answer: "278 mangoes",
        explanation: "567 - 289 = 278",
      },
      {
        question: "Find the sum: 1,234 + 2,567 + 789 = ?",
        answer: "4,590",
        explanation: "Add all three numbers together",
      },
      {
        question:
          "Kendi has 345 shillings. Her mother gives her 255 more. How much does she have now?",
        answer: "600 shillings",
        explanation: "345 + 255 = 600",
      },
    ],
    multiplication: [
      {
        question: "Calculate: 25 × 14 = ?",
        answer: "350",
        explanation: "(25 × 10) + (25 × 4) = 250 + 100 = 350",
      },
      {
        question: "A box contains 24 pencils. How many pencils are in 8 boxes?",
        answer: "192 pencils",
        explanation: "24 × 8 = 192",
      },
      {
        question: "Solve: 136 × 7 = ?",
        answer: "952",
        explanation: "Multiply each digit: (100×7) + (30×7) + (6×7)",
      },
      {
        question:
          "If one textbook costs KSh 450, how much do 12 textbooks cost?",
        answer: "KSh 5,400",
        explanation: "450 × 12 = 5,400",
      },
      {
        question: "Find the product: 45 × 23 = ?",
        answer: "1,035",
        explanation: "(45 × 20) + (45 × 3) = 900 + 135",
      },
    ],
    Mathematics: [
      {
        question: "Simplify: 3/4 + 1/2 = ?",
        answer: "5/4 or 1 1/4",
        explanation: "Find common denominator: 3/4 + 2/4 = 5/4",
      },
      {
        question:
          "Calculate the area of a rectangle with length 12cm and width 8cm.",
        answer: "96 cm²",
        explanation: "Area = length × width = 12 × 8 = 96",
      },
      {
        question: "If 5 books cost KSh 1,250, what is the cost of one book?",
        answer: "KSh 250",
        explanation: "1,250 ÷ 5 = 250",
      },
      {
        question: "Solve for x: 3x + 7 = 22",
        answer: "x = 5",
        explanation: "3x = 22 - 7 = 15, so x = 15 ÷ 3 = 5",
      },
      {
        question: "What is 35% of 200?",
        answer: "70",
        explanation: "(35 ÷ 100) × 200 = 70",
      },
    ],
    English: [
      {
        question: "Write the plural form of: child, tooth, mouse, sheep",
        answer: "children, teeth, mice, sheep",
        explanation: "Irregular plurals in English",
      },
      {
        question:
          'Identify the verb in this sentence: "The students study hard every day."',
        answer: "study",
        explanation: "A verb shows an action or state of being",
      },
      {
        question: 'Change to past tense: "I go to school."',
        answer: "I went to school.",
        explanation: '"Go" becomes "went" in past tense',
      },
      {
        question:
          'Write a sentence using the word "beautiful" as an adjective.',
        answer: "Example: The beautiful flower bloomed in the garden.",
        explanation: "Adjectives describe nouns",
      },
      {
        question: 'What is the opposite (antonym) of "difficult"?',
        answer: "easy",
        explanation: "Antonyms are words with opposite meanings",
      },
    ],
    Science: [
      {
        question: "Name three sources of light.",
        answer: "Sun, lamp, candle (or torch, fire, etc.)",
        explanation: "Light sources produce their own light",
      },
      {
        question: "What are the three states of matter?",
        answer: "Solid, Liquid, Gas",
        explanation: "Matter exists in these three main states",
      },
      {
        question: "Label the parts of a plant: root, stem, leaf, flower, fruit",
        answer: "Diagram should show all five parts correctly labeled",
        explanation: "Each part has a specific function",
      },
      {
        question: "Explain why we need water every day.",
        answer:
          "For drinking, cooking, cleaning, and keeping our bodies healthy",
        explanation: "Water is essential for life",
      },
      {
        question: "What happens to ice when it is heated?",
        answer: "It melts and becomes water",
        explanation: "This is a change of state from solid to liquid",
      },
    ],
    Social_Studies: [
      {
        question: "Name the capital city of Kenya.",
        answer: "Nairobi",
        explanation: "Nairobi is Kenya's largest city and capital",
      },
      {
        question: "List three physical features found in Kenya.",
        answer:
          "Mt. Kenya, Great Rift Valley, Lake Victoria (or other valid features)",
        explanation: "Kenya has diverse physical geography",
      },
      {
        question: "What are the three arms of government?",
        answer: "Executive, Legislature, Judiciary",
        explanation: "These three arms ensure separation of powers",
      },
      {
        question: "Name two cash crops grown in Kenya.",
        answer: "Tea and Coffee (or sugarcane, cotton, etc.)",
        explanation: "Cash crops are grown for sale",
      },
      {
        question: "Who was the first President of Kenya?",
        answer: "Jomo Kenyatta",
        explanation: "He led Kenya to independence in 1963",
      },
    ],
  };

  return (
    questionBank[subject] || [
      {
        question: `Practice problem 1 for ${subject}`,
        answer: "Answer 1",
        explanation: "Explanation provided",
      },
      {
        question: `Practice problem 2 for ${subject}`,
        answer: "Answer 2",
        explanation: "Explanation provided",
      },
      {
        question: `Practice problem 3 for ${subject}`,
        answer: "Answer 3",
        explanation: "Explanation provided",
      },
      {
        question: `Practice problem 4 for ${subject}`,
        answer: "Answer 4",
        explanation: "Explanation provided",
      },
      {
        question: `Practice problem 5 for ${subject}`,
        answer: "Answer 5",
        explanation: "Explanation provided",
      },
    ]
  );
}

function printWorksheet(worksheetId) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to print worksheets");
    return;
  }

  console.log(`🖨️ Printing worksheet: ${worksheetId}`);
  showQuickNotification(`🖨️ Preparing ${worksheetId} for printing...`);

  setTimeout(() => {
    alert(
      `Print dialog would open for "${worksheetId}" worksheet.\n\nIn production, this will:\n- Open the PDF in a new window\n- Trigger the browser's print dialog\n- Allow printer selection and settings`,
    );
  }, 500);
}

// Teachers Hub Functions
function viewLessonPlans(subject) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access lesson plans");
    return;
  }

  const subjectNames = {
    mathematics: "Mathematics",
    english: "English Language",
    science: "Science & Technology",
    social: "Social Studies",
  };

  const subjectName = subjectNames[subject] || subject;
  showQuickNotification(`📋 Generating ${subjectName} lesson plans PDF...`);

  try {
    if (typeof window.jspdf === "undefined") {
      throw new Error("PDF library not loaded");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(46, 125, 74);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont(undefined, "bold");
    doc.text("CBC Lesson Plans", 105, 18, { align: "center" });
    doc.setFontSize(16);
    doc.text(subjectName, 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    let yPos = 55;

    // Overview
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("TERM LESSON PLAN OVERVIEW", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Subject: " + subjectName, 20, yPos);
    yPos += 6;
    doc.text("Grade Levels: All CBC grades", 20, yPos);
    yPos += 6;
    doc.text("Term: 1, 2, or 3", 20, yPos);
    yPos += 6;
    doc.text("Curriculum: Competency-Based Curriculum (CBC)", 20, yPos);
    yPos += 12;

    // Learning Outcomes
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("LEARNING OUTCOMES:", 20, yPos);
    yPos += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const outcomes = getLessonOutcomes(subject);
    outcomes.forEach((outcome) => {
      const lines = doc.splitTextToSize("• " + outcome, 170);
      lines.forEach((line) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 25, yPos);
        yPos += 5;
      });
    });
    yPos += 8;

    // Weekly Breakdown
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("WEEKLY LESSON BREAKDOWN:", 20, yPos);
    yPos += 10;

    const weeklyLessons = getWeeklyLessons(subject);
    weeklyLessons.forEach((week, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text(`Week ${index + 1}: ${week.topic}`, 20, yPos);
      yPos += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      doc.text("Learning Outcomes:", 25, yPos);
      yPos += 5;
      const outcomeLines = doc.splitTextToSize(week.outcomes, 165);
      outcomeLines.forEach((line) => {
        doc.text("  - " + line, 25, yPos);
        yPos += 4;
      });
      yPos += 2;

      doc.text("Activities:", 25, yPos);
      yPos += 5;
      const activityLines = doc.splitTextToSize(week.activities, 165);
      activityLines.forEach((line) => {
        doc.text("  - " + line, 25, yPos);
        yPos += 4;
      });
      yPos += 2;

      doc.text("Assessment: " + week.assessment, 25, yPos);
      yPos += 8;
    });

    // New page for resources
    doc.addPage();
    yPos = 20;

    // Resources
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("TEACHING RESOURCES & MATERIALS:", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const resources = [
      "Textbooks aligned with CBC curriculum",
      "Manipulatives and hands-on materials",
      "Digital resources and educational games",
      "Charts, diagrams, and visual aids",
      "Assessment rubrics and checklists",
      "Worksheets and practice exercises",
    ];

    resources.forEach((resource) => {
      doc.text("• " + resource, 25, yPos);
      yPos += 6;
    });
    yPos += 10;

    // Assessment Strategies
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("ASSESSMENT STRATEGIES:", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const assessments = [
      "Formative assessment through observation",
      "Written tests and quizzes",
      "Practical demonstrations",
      "Group projects and presentations",
      "Self and peer assessment",
      "Portfolio assessment",
    ];

    assessments.forEach((assessment) => {
      doc.text("• " + assessment, 25, yPos);
      yPos += 6;
    });
    yPos += 10;

    // CBC Competencies
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("CBC COMPETENCIES DEVELOPED:", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const competencies = [
      "Critical thinking and problem solving",
      "Communication and collaboration",
      "Creativity and imagination",
      "Digital literacy",
      "Learning to learn",
      "Citizenship",
    ];

    competencies.forEach((comp) => {
      doc.text("• " + comp, 25, yPos);
      yPos += 6;
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `© 2025 ChezaAI - ShuleAI Platform | CBC Lesson Plans | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: "center" },
      );
    }

    // Save PDF
    doc.save(`CBC_${subjectName}_Lesson_Plans.pdf`);

    setTimeout(() => {
      showQuickNotification(`✅ ${subjectName} lesson plans downloaded!`);
    }, 800);
  } catch (error) {
    console.error("PDF generation error:", error);
    showQuickNotification("⚠️ Error generating PDF. Please try again.");
  }
}

// Helper function for lesson outcomes
function getLessonOutcomes(subject) {
  const outcomes = {
    mathematics: [
      "Apply mathematical concepts to solve real-world problems",
      "Demonstrate understanding of number operations and relationships",
      "Use mathematical reasoning and logical thinking",
      "Represent mathematical ideas using various models",
      "Communicate mathematical thinking clearly",
    ],
    english: [
      "Read and comprehend various text types with understanding",
      "Write clearly and coherently for different purposes",
      "Speak confidently and listen actively in various contexts",
      "Apply grammar and language conventions correctly",
      "Develop vocabulary and language appreciation",
    ],
    science: [
      "Conduct scientific investigations and experiments",
      "Observe, record and analyze scientific phenomena",
      "Apply scientific knowledge to everyday situations",
      "Develop scientific inquiry and critical thinking skills",
      "Understand the relationship between science and society",
    ],
    social: [
      "Understand Kenyan history, geography and culture",
      "Demonstrate responsible citizenship and civic awareness",
      "Analyze social, economic and political systems",
      "Appreciate cultural diversity and heritage",
      "Apply social studies concepts to current issues",
    ],
  };
  return outcomes[subject] || outcomes.mathematics;
}

// Helper function for weekly lessons
function getWeeklyLessons(subject) {
  const lessons = {
    mathematics: [
      {
        topic: "Number Sense and Place Value",
        outcomes: "Understand place value up to millions",
        activities:
          "Hands-on activities with base-10 blocks, number line exercises",
        assessment: "Written quiz on place value",
      },
      {
        topic: "Addition and Subtraction",
        outcomes: "Add and subtract multi-digit numbers",
        activities: "Word problems, mental math games, group challenges",
        assessment: "Problem-solving tasks",
      },
      {
        topic: "Multiplication Strategies",
        outcomes: "Apply multiplication facts and strategies",
        activities: "Arrays, skip counting, times table practice",
        assessment: "Multiplication test",
      },
      {
        topic: "Division Concepts",
        outcomes: "Understand division as sharing and grouping",
        activities: "Manipulative activities, real-life division problems",
        assessment: "Practical demonstration",
      },
      {
        topic: "Fractions Introduction",
        outcomes: "Identify and represent fractions",
        activities: "Fraction circles, pizza models, drawing exercises",
        assessment: "Fraction identification task",
      },
    ],
    english: [
      {
        topic: "Reading Comprehension Skills",
        outcomes: "Read and understand various texts",
        activities: "Guided reading, comprehension questions, discussions",
        assessment: "Reading comprehension test",
      },
      {
        topic: "Writing Techniques",
        outcomes: "Write coherent paragraphs and essays",
        activities: "Brainstorming, drafting, peer review, editing",
        assessment: "Written composition",
      },
      {
        topic: "Grammar and Punctuation",
        outcomes: "Apply grammar rules correctly",
        activities:
          "Grammar exercises, sentence construction, editing practice",
        assessment: "Grammar quiz",
      },
      {
        topic: "Vocabulary Development",
        outcomes: "Expand vocabulary and word usage",
        activities: "Word games, context clues, dictionary skills",
        assessment: "Vocabulary test",
      },
      {
        topic: "Speaking and Listening",
        outcomes: "Communicate effectively orally",
        activities: "Presentations, debates, role plays, listening exercises",
        assessment: "Oral presentation",
      },
    ],
    science: [
      {
        topic: "Scientific Method",
        outcomes: "Understand and apply scientific inquiry",
        activities: "Simple experiments, observation tasks, hypothesis testing",
        assessment: "Lab report",
      },
      {
        topic: "Living Things and Habitats",
        outcomes: "Classify living things and their environments",
        activities: "Nature walk, classification activities, habitat models",
        assessment: "Classification project",
      },
      {
        topic: "Matter and Materials",
        outcomes: "Identify properties of different materials",
        activities: "Material testing, sorting activities, experiments",
        assessment: "Practical investigation",
      },
      {
        topic: "Energy and Forces",
        outcomes: "Understand basic concepts of energy",
        activities: "Force demonstrations, energy transformations, experiments",
        assessment: "Concept map",
      },
      {
        topic: "Earth and Space",
        outcomes: "Describe Earth systems and celestial bodies",
        activities: "Models, research projects, observations",
        assessment: "Presentation",
      },
    ],
    social: [
      {
        topic: "Kenyan Geography",
        outcomes: "Identify physical features of Kenya",
        activities: "Map work, field trips, research projects",
        assessment: "Map skills test",
      },
      {
        topic: "Historical Events",
        outcomes: "Understand key events in Kenyan history",
        activities: "Timeline creation, storytelling, research",
        assessment: "Historical essay",
      },
      {
        topic: "Government and Citizenship",
        outcomes: "Explain government structure and civic duties",
        activities: "Mock elections, debates, community projects",
        assessment: "Citizenship project",
      },
      {
        topic: "Economic Activities",
        outcomes: "Describe various economic activities",
        activities: "Case studies, field visits, group discussions",
        assessment: "Research presentation",
      },
      {
        topic: "Cultural Heritage",
        outcomes: "Appreciate Kenyan cultural diversity",
        activities: "Cultural presentations, artifact studies, discussions",
        assessment: "Cultural project",
      },
    ],
  };
  return lessons[subject] || lessons.mathematics;
}

function downloadAssessment(type) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to download assessment tools");
    return;
  }

  const assessmentNames = {
    rubrics: "CBC Assessment Rubrics",
    checklists: "Observation Checklists",
    reports: "Progress Report Templates",
    formative: "Formative Assessment Tools",
  };

  const assessmentName = assessmentNames[type] || type;
  showQuickNotification(`📥 Generating ${assessmentName} PDF...`);

  try {
    if (typeof window.jspdf === "undefined") {
      throw new Error("PDF library not loaded");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(46, 125, 74);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text(assessmentName, 105, 22, { align: "center" });

    doc.setTextColor(0, 0, 0);
    let yPos = 50;

    // Overview
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("ASSESSMENT FRAMEWORK", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      "This tool aligns with CBC competency-based assessment principles.",
      20,
      yPos,
    );
    yPos += 6;
    doc.text(
      "Designed for holistic evaluation of learner progress and achievement.",
      20,
      yPos,
    );
    yPos += 12;

    // Type-specific content
    if (type === "rubrics") {
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("CBC COMPETENCY ASSESSMENT LEVELS:", 20, yPos);
      yPos += 10;

      const levels = [
        {
          level: "Exceeding Expectations (EE)",
          desc: "Learner demonstrates exceptional mastery and can apply skills independently in new contexts. Shows creativity and innovation.",
        },
        {
          level: "Meeting Expectations (ME)",
          desc: "Learner meets all learning outcomes consistently. Demonstrates good understanding and application of concepts.",
        },
        {
          level: "Approaching Expectations (AE)",
          desc: "Learner shows progress toward outcomes. Requires minimal support to achieve expected competencies.",
        },
        {
          level: "Below Expectations (BE)",
          desc: "Learner needs significant support. Requires additional instruction and practice to meet learning outcomes.",
        },
      ];

      levels.forEach((l) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, "bold");
        doc.setFontSize(11);
        doc.text(l.level, 20, yPos);
        yPos += 6;
        doc.setFont(undefined, "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(l.desc, 170);
        lines.forEach((line) => {
          doc.text(line, 25, yPos);
          yPos += 5;
        });
        yPos += 6;
      });

      yPos += 5;
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("ASSESSMENT CRITERIA:", 20, yPos);
      yPos += 8;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);

      const criteria = [
        "Knowledge and Understanding",
        "Skills Application",
        "Critical Thinking",
        "Communication",
        "Collaboration",
        "Values and Attitudes",
      ];

      criteria.forEach((c) => {
        doc.text("• " + c, 25, yPos);
        yPos += 6;
      });
    } else if (type === "checklists") {
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("OBSERVATION CHECKLIST TEMPLATE:", 20, yPos);
      yPos += 10;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text("Student Name: _____________________________", 20, yPos);
      yPos += 8;
      doc.text("Grade Level: ___________  Date: ___________", 20, yPos);
      yPos += 8;
      doc.text("Subject/Activity: _________________________", 20, yPos);
      yPos += 12;

      doc.setFont(undefined, "bold");
      doc.text("COMPETENCIES TO OBSERVE:", 20, yPos);
      yPos += 8;

      const observations = [
        "Participates actively in class activities",
        "Demonstrates understanding of concepts",
        "Works collaboratively with peers",
        "Completes tasks independently",
        "Shows creativity in problem-solving",
        "Communicates ideas clearly",
        "Respects others and classroom rules",
        "Shows persistence when facing challenges",
      ];

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      observations.forEach((obs) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.text("☐ " + obs, 25, yPos);
        yPos += 7;
      });

      yPos += 5;
      doc.text("Additional Notes:", 20, yPos);
      yPos += 6;
      doc.text("________________________________________________", 20, yPos);
      yPos += 6;
      doc.text("________________________________________________", 20, yPos);
    } else if (type === "reports") {
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("PROGRESS REPORT TEMPLATE:", 20, yPos);
      yPos += 10;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text("Student Name: _____________________________", 20, yPos);
      yPos += 7;
      doc.text("Grade: ___________  Term: _____  Year: _____", 20, yPos);
      yPos += 12;

      doc.setFont(undefined, "bold");
      doc.text("SUBJECT PERFORMANCE:", 20, yPos);
      yPos += 8;

      const subjects = [
        "Mathematics",
        "English",
        "Kiswahili",
        "Science",
        "Social Studies",
      ];
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);

      subjects.forEach((subj) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, "bold");
        doc.text(subj + ": ___", 20, yPos);
        doc.setFont(undefined, "normal");
        yPos += 5;
        doc.text("Comments: _______________________________", 25, yPos);
        yPos += 10;
      });

      yPos += 5;
      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.text("TEACHER COMMENTS:", 20, yPos);
      yPos += 7;
      doc.setFont(undefined, "normal");
      doc.text("______________________________________________", 20, yPos);
      yPos += 6;
      doc.text("______________________________________________", 20, yPos);
    } else if (type === "formative") {
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("FORMATIVE ASSESSMENT STRATEGIES:", 20, yPos);
      yPos += 10;

      const strategies = [
        {
          name: "Think-Pair-Share",
          desc: "Students think individually, discuss with partner, share with class",
        },
        {
          name: "Exit Tickets",
          desc: "Quick assessment at end of lesson to gauge understanding",
        },
        {
          name: "Questioning Techniques",
          desc: "Use open-ended questions to assess comprehension",
        },
        {
          name: "Self-Assessment",
          desc: "Students reflect on their own learning progress",
        },
        {
          name: "Peer Assessment",
          desc: "Students provide feedback to each other",
        },
        {
          name: "Observations",
          desc: "Teacher observes students during activities",
        },
      ];

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      strategies.forEach((strategy) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, "bold");
        doc.text("• " + strategy.name, 25, yPos);
        yPos += 5;
        doc.setFont(undefined, "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(strategy.desc, 165);
        lines.forEach((line) => {
          doc.text(line, 30, yPos);
          yPos += 4;
        });
        yPos += 6;
        doc.setFontSize(10);
      });
    }

    // CBC Competencies footer section
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 10;
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("CBC CORE COMPETENCIES:", 20, yPos);
    yPos += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const competencies = [
      "Communication and collaboration",
      "Critical thinking and problem solving",
      "Creativity and imagination",
      "Citizenship and values",
      "Digital literacy",
      "Learning to learn",
      "Self-efficacy",
    ];

    competencies.forEach((comp) => {
      doc.text("• " + comp, 25, yPos);
      yPos += 5;
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `© 2025 ChezaAI - ShuleAI Platform | ${assessmentName} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: "center" },
      );
    }

    // Save PDF
    doc.save(`CBC_${type}_Assessment.pdf`);

    setTimeout(() => {
      showQuickNotification(`✅ ${assessmentName} downloaded!`);
    }, 1000);
  } catch (error) {
    console.error("PDF generation error:", error);
    showQuickNotification("⚠️ Error generating PDF. Please try again.");
  }
}

function startTraining(courseType) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access training courses");
    return;
  }

  const courseNames = {
    "game-based": "Game-Based Learning Training",
    cbc: "CBC Implementation Training",
    digital: "Digital Literacy Training",
  };

  showQuickNotification(`🎓 Loading ${courseNames[courseType]}...`);
}

function accessResource(resourceType) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access teaching resources");
    return;
  }

  const resourceNames = {
    "classroom-management": "Classroom Management Tools",
    "visual-aids": "Visual Aids & Charts",
    timetables: "Timetable Templates",
    "schemes-work": "Schemes of Work",
    "parent-communication": "Parent Communication Templates",
    "record-keeping": "Record Keeping Tools",
  };

  showQuickNotification(`🛠️ Loading ${resourceNames[resourceType]}...`);
}

function joinCommunity(platform) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to join teacher community");
    return;
  }

  showQuickNotification(`💬 Connecting to community...`);
}

// Parents Hub Functions
function viewParentGuide(guideType) {
  const guideNames = {
    "cbc-overview": "CBC Parent Guide",
    assessment: "Assessment Explained",
    milestones: "Grade Level Milestones",
  };

  showQuickNotification(`📥 Downloading ${guideNames[guideType]}...`);
}

function viewDetailedProgress() {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to view progress reports");
    return;
  }

  showQuickNotification("📊 Loading progress reports...");
}

function viewHomeActivities(activityType) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access home activities");
    return;
  }

  showQuickNotification(`🏠 Loading activities...`);
}

function viewParentingTips(tipCategory) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access parenting tips");
    return;
  }

  showQuickNotification(`💡 Loading tips...`);
}

function joinParentCommunity(platform) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to join parent community");
    return;
  }

  showQuickNotification(`👥 Connecting to community...`);
}

function toggleFAQ(faqId) {
  const faqAnswer = document.getElementById(faqId);
  const allFAQs = document.querySelectorAll('[id^="faq"]');

  allFAQs.forEach((faq) => {
    if (faq.id !== faqId && faq.style.display === "block") {
      faq.style.display = "none";
      const parentDiv = faq.parentElement;
      const icon = parentDiv.querySelector("span");
      if (icon) icon.textContent = "+";
    }
  });

  if (faqAnswer.style.display === "none" || !faqAnswer.style.display) {
    faqAnswer.style.display = "block";
    const parentDiv = faqAnswer.parentElement;
    const icon = parentDiv.querySelector("span");
    if (icon) icon.textContent = "−";
  } else {
    faqAnswer.style.display = "none";
    const parentDiv = faqAnswer.parentElement;
    const icon = parentDiv.querySelector("span");
    if (icon) icon.textContent = "+";
  }
}

// Grade Levels & Subjects Functions
function exploreGrade(gradeLevel) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access grade resources");
    return;
  }

  showQuickNotification(`📚 Loading ${gradeLevel} resources...`);
}

function exploreSubject(subjectName) {
  if (!currentUser || currentUser.daysRemaining <= 0) {
    openPaymentModal();
    showQuickNotification("⚠️ Subscribe to access subject resources");
    return;
  }

  showQuickNotification(`📚 Loading ${subjectName} resources...`);
}

// Toggle Games Function - Show/Hide additional games
console.log("📝 About to define toggleGames function...");
function toggleGames(category) {
  console.log("🎮 toggleGames called with category:", category);

  try {
    const hiddenGames = document.querySelectorAll(
      `.hidden-games[data-category="${category}"]`,
    );
    const button = document.querySelector(
      `button[onclick="toggleGames('${category}')"]`,
    );

    if (!button) {
      console.error("❌ Button not found for category:", category);
      return;
    }

    const arrow = button.querySelector(".see-all-arrow");
    const text = button.querySelector(".see-all-text");

    if (!arrow || !text) {
      console.error("❌ Arrow or text element not found in button");
      return;
    }

    let isExpanded = false;

    // Check if games are currently visible
    if (hiddenGames.length > 0) {
      const firstGame = hiddenGames[0];
      isExpanded =
        firstGame.style.display !== "none" &&
        getComputedStyle(firstGame).display !== "none";
    }

    if (isExpanded) {
      // Hide games
      hiddenGames.forEach((game) => {
        game.style.display = "none";
      });
      arrow.textContent = "▼";
      button.classList.remove("expanded");

      // Update button text based on category
      if (category === "math") {
        text.textContent = "See All Mathematics Games";
      } else if (category === "english") {
        text.textContent = "See All English Games";
      } else if (category === "science") {
        text.textContent = "See All Science Games";
      }
    } else {
      // Show games
      hiddenGames.forEach((game) => {
        game.style.display = "block";
      });
      arrow.textContent = "▲";
      button.classList.add("expanded");

      // Update button text based on category
      if (category === "math") {
        text.textContent = "Show Less Mathematics Games";
      } else if (category === "english") {
        text.textContent = "Show Less English Games";
      } else if (category === "science") {
        text.textContent = "Show Less Science Games";
      }
    }
  } catch (error) {
    console.error("❌ Error in toggleGames:", error);
    alert("An error occurred. Please refresh the page and try again.");
  }
}

// Ensure function is available globally
window.toggleGames = toggleGames;

// Additional safety check
document.addEventListener("DOMContentLoaded", function () {
  console.log(
    "✅ DOM loaded, toggleGames available:",
    typeof window.toggleGames !== "undefined",
  );
});

// Admin Access Information
// ADMIN CODE: SHULEAI-ADMIN-2025
// EMAIL: shuleaiadmin@memeyai.com
// EXPIRY: Never expires (permanent admin access)
// This code grants unlimited access to all platform features

console.log(`
╔════════════════════════════════════════╗
║          ADMIN ACCESS CONFIGURED       ║
╠════════════════════════════════════════╣
║ Admin Email: shuleaiadmin@memeyai.com ║
║ Admin Code: SHULEAI-ADMIN-2025        ║
║ Expiry: NEVER (permanent)              ║
║ Access Level: UNLIMITED                ║
╚════════════════════════════════════════╝
`);

// End of file - confirm everything loaded
console.log("✅ auth-shared.js loaded completely!");
console.log("📋 Functions defined:", {
  toggleGames: typeof toggleGames !== "undefined",
  showQuickNotification: typeof showQuickNotification !== "undefined",
  openSignInModal: typeof openSignInModal !== "undefined",
  handleSpecialCode: typeof handleSpecialCode !== "undefined",
});
