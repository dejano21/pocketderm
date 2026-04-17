export const userProfile = {
  name: "Alex Morgan",
  email: "alex.morgan@email.com",
  age: 34,
  skinType: "Type II - Fair",
  dermatologist: {
    name: "Dr. Sarah Chen",
    clinic: "Bay Area Dermatology",
    connected: true,
    lastVisit: "2026-02-15",
  },
};

export const dashboardStats = {
  totalMoles: 5,
  recentScanStatus: "Low Risk",
  lastScanDate: "2026-04-10",
  dermatologistConnected: true,
  nextCheckup: "2026-05-10",
};

export const classificationTypes = {
  common: { label: "Common Mole", description: "Benign nevus — uniform color, round/oval shape, <6mm" },
  atypical: { label: "Atypical Mole", description: "Dysplastic nevus — irregular shape or mixed coloring" },
  congenital: { label: "Congenital Mole", description: "Present at birth — varies in size, monitor for changes" },
  spitz: { label: "Spitz Nevus", description: "Dome-shaped, pink/brown — often benign but can mimic melanoma" },
  blue: { label: "Blue Nevus", description: "Blue-gray coloring from deep melanin — usually benign" },
  suspicious: { label: "Suspicious Lesion", description: "Requires further clinical evaluation" },
};

