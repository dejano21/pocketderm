# Pocket-Derm — Mobile App Prototype

A frontend-only prototype for a mobile app that helps users photograph and monitor suspicious moles over time. Built for demo/pitch purposes with mock data throughout.

## Quick Start

```bash
cd pocket-derm
npm install
npm run dev
```

Then open the local URL shown in your terminal (typically `http://localhost:5173`). Use your browser's mobile device emulation (Chrome DevTools → Toggle Device Toolbar) for the best experience — the app is designed for ~430px width.

## Demo Flow

1. **Onboarding** → Tap "Get Started"
2. **Home Dashboard** → View stats, tap "New Scan"
3. **Capture** → Tap "Take Photo" → "Continue"
4. **Analysis Results** → See mock classification, confidence, segmentation overlay
5. **Mole History** → Browse tracked moles, tap one for detail + visual comparison
6. **Derm Summary** → Professional summary for dermatologist sharing
7. **GenA Chat** → Tap suggested questions for mock AI responses
8. **Profile** → Settings, connected dermatologist, privacy info

## Tech Stack

- React 18 + Vite
- React Router (client-side routing)
- Lucide React (icons)
- Pure CSS (no UI framework)

## Important

This is a **UI prototype only**. No real AI/ML models, no backend, no real camera integration. All classification results, segmentation overlays, and chat responses are mocked.
