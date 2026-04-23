const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MIN_DONATION_GAP_DAYS = 90;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calculateEligibility(donor) {
  const age = Number(donor.age || 0);
  const weight = Number(donor.weight || 0);
  const hasHealthRisk = Boolean(donor.health_conditions);

  if (age < 18 || age > 60) {
    return {
      eligible: false,
      reason: "Age must be between 18 and 60 years.",
      waitDays: null,
      nextEligibleDate: null
    };
  }

  if (weight < 50) {
    return {
      eligible: false,
      reason: "Weight must be at least 50 kg.",
      waitDays: null,
      nextEligibleDate: null
    };
  }

  if (hasHealthRisk) {
    return {
      eligible: false,
      reason: "Medical history needs admin review before donation.",
      waitDays: null,
      nextEligibleDate: null
    };
  }

  if (!donor.last_donation_date) {
    return {
      eligible: true,
      reason: "You can donate now.",
      waitDays: 0,
      nextEligibleDate: new Date().toISOString().slice(0, 10)
    };
  }

  const lastDonation = new Date(donor.last_donation_date);
  const nextEligibleDate = addDays(lastDonation, MIN_DONATION_GAP_DAYS);
  const diffDays = Math.ceil((nextEligibleDate - new Date()) / DAY_IN_MS);

  if (diffDays > 0) {
    return {
      eligible: false,
      reason: `Wait ${diffDays} more day(s) before donating again.`,
      waitDays: diffDays,
      nextEligibleDate: nextEligibleDate.toISOString().slice(0, 10)
    };
  }

  return {
    eligible: true,
    reason: "You can donate now.",
    waitDays: 0,
    nextEligibleDate: nextEligibleDate.toISOString().slice(0, 10)
  };
}

module.exports = {
  MIN_DONATION_GAP_DAYS,
  calculateEligibility
};
