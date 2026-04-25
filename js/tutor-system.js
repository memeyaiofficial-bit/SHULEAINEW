// Tutor System Frontend API Integration
// Production-ready JavaScript for ShuleAI Tutor System

const API_BASE = "https://shuleaibackend-rpe3.onrender.com/api"; // Update this to your backend URL

// Plus Modal Management
let currentUserRole = null;
let currentTutorData = null;

function openPlusModal() {
  const modal = document.getElementById("plusModal");
  modal.classList.add("show");
  showRoleSelection();
}

function closePlusModal() {
  const modal = document.getElementById("plusModal");
  modal.classList.remove("show");
  resetPlusModal();
}

function resetPlusModal() {
  // Hide all steps
  document.getElementById("roleSelectionStep").style.display = "none";
  document.getElementById("tutorRegistrationStep").style.display = "none";
  document.getElementById("studentRequestStep").style.display = "none";
  document.getElementById("successStep").style.display = "none";

  // Reset forms
  document.getElementById("tutorRegistrationForm").reset();
  document.getElementById("studentRequestForm").reset();

  // Clear errors
  clearFormErrors();

  currentUserRole = null;
}

function showRoleSelection() {
  resetPlusModal();
  document.getElementById("roleSelectionStep").style.display = "block";
}

function selectRole(role) {
  currentUserRole = role;

  if (role === "tutor") {
    document.getElementById("roleSelectionStep").style.display = "none";
    document.getElementById("tutorRegistrationStep").style.display = "block";
  } else if (role === "student") {
    document.getElementById("roleSelectionStep").style.display = "none";
    document.getElementById("studentRequestStep").style.display = "block";
  }
}

function backToRoleSelection() {
  showRoleSelection();
}

// Form Validation Functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^(\+254|0)?[17]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ""));
}

function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + "Error");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

function clearError(fieldId) {
  const errorElement = document.getElementById(fieldId + "Error");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
}

function clearFormErrors() {
  const errorElements = document.querySelectorAll(".form-error");
  errorElements.forEach((element) => {
    element.textContent = "";
    element.style.display = "none";
  });
}

// API Functions
async function submitTutorRegistration() {
  const btn = document.getElementById("tutorSubmitBtn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoading = btn.querySelector(".btn-loading");

  // Show loading state
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  btn.disabled = true;

  try {
    // Collect form data
    const formData = new FormData(
      document.getElementById("tutorRegistrationForm"),
    );
    const tutorData = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      location: formData.get("location"),
      bio: formData.get("bio"),
      rate: parseInt(formData.get("rate")),
      subjects: Array.from(
        document.querySelectorAll('input[name="subjects"]:checked'),
      ).map((cb) => cb.value),
      grades: Array.from(
        document.querySelectorAll('input[name="grades"]:checked'),
      ).map((cb) => cb.value),
      availability: Array.from(
        document.querySelectorAll('input[name="availability"]:checked'),
      ).map((cb) => cb.value),
    };

    // Send to backend API
    const response = await fetch(`${API_BASE}/tutors/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tutorData),
    });

    const data = await response.json();

    if (data.success) {
      currentTutorData = data.tutor;

      // Store tutor email for dashboard access
      localStorage.setItem("tutorEmail", data.tutor.email);
      localStorage.setItem(
        "shuleai_current_user",
        JSON.stringify({
          type: "tutor",
          email: data.tutor.email,
          data: data.tutor,
        }),
      );

      showSuccess(
        "Tutor Registration Complete!",
        "Your tutor profile has been created successfully. Students can now find and request sessions with you. Check your email for confirmation.",
        true,
      );

      // Update plus button to show dashboard
      updatePlusButtonForTutor();
    } else {
      throw new Error(data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Registration failed: " + error.message);
  } finally {
    // Reset button state
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    btn.disabled = false;
  }
}

async function submitStudentRequest() {
  const btn = document.getElementById("studentSubmitBtn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoading = btn.querySelector(".btn-loading");

  // Show loading state
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  btn.disabled = true;

  try {
    // Collect form data
    const formData = new FormData(
      document.getElementById("studentRequestForm"),
    );
    const requestData = {
      studentName: formData.get("name"),
      parentName: formData.get("parentName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      grade: formData.get("grade"),
      subjects: Array.from(
        document.querySelectorAll(
          '#studentRequestStep input[name="subjects"]:checked',
        ),
      ).map((cb) => cb.value),
      goals: formData.get("goals"),
      times: Array.from(
        document.querySelectorAll('input[name="times"]:checked'),
      ).map((cb) => cb.value),
      frequency: formData.get("frequency"),
      budget: formData.get("budget"),
    };

    // Send to backend API
    const response = await fetch(`${API_BASE}/tutors/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(
        "Request Submitted Successfully!",
        `We've received your tutor request for ${requestData.studentName}. ${data.request.matchingTutors} qualified tutors have been notified and will contact you within 24 hours. Check your email for confirmation.`,
        false,
      );
    } else {
      throw new Error(data.message || "Request submission failed");
    }
  } catch (error) {
    console.error("Request submission error:", error);
    alert("Request submission failed: " + error.message);
  } finally {
    // Reset button state
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    btn.disabled = false;
  }
}

