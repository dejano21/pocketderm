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

export const moleHistory = [
  {
    id: "m1",
    name: "Left Forearm",
    scans: [
      { date: "2026-04-10", status: "Low Risk", confidence: 92, notes: "No visible changes" },
      { date: "2026-03-08", status: "Low Risk", confidence: 90, notes: "Baseline scan" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
  {
    id: "m2",
    name: "Upper Back",
    scans: [
      { date: "2026-04-05", status: "Needs Review", confidence: 74, notes: "Slight asymmetry detected" },
      { date: "2026-02-20", status: "Low Risk", confidence: 88, notes: "Initial scan" },
    ],
    trend: "Slight change detected",
    trendType: "change",
  },
  {
    id: "m3",
    name: "Right Shoulder",
    scans: [
      { date: "2026-03-28", status: "Low Risk", confidence: 95, notes: "Stable appearance" },
      { date: "2026-01-15", status: "Low Risk", confidence: 93, notes: "Baseline scan" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
  {
    id: "m4",
    name: "Left Calf",
    scans: [
      { date: "2026-03-15", status: "High Priority Review Recommended", confidence: 62, notes: "Irregular border noted" },
    ],
    trend: "New entry — monitoring recommended",
    trendType: "alert",
  },
  {
    id: "m5",
    name: "Chest",
    scans: [
      { date: "2026-02-28", status: "Low Risk", confidence: 91, notes: "Uniform coloring" },
    ],
    trend: "No major visible changes",
    trendType: "stable",
  },
];

export const mockAnalysisResult = {
  classification: "Low Risk",
  confidence: 92,
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
    text: "Hi! I'm GenA, your Pocket-Derm assistant. I can help explain your scan results, answer general skin health questions, and guide you through the app. How can I help today?",
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
    "Based on your current scan history, there's no urgent need for an immediate appointment. That said, it's always a good idea to have an annual skin check with a dermatologist, especially if you have a family history of skin cancer or notice any changes. You can share your Pocket-Derm summary with your connected dermatologist anytime.",
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
    { mole: "Upper Back", flag: "Needs Review", detail: "Slight asymmetry detected in latest scan" },
    { mole: "Left Calf", flag: "High Priority", detail: "Irregular border noted — recommend clinical evaluation" },
  ],
  timeline: [
    { date: "2026-04-10", event: "Left Forearm scanned — Low Risk" },
    { date: "2026-04-05", event: "Upper Back scanned — Needs Review" },
    { date: "2026-03-28", event: "Right Shoulder scanned — Low Risk" },
    { date: "2026-03-15", event: "Left Calf scanned — High Priority Review" },
    { date: "2026-02-28", event: "Chest scanned — Low Risk" },
  ],
  notes: "Patient has been consistently monitoring 5 moles over the past 3 months. Two areas flagged for further review. Recommend in-person evaluation for left calf lesion.",
};