// Normalized body coordinates: x/y as % of body map (0-100)
// view: "front" or "back"
export const moleHistory = [
  {
    id: "m1",
    name: "Left Forearm",
    classification: "common",
    bodyPosition: { x: 27, y: 46, view: "front" },
    scans: [
      { date: "2026-04-10", status: "Low Risk", confidence: 92, diameterMm: 4.2, areaMm2: 13.9, notes: "No visible changes" },
      { date: "2026-03-08", status: "Low Risk", confidence: 90, diameterMm: 4.1, areaMm2: 13.2, notes: "Baseline scan" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
  {
    id: "m2",
    name: "Upper Back",
    classification: "atypical",
    previousClassification: "common",
    bodyPosition: { x: 56, y: 32, view: "back" },
    scans: [
      { date: "2026-04-05", status: "Needs Review", confidence: 74, diameterMm: 6.8, areaMm2: 36.3, notes: "Slight asymmetry detected — irregular border emerging" },
      { date: "2026-02-20", status: "Low Risk", confidence: 88, diameterMm: 5.5, areaMm2: 23.8, notes: "Initial scan — uniform appearance" },
    ],
    trend: "Significant growth detected (+52.5% area)",
    trendType: "alert",
  },
  {
    id: "m3",
    name: "Right Shoulder",
    classification: "congenital",
    bodyPosition: { x: 66, y: 26, view: "front" },
    scans: [
      { date: "2026-03-28", status: "Low Risk", confidence: 95, diameterMm: 7.0, areaMm2: 38.5, notes: "Stable appearance — consistent with congenital nevus" },
      { date: "2026-01-15", status: "Low Risk", confidence: 93, diameterMm: 6.9, areaMm2: 37.4, notes: "Baseline scan" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
  {
    id: "m4",
    name: "Left Calf",
    classification: "suspicious",
    previousClassification: "atypical",
    bodyPosition: { x: 42, y: 78, view: "front" },
    scans: [
      { date: "2026-03-15", status: "High Priority Review Recommended", confidence: 62, diameterMm: 8.3, areaMm2: 54.1, notes: "Irregular border, asymmetric shape, mixed coloring noted" },
    ],
    trend: "New entry — clinical evaluation recommended",
    trendType: "alert",
  },
  {
    id: "m5",
    name: "Chest",
    classification: "blue",
    bodyPosition: { x: 53, y: 33, view: "front" },
    scans: [
      { date: "2026-02-28", status: "Low Risk", confidence: 91, diameterMm: 3.8, areaMm2: 11.3, notes: "Blue-gray coloring, well-defined borders — consistent with blue nevus" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
];

export function getAreaGrowth(scans) {
  if (scans.length < 2) return null;
  const current = scans[0].areaMm2;
  const previous = scans[1].areaMm2;
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function hasClassificationEscalation(mole) {
  return !!mole.previousClassification;
}

export const mockAnalysisResult = {
  classification: "Low Risk",
  confidence: 92,
  clinicalType: "common",
  diameterMm: 4.2,
  areaMm2: 13.9,
  explanation:
    "The analyzed region shows a symmetrical shape with uniform coloring and well-defined borders. These characteristics are generally associated with benign skin lesions. No immediate concern detected based on visual analysis.",
  recommendations: [
    "Continue monitoring this mole monthly",
    "Take follow-up images under similar lighting",
    "Consult a dermatologist if you notice changes in size, shape, or color",
  ],
};

export const genAConversation = [
  {
    id: 1,
    role: "assistant",
    text: "Hi! I'm GenA, your Derma Pocket assistant. I can help explain your scan results, answer general skin health questions, and guide you through the app. How can I help today?",
  },
];

export const genASuggestions = [
  "What does my result mean?",
  "Should I book a dermatologist?",
  "How do I take a better photo?",
  "What is the ABCDE rule?",
];

export const genAResponses = {
  "What does my result mean?":
    'Your most recent scan was classified as "Low Risk" with 92% confidence. This means the visual characteristics of the mole — including its shape, color, and borders — appear consistent with benign skin features. However, this is an informational assessment only and not a medical diagnosis. Regular monitoring and professional check-ups are always recommended.',
  "Should I book a dermatologist?":
    "Based on your current scan history, there's no urgent need for an immediate appointment. That said, it's always a good idea to have an annual skin check with a dermatologist, especially if you have a family history of skin cancer or notice any changes. You can share your Derma Pocket summary with your connected dermatologist anytime.",
  "How do I take a better photo?":
    "Great question! For the best results: use natural daylight or a well-lit room, hold your phone about 10–15 cm from the mole, make sure the mole is centered and in focus, avoid shadows or flash glare, and keep the background clean. Consistent photo conditions help with accurate comparisons over time.",
  "What is the ABCDE rule?":
    "The ABCDE rule is a helpful guide for evaluating moles: A — Asymmetry (one half doesn't match the other), B — Border (irregular or blurred edges), C — Color (uneven shades or multiple colors), D — Diameter (larger than 6mm), E — Evolving (changes in size, shape, or color over time). If a mole shows any of these signs, it's worth having it checked by a professional.",
};

export const dermatologistSummary = {
  patientName: "Alex Morgan",
  patientAge: 34,
  skinType: "Type II - Fair",
  totalScans: 8,
  monitoredMoles: 5,
  riskFlags: [
    { mole: "Upper Back", flag: "Needs Review", detail: "Classification escalated from Common → Atypical. Area increased 52.5% (23.8 → 36.3 mm²)" },
    { mole: "Left Calf", flag: "High Priority", detail: "Classified as Suspicious Lesion. Irregular border, asymmetric shape — recommend clinical evaluation" },
  ],
  timeline: [
    { date: "2026-04-10", event: "Left Forearm scanned — Low Risk (4.2mm, 13.9 mm²)" },
    { date: "2026-04-05", event: "Upper Back scanned — Needs Review (6.8mm, 36.3 mm²)" },
    { date: "2026-03-28", event: "Right Shoulder scanned — Low Risk (7.0mm, 38.5 mm²)" },
    { date: "2026-03-15", event: "Left Calf scanned — High Priority Review (8.3mm, 54.1 mm²)" },
    { date: "2026-02-28", event: "Chest scanned — Low Risk (3.8mm, 11.3 mm²)" },
  ],
  notes: "Patient has been consistently monitoring 5 moles over the past 3 months. Two areas flagged for further review. Upper Back shows significant area growth (+52.5%) and classification escalation (Common → Atypical). Left Calf classified as Suspicious Lesion — recommend in-person evaluation.",
};