function showSuccess(title, message, showDashboard) {
  document.getElementById("tutorRegistrationStep").style.display = "none";
  document.getElementById("studentRequestStep").style.display = "none";
  document.getElementById("successStep").style.display = "block";

  document.getElementById("successTitle").textContent = title;
  document.getElementById("successMessage").textContent = message;

  if (showDashboard) {
    document.getElementById("dashboardBtn").style.display = "inline-block";
  } else {
    document.getElementById("dashboardBtn").style.display = "none";
  }
}

// Tutor Dashboard Functions
function openTutorDashboard() {
  const tutorEmail = localStorage.getItem("tutorEmail");
  if (tutorEmail) {
    // Open dashboard in new tab/window or navigate
    window.open(
      `tutor-dashboard.html?email=${encodeURIComponent(tutorEmail)}`,
      "_blank",
    );
  } else {
    alert("Please register or sign in as a tutor first");
  }
}

function updatePlusButtonForTutor() {
  const plusButton = document.getElementById("plusButton");
  if (plusButton) {
    plusButton.innerHTML =
      '<span class="plus-icon">👤</span><span class="plus-text">Dashboard</span>';
    plusButton.onclick = openTutorDashboard;
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded - tutor-system.js initializing...");

  // Check for existing tutor session
  const currentUser = JSON.parse(
    localStorage.getItem("shuleai_current_user") || "{}",
  );
  if (currentUser.type === "tutor" && currentUser.email) {
    currentTutorData = currentUser.data;
    updatePlusButtonForTutor();
  }

  // Setup form event listeners
  console.log("Calling setupFormEventListeners...");
  setupFormEventListeners();
  console.log("Setup complete!");
});

// Setup form event listeners
function setupFormEventListeners() {
  console.log("Setting up form event listeners...");

  // Tutor Registration Form
  const tutorForm = document.getElementById("tutorRegistrationForm");
  console.log("Tutor form found:", tutorForm);

  if (tutorForm) {
    console.log("Adding submit event listener to tutor form");
    tutorForm.addEventListener("submit", function (e) {
      console.log("Tutor form submit event triggered!");
      e.preventDefault();

      clearFormErrors();
      if (validateTutorForm()) {
        console.log("Form validation passed, submitting...");
        submitTutorRegistration();
      } else {
        console.log("Form validation failed");
      }
    });
  } else {
    console.log("Tutor form not found!");
  }

  // Student Request Form
  const studentForm = document.getElementById("studentRequestForm");
  if (studentForm) {
    studentForm.addEventListener("submit", function (e) {
      e.preventDefault();

      clearFormErrors();
      if (validateStudentForm()) {
        submitStudentRequest();
      }
    });
  }
}

