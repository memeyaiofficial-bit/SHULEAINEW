module.exports = {
  TILL_NUMBER: "889900",
  SUPPORT_WHATSAPP: "+254111579473",
  ADMIN_EMAIL: "support@shuleai.com",
  SUPPORT_EMAIL: "support@shuleai.com",

  SUBSCRIPTION_PLANS: {
    test: {
      amount: 5,
      days: 1,
      name: "Test Plan (5 KES)",
    },
    weekly: {
      amount: 200,
      days: 7,
      name: "Weekly Access",
    },
    monthly: {
      amount: 600,
      days: 30,
      name: "Monthly Access",
    },
    termly: {
      amount: 1650,
      days: 90, // Approximately 3 calendar months
      months: 3, // Exact: 3 calendar months from purchase date
      name: "Termly Access - 3 Months",
    },
  },

  PAYMENT_STATUS: {
    PENDING: "pending",
    VERIFIED: "verified",
    ACTIVE: "active",
    EXPIRED: "expired",
    REJECTED: "rejected",
  },

  COLLECTIONS: {
    USER_PAYMENTS: "user_payments",
    USERS: "users",
    SESSIONS: "sessions",
  },
};
