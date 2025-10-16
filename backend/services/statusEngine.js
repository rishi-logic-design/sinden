const STATES = {
  Pending: "Pending",
  InProgress: "InProgress",
  Executed: "Executed",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Delivered: "Delivered",
  PendingPayment: "PendingPayment",
  Paid: "Paid",
};

const TRANSITIONS = {
  Receptionist: {
    Pending: [STATES.Cancelled],
  },
  Operator: {
    Pending: [STATES.InProgress, STATES.Cancelled],
    InProgress: [STATES.Executed, STATES.Cancelled],
    Executed: [STATES.Completed, STATES.Cancelled],
    Completed: [STATES.Delivered, STATES.PendingPayment],
  },
  Admin: {
    Pending: [STATES.InProgress, STATES.Cancelled],
    InProgress: [STATES.Executed, STATES.Cancelled],
    Executed: [STATES.Completed, STATES.Cancelled],
    Completed: [STATES.Delivered, STATES.PendingPayment],
    Delivered: [STATES.PendingPayment, STATES.Paid],
    PendingPayment: [STATES.Paid],
  },
};

function isValidState(s) {
  return Object.values(STATES).includes(s);
}

function canTransition(role = "Admin", from, to) {
  if (!isValidState(from) || !isValidState(to)) return false;
  const roleRules = TRANSITIONS[role] || {};
  const allowed = roleRules[from] || [];
  return allowed.includes(to);
}

function allowedNextStates(role = "Admin", from) {
  const roleRules = TRANSITIONS[role] || {}; 
  return roleRules[from] || []; 
}

module.exports = {
  STATES,
  TRANSITIONS,
  canTransition,
  allowedNextStates,
  isValidState,
};