// Form validation functions
function validateTutorForm() {
  console.log("Validating tutor form...");
  let isValid = true;

  // Validate required fields
  const name = document.getElementById("tutorName").value.trim();
  const email = document.getElementById("tutorEmail").value.trim();
  const phone = document.getElementById("tutorPhone").value.trim();
  const location = document.getElementById("tutorLocation").value.trim();
  const bio = document.getElementById("tutorBio").value.trim();
  const rate = document.getElementById("tutorRate").value.trim();

  console.log("Form values:", { name, email, phone, location, bio, rate });

  if (!name) {
    showError("tutorName", "Name is required");
    isValid = false;
  }

  if (!email) {
    showError("tutorEmail", "Email is required");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("tutorEmail", "Please enter a valid email address");
    isValid = false;
  }

  if (!phone) {
    showError("tutorPhone", "Phone number is required");
    isValid = false;
  } else if (!validatePhone(phone)) {
    showError("tutorPhone", "Please enter a valid Kenyan phone number");
    isValid = false;
  }

  if (!location) {
    showError("tutorLocation", "Location is required");
    isValid = false;
  }

  if (!bio) {
    showError("tutorBio", "Bio is required");
    isValid = false;
  } else if (bio.length < 100) {
    showError(
      "tutorBio",
      "Please provide a more detailed bio (at least 100 characters)",
    );
    isValid = false;
  }

  // Validate subjects
  const subjects = document.querySelectorAll('input[name="subjects"]:checked');
  if (subjects.length === 0) {
    showError("tutorSubjects", "Please select at least one subject");
    isValid = false;
  }

  // Validate grades
  const grades = document.querySelectorAll('input[name="grades"]:checked');
  if (grades.length === 0) {
    showError("tutorGrades", "Please select at least one grade level");
    isValid = false;
  }

  // Validate availability
  const availability = document.querySelectorAll(
    'input[name="availability"]:checked',
  );
  if (availability.length === 0) {
    showError("tutorAvailability", "Please select your availability");
    isValid = false;
  }

  if (!rate) {
    showError("tutorRate", "Hourly rate is required");
    isValid = false;
  } else if (rate < 100 || rate > 5000) {
    showError("tutorRate", "Please enter a reasonable rate (KES 100-5000)");
    isValid = false;
  }

  // Validate terms
  if (!document.getElementById("tutorTerms").checked) {
    showError("tutorTerms", "Please agree to the terms and conditions");
    isValid = false;
  }

  console.log("Validation result:", isValid);
  return isValid;
}

function validateStudentForm() {
  let isValid = true;

  // Validate required fields
  const studentName = document.getElementById("studentName").value.trim();
  const parentName = document.getElementById("parentName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const grade = document.getElementById("studentGrade").value;
  const goals = document.getElementById("learningGoals").value.trim();
  const frequency = document.getElementById("sessionFrequency").value;
  const budget = document.getElementById("budget").value;

  if (!studentName) {
    showError("studentName", "Student name is required");
    isValid = false;
  }

  if (!parentName) {
    showError("parentName", "Parent/Guardian name is required");
    isValid = false;
  }

  if (!email) {
    showError("contactEmail", "Email is required");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("contactEmail", "Please enter a valid email address");
    isValid = false;
  }

  if (!phone) {
    showError("contactPhone", "Phone number is required");
    isValid = false;
  } else if (!validatePhone(phone)) {
    showError("contactPhone", "Please enter a valid Kenyan phone number");
    isValid = false;
  }

  if (!grade) {
    showError("studentGrade", "Please select a grade level");
    isValid = false;
  }

  // Validate subjects
  const subjects = document.querySelectorAll(
    '#studentRequestStep input[name="subjects"]:checked',
  );
  if (subjects.length === 0) {
    showError("requestedSubjects", "Please select at least one subject");
    isValid = false;
  }

  if (!goals) {
    showError("learningGoals", "Learning goals are required");
    isValid = false;
  } else if (goals.length < 50) {
    showError(
      "learningGoals",
      "Please provide more detailed learning goals (at least 50 characters)",
    );
    isValid = false;
  }

  // Validate times
  const times = document.querySelectorAll('input[name="times"]:checked');
  if (times.length === 0) {
    showError("preferredTimes", "Please select preferred session times");
    isValid = false;
  }

  if (!frequency) {
    showError("sessionFrequency", "Please select session frequency");
    isValid = false;
  }

  if (!budget) {
    showError("budget", "Please select a budget range");
    isValid = false;
  }

  return isValid;
}

// Utility Functions
function showTerms() {
  alert(
    "Terms and Conditions: By registering as a tutor, you agree to provide quality educational services, maintain professional conduct, and comply with ShuleAI policies.",
  );
}

function showPrivacy() {
  alert(
    "Privacy Policy: Your personal information will be used solely for matching with students and communication purposes. We do not share your data with third parties without consent.",
  );
}

// Close modals when clicking outside
window.addEventListener("click", function (event) {
  if (event.target === document.getElementById("plusModal")) {
    closePlusModal();
  }
});
