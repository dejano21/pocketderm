// Simulated analysis engine — generates randomized but realistic-looking results
// based on simple image properties (brightness, size). No real ML involved.

const classifications = [
  { key: "common", status: "Low Risk", weight: 50 },
  { key: "common", status: "Low Risk", weight: 20 },
  { key: "atypical", status: "Needs Review", weight: 15 },
  { key: "blue", status: "Low Risk", weight: 8 },
  { key: "congenital", status: "Low Risk", weight: 5 },
  { key: "suspicious", status: "High Priority Review Recommended", weight: 2 },
];

function weightedRandom(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

function randomInRange(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

const explanations = {
  common: "The analyzed region shows a symmetrical shape with uniform coloring and well-defined borders. These characteristics are generally associated with benign skin lesions.",
  atypical: "The analyzed region shows some asymmetry and slight color variation. While not necessarily dangerous, atypical moles should be monitored regularly for changes.",
  blue: "The analyzed region shows blue-gray coloring consistent with deeper melanin deposits. Blue nevi are typically benign but should be monitored.",
  congenital: "The analyzed region appears consistent with a congenital nevus. These moles are present from birth and vary in size. Regular monitoring is recommended.",
  suspicious: "The analyzed region shows irregular borders, asymmetric shape, and/or mixed coloring. Professional clinical evaluation is strongly recommended.",
};

export function runMockAnalysis() {
  return new Promise((resolve) => {
    // Simulate processing time (1.5–3s)
    const delay = 1500 + Math.random() * 1500;

    setTimeout(() => {
      const pick = weightedRandom(classifications);
      const diameterMm = pick.key === "suspicious"
        ? randomInRange(6.0, 12.0)
        : randomInRange(2.5, 7.0);
      const areaMm2 = parseFloat((Math.PI * (diameterMm / 2) ** 2).toFixed(1));
      const confidence = pick.key === "suspicious"
        ? randomInRange(55, 72, 0)
        : pick.key === "atypical"
          ? randomInRange(68, 82, 0)
          : randomInRange(85, 97, 0);

      resolve({
        classification: pick.status,
        clinicalType: pick.key,
        confidence: Math.round(confidence),
        diameterMm,
        areaMm2,
        explanation: explanations[pick.key],
        recommendations: [
          "Continue monitoring this mole monthly",
          "Take follow-up images under similar lighting conditions",
          pick.key === "suspicious"
            ? "Schedule an appointment with your dermatologist as soon as possible"
            : "Consult a dermatologist if you notice changes in size, shape, or color",
        ],
        timestamp: new Date().toISOString(),
      });
    }, delay);
  });
}
