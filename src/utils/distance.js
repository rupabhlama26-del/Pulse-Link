function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function recommendationScore(donor, distanceKm) {
  const availabilityScore = donor.is_available ? 45 : 0;
  const eligibilityScore = donor.eligibility_status === "Eligible" ? 25 : 0;
  const distanceScore = Math.max(0, 20 - distanceKm * 2);
  const reliabilityScore = Math.min(Number(donor.completed_donations || 0) * 2, 10);
  return Number((availabilityScore + eligibilityScore + distanceScore + reliabilityScore).toFixed(2));
}

module.exports = {
  haversineKm,
  recommendationScore
};
