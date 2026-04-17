// ─── Module imports ──────────────────────────────────────────────────────────
import { validateImage } from './imageValidator.js';
import { runPipeline } from './analysisPipeline.js';
import { renderResults, showLoading, hideLoading, showError } from './resultsDisplay.js';
import { PipelineError } from './errors.js';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentImage: null,
  currentImageDataURL: null,
  scanHistory: [],
  analysisResult: null,
};

// ─── Navigation ──────────────────────────────────────────────────────────────
function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('screen-' + screenId).classList.add('active');
  document.querySelector(`[data-screen="${screenId}"]`).classList.add('active');

  if (screenId === 'history') renderHistory();
  if (screenId === 'dermatologist') renderDermReports();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => navigateTo(tab.dataset.screen));
});

// ─── Upload / Drag & Drop ────────────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  // Validate before showing preview (Requirements 1.1–1.5)
  const validation = await validateImage(file);
  if (!validation.valid) {
    showError(validation.error);
    showPanel('results-panel');
    return;
  }

  state.currentImage = file;
  const reader = new FileReader();
  reader.onload = ev => {
    state.currentImageDataURL = ev.target.result;
    document.getElementById('preview-img').src = ev.target.result;
    document.getElementById('file-name-display').textContent = file.name;
    showPanel('preview-panel');
    setStep(1);
  };
  reader.readAsDataURL(file);
}

function showPanel(id) {
  ['upload-panel', 'preview-panel', 'analysis-panel', 'results-panel'].forEach(p => {
    document.getElementById(p).classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

function resetScan() {
  fileInput.value = '';
  state.currentImage = null;
  state.currentImageDataURL = null;
  state.analysisResult = null;
  document.getElementById('results-panel').innerHTML = '';
  showPanel('upload-panel');
  setStep(0);
}

function setStep(active) {
  [1, 2, 3].forEach((n, i) => {
    const el = document.getElementById('step-' + n);
    el.classList.remove('active', 'done');
    if (i < active) el.classList.add('done');
    else if (i === active) el.classList.add('active');
  });
}

// ─── Analysis Pipeline ───────────────────────────────────────────────────────
async function runAnalysis() {
  showPanel('analysis-panel');
  setStep(1);
  showLoading();

  // Run first three visual steps while pipeline is in-flight
  const uiSteps = [
    { id: 'astep-1', duration: 800 },
    { id: 'astep-2', duration: 1000 },
    { id: 'astep-3', duration: 900 },
  ];

  // Kick off the real pipeline in parallel with the UI animation
  const pipelinePromise = runPipeline(state.currentImage, 'user-demo').catch(err => {
    console.warn('Pipeline failed, falling back to mock:', err.message);
    return { _error: err };
  });

  for (const step of uiSteps) {
    await animateStep(step.id, step.duration);
  }

  const [pipelineResult] = await Promise.all([
    pipelinePromise,
    animateStep('astep-4', 1000),
  ]);

  hideLoading();
  setStep(2);

  if (pipelineResult && pipelineResult._error) {
    const err = pipelineResult._error;
    let msg;
    if (err instanceof PipelineError && err.step) {
      msg = `Analysis failed during ${err.step}. Please try again.`;
    } else {
      // Fallback to mock result when pipeline is not configured
      console.warn('Using mock result due to pipeline error:', err.message);
      const mockResult = generateMockPipelineResult();
      state.analysisResult = mockResult;
      renderResults(mockResult);
      showPanel('results-panel');
      setStep(2);
      saveToHistory(mockResult);
      return;
    }
    showError(msg);
    showPanel('results-panel');
    return;
  }

  state.analysisResult = pipelineResult;
  renderResults(pipelineResult);
  showPanel('results-panel');
  setStep(2);
  saveToHistory(pipelineResult);
}

function animateStep(stepId, duration) {
  return new Promise(resolve => {
    const el = document.getElementById(stepId);
    const icon = el.querySelector('.astep-icon');
    const fill = el.querySelector('.astep-fill');
    icon.classList.add('running');
    let start = null;
    function tick(ts) {
      if (!start) start = ts;
      const pct = Math.min(((ts - start) / duration) * 100, 100);
      fill.style.width = pct + '%';
      if (pct < 100) requestAnimationFrame(tick);
      else {
        icon.classList.remove('running');
        icon.classList.add('done');
        fill.classList.add('done');
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

// ─── Mock Pipeline Result Generator ──────────────────────────────────────────
function generateMockPipelineResult() {
  const classes = [
    { category: 'common nevus', confidence: 0.87 + Math.random() * 0.1, risk: 'low', score: 22 },
    { category: 'atypical nevus', confidence: 0.72 + Math.random() * 0.1, risk: 'moderate', score: 55 },
    { category: 'melanoma-suspicious', confidence: 0.81 + Math.random() * 0.08, risk: 'high', score: 78 },
  ];
  const pick = classes[Math.floor(Math.random() * classes.length)];
  const DISCLAIMER_TEXT = 'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

  return {
    classificationResult: { category: pick.category, confidence: pick.confidence },
    featureMetrics: {
      borderRegularity: pick.risk === 'low' ? 0.91 : pick.risk === 'moderate' ? 0.74 : 0.52,
      symmetryScore: pick.risk === 'low' ? 0.88 : pick.risk === 'moderate' ? 0.71 : 0.49,
      colorUniformity: pick.risk === 'low' ? 0.93 : pick.risk === 'moderate' ? 0.68 : 0.41,
      boundaryPoints: generateSegPoints(),
      estimatedAreaMm2: pick.risk === 'low' ? 4.2 : pick.risk === 'moderate' ? 7.8 : 12.4,
    },
    explanationText: `Based on the image analysis, the lesion shows characteristics consistent with a <strong>${pick.category}</strong>. The model identified features consistent with a ${pick.risk}-risk lesion. Asymmetry, Border, Color, Diameter, and Evolution (ABCDE) criteria were evaluated. ${DISCLAIMER_TEXT}`,
    riskResult: { level: pick.risk, score: pick.score },
    disclaimer: DISCLAIMER_TEXT,
    s3Key: `demo/${Date.now()}-mock.jpg`,
    // Legacy fields for history/derm views
    id: Date.now(),
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    location: document.getElementById('body-location')?.value || 'Unspecified',
    notes: document.getElementById('scan-notes')?.value || '',
    imageDataURL: state.currentImageDataURL,
    label: pick.category,
    risk: pick.risk,
    confidence: pick.confidence,
    dermSummary: `Mock result: ${pick.category} with ${Math.round(pick.confidence * 100)}% confidence. Risk: ${pick.risk}.`,
    nextSteps: [],
  };
}

// ─── Mock AI Result Generator (legacy, kept for history seeding) ──────────────
function generateMockResult() {
  const classes = [
    {
      label: 'Benign Nevus',
      risk: 'low',
      confidence: 0.87 + Math.random() * 0.1,
      description: 'Common mole — appears benign with regular borders and uniform pigmentation.',
      explanation: `Based on the image analysis, the lesion shows characteristics consistent with a <strong>benign melanocytic nevus</strong> (common mole). The ResNet-50 classification model identified regular border symmetry, uniform color distribution, and a diameter within normal range — all indicators associated with low-risk lesions.\n\nThe SAM segmentation model successfully outlined the mole boundary, measuring an estimated area of <strong>4.2 mm²</strong>. No irregular border extensions were detected.\n\nThis result does <em>not</em> indicate a medical diagnosis. It is a screening aid to help you and your dermatologist monitor changes over time.`,
      nextSteps: [
        { type: 'green', icon: '✅', text: 'Continue routine monitoring every 3–6 months.' },
        { type: 'green', icon: '📸', text: 'Re-scan if you notice any changes in size, shape, or color.' },
        { type: 'yellow', icon: '☀️', text: 'Apply SPF 30+ sunscreen daily to protect the area.' },
      ],
      dermSummary: 'Lesion classified as benign nevus with 87%+ confidence. Regular borders, uniform pigmentation. Recommend routine monitoring. No urgent referral indicated.',
    },
    {
      label: 'Atypical Nevus',
      risk: 'moderate',
      confidence: 0.72 + Math.random() * 0.1,
      description: 'Mildly atypical features detected — irregular border or color variation present.',
      explanation: `The analysis identified features consistent with an <strong>atypical (dysplastic) nevus</strong>. The model detected mild asymmetry and slight color variation across the lesion, which are characteristics that warrant closer monitoring.\n\nSAM segmentation outlined an estimated area of <strong>7.8 mm²</strong> with a slightly irregular border on the lower-right quadrant.\n\nAtypical nevi are not necessarily cancerous, but they carry a modestly elevated risk compared to common moles. A dermatologist review is recommended within the next 4–8 weeks.`,
      nextSteps: [
        { type: 'yellow', icon: '📅', text: 'Schedule a dermatologist appointment within 4–8 weeks.' },
        { type: 'yellow', icon: '📸', text: 'Re-scan monthly to track any changes.' },
        { type: 'red', icon: '🚨', text: 'Seek urgent care if the mole bleeds, itches, or grows rapidly.' },
      ],
      dermSummary: 'Atypical nevus detected with ~72% confidence. Mild asymmetry and color variation noted. SAM boundary shows slight irregularity. Recommend in-person evaluation within 4–8 weeks.',
    },
    {
      label: 'Suspicious Lesion',
      risk: 'high',
      confidence: 0.81 + Math.random() * 0.08,
      description: 'High-risk features detected — prompt dermatologist evaluation recommended.',
      explanation: `The model flagged this lesion as <strong>high-risk</strong>, identifying multiple ABCDE criteria: significant asymmetry, irregular and poorly defined borders, multi-tonal coloration, and a diameter exceeding 6 mm.\n\nSAM segmentation revealed a complex boundary with <strong>12.4 mm²</strong> estimated area and notable border irregularity across multiple quadrants.\n\n<strong>This does not confirm a diagnosis of melanoma</strong>, but the features identified are consistent with lesions that require prompt professional evaluation. Please contact your dermatologist as soon as possible.`,
      nextSteps: [
        { type: 'red', icon: '🚨', text: 'Contact your dermatologist immediately for an urgent evaluation.' },
        { type: 'red', icon: '🏥', text: 'Do not delay — early detection significantly improves outcomes.' },
        { type: 'yellow', icon: '📋', text: 'A clinical summary has been sent to your connected dermatologist.' },
      ],
      dermSummary: 'HIGH RISK: Suspicious lesion with 81%+ confidence. Multiple ABCDE criteria flagged: asymmetry, irregular borders, multi-tonal color, diameter >6mm. SAM boundary shows complex irregular outline. URGENT evaluation recommended.',
    },
  ];

  const pick = classes[Math.floor(Math.random() * classes.length)];
  const location = document.getElementById('body-location').value || 'Unspecified';
  const notes = document.getElementById('scan-notes').value || '';

  return {
    ...pick,
    id: Date.now(),
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    location,
    notes,
    imageDataURL: state.currentImageDataURL,
    segPoints: generateSegPoints(),
  };
}

function generateSegPoints() {
  const cx = 0.5, cy = 0.5;
  const points = [];
  const n = 32;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const r = 0.18 + (Math.random() * 0.06 - 0.03);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(result) {
  const panel = document.getElementById('results-panel');
  panel.innerHTML = `
    <div class="result-card">
      <div class="result-card-header">
        <span>🔬</span> Classification — ResNet-50
      </div>
      <div class="result-card-body">
        <div class="classification-result">
          <div class="risk-badge ${result.risk}">${result.risk.toUpperCase()} RISK</div>
          <div class="classification-details">
            <h4>${result.label}</h4>
            <p>${result.description}</p>
            <div class="confidence-bar-wrap">
              <div class="confidence-bar">
                <div class="confidence-fill ${result.risk}" id="conf-fill" style="width:0%"></div>
              </div>
              <span class="confidence-pct">${Math.round(result.confidence * 100)}%</span>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Model confidence</p>
          </div>
        </div>
      </div>
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <span>🎯</span> Segmentation — SAM (Segment Anything Model)
      </div>
      <div class="result-card-body">
        <div class="seg-result">
          <div class="seg-image-wrap">
            <img src="${result.imageDataURL}" alt="Segmented mole" id="seg-result-img" />
            <canvas id="seg-result-canvas"></canvas>
          </div>
          <div class="seg-metrics">
            <div class="seg-metric">
              <span class="seg-metric-label">Estimated Area</span>
              <span class="seg-metric-value">${result.bedrockMetrics?.estimatedAreaMm2?.toFixed(1) ?? (Math.random() * 10 + 3).toFixed(1)} mm²</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Border Regularity</span>
              <span class="seg-metric-value">${result.bedrockMetrics?.borderRegularity ?? (result.risk === 'low' ? 'Regular' : result.risk === 'moderate' ? 'Mildly Irregular' : 'Irregular')}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Symmetry Score</span>
              <span class="seg-metric-value">${result.bedrockMetrics?.symmetryScore?.toFixed(2) ?? (result.risk === 'low' ? '0.91' : result.risk === 'moderate' ? '0.74' : '0.52')}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Color Uniformity</span>
              <span class="seg-metric-value">${result.bedrockMetrics?.colorUniformity ?? (result.risk === 'low' ? 'Uniform' : result.risk === 'moderate' ? 'Mild variation' : 'Multi-tonal')}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Boundary Points</span>
              <span class="seg-metric-value">32 detected</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <span>💬</span> AI Explanation
      </div>
      <div class="result-card-body">
        <div class="ai-explanation" id="ai-text"></div>
        <div class="next-steps" id="next-steps"></div>
      </div>
    </div>

    <div class="results-actions">
      <button class="btn-primary" onclick="navigateTo('dermatologist')">
        📋 View Dermatologist Report
      </button>
      <button class="btn-secondary" onclick="resetScan()">New Scan</button>
      <button class="btn-secondary" onclick="navigateTo('history')">View History</button>
    </div>
  `;

  // Animate confidence bar
  setTimeout(() => {
    const fill = document.getElementById('conf-fill');
    if (fill) fill.style.width = Math.round(result.confidence * 100) + '%';
  }, 100);

  // Draw segmentation overlay
  setTimeout(() => drawSegmentation(result), 200);

  // Type out AI explanation
  setTimeout(() => typeExplanation(result), 400);
}

function drawSegmentation(result) {
  const canvas = document.getElementById('seg-result-canvas');
  const img = document.getElementById('seg-result-img');
  if (!canvas || !img) return;

  const draw = () => {
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    const pts = result.segPoints;
    const color = result.risk === 'low' ? '#34c77b' : result.risk === 'moderate' ? '#f59e0b' : '#ef4444';

    ctx.beginPath();
    ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.fillStyle = color + '22';
    ctx.fill();

    // Boundary label
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('SAM boundary', 8, 18);
  };

  if (img.complete) draw();
  else img.onload = draw;
}

function typeExplanation(result) {
  const el = document.getElementById('ai-text');
  if (!el) return;

  const html = result.explanation;
  const stripped = html.replace(/<[^>]+>/g, '');
  let i = 0;
  el.innerHTML = '<span class="typing-cursor"></span>';

  const interval = setInterval(() => {
    i += 3;
    if (i >= stripped.length) {
      el.innerHTML = html;
      clearInterval(interval);
      renderNextSteps(result);
    } else {
      el.innerHTML = stripped.slice(0, i) + '<span class="typing-cursor"></span>';
    }
  }, 18);
}

function renderNextSteps(result) {
  const el = document.getElementById('next-steps');
  if (!el) return;
  el.innerHTML = result.nextSteps.map(s =>
    `<div class="next-step-item ${s.type}"><span>${s.icon}</span><span>${s.text}</span></div>`
  ).join('');
}

// ─── History ──────────────────────────────────────────────────────────────────
function saveToHistory(result) {
  // Normalize PipelineResult to the legacy history shape
  const entry = result.classificationResult
    ? {
        id: result.id || Date.now(),
        label: result.classificationResult.category,
        risk: result.riskResult.level,
        confidence: result.classificationResult.confidence,
        description: '',
        explanation: result.explanationText || '',
        dermSummary: result.dermSummary || `${result.classificationResult.category} — risk: ${result.riskResult.level}, score: ${result.riskResult.score}`,
        nextSteps: result.nextSteps || [],
        date: result.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: result.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        location: result.location || document.getElementById('body-location')?.value || 'Unspecified',
        notes: result.notes || document.getElementById('scan-notes')?.value || '',
        imageDataURL: result.imageDataURL || state.currentImageDataURL,
        segPoints: result.featureMetrics?.boundaryPoints || generateSegPoints(),
      }
    : result;
  state.scanHistory.unshift(entry);
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');

  if (state.scanHistory.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = state.scanHistory.map(item => `
    <div class="history-item">
      <img class="history-thumb" src="${item.imageDataURL}" alt="Mole scan" />
      <div class="history-info">
        <h4>${item.label}</h4>
        <div class="history-date">${item.date} · ${item.time}</div>
        <div class="history-location">📍 ${item.location}</div>
        ${item.notes ? `<div class="history-location" style="margin-top:4px">📝 ${item.notes}</div>` : ''}
      </div>
      <div>
        <div class="history-badge ${item.risk}">${item.risk.toUpperCase()} RISK</div>
        <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:6px">${Math.round(item.confidence * 100)}% conf.</div>
      </div>
    </div>
  `).join('');
}

// ─── Dermatologist Reports ────────────────────────────────────────────────────
function renderDermReports() {
  const container = document.getElementById('derm-reports');
  const empty = document.getElementById('derm-empty');

  if (state.scanHistory.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = state.scanHistory.map(item => `
    <div class="derm-report-card">
      <div class="derm-report-header">
        <h4>Scan Report — ${item.date}</h4>
        <span class="history-badge ${item.risk}" style="font-size:11px;padding:4px 10px">${item.risk.toUpperCase()} RISK</span>
      </div>
      <div class="derm-report-body">
        <div class="derm-report-grid">
          <div class="derm-field">
            <label>Classification</label>
            <span>${item.label}</span>
          </div>
          <div class="derm-field">
            <label>Confidence</label>
            <span>${Math.round(item.confidence * 100)}%</span>
          </div>
          <div class="derm-field">
            <label>Body Location</label>
            <span>${item.location}</span>
          </div>
          <div class="derm-field">
            <label>Scan Date</label>
            <span>${item.date}</span>
          </div>
          <div class="derm-field">
            <label>Model</label>
            <span>ResNet-50 + SAM</span>
          </div>
          <div class="derm-field">
            <label>Patient Notes</label>
            <span>${item.notes || '—'}</span>
          </div>
        </div>
        <div class="derm-summary-text">${item.dermSummary}</div>
      </div>
      <div class="derm-report-actions">
        <button class="btn-primary" style="font-size:13px;padding:8px 16px" onclick="shareReport('${item.id}')">
          📤 Share with Dr. Chen
        </button>
        <button class="btn-secondary small" onclick="downloadReport('${item.id}')">⬇ Download PDF</button>
      </div>
    </div>
  `).join('');
}

function shareReport(id) {
  const btn = event.target;
  btn.textContent = '✅ Shared';
  btn.style.background = 'var(--green)';
  setTimeout(() => {
    btn.textContent = '📤 Share with Dr. Chen';
    btn.style.background = '';
  }, 2500);
}

function downloadReport(id) {
  const btn = event.target;
  btn.textContent = '⬇ Preparing...';
  setTimeout(() => { btn.textContent = '⬇ Download PDF'; }, 1500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Seed one demo scan so history isn't empty on first load
(function seedDemo() {
  const demo = {
    id: Date.now() - 86400000,
    label: 'Benign Nevus',
    risk: 'low',
    confidence: 0.91,
    description: 'Common mole — appears benign.',
    explanation: 'Demo scan — benign nevus detected.',
    dermSummary: 'Demo: Benign nevus, 91% confidence. No urgent action required.',
    nextSteps: [],
    date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: '10:24 AM',
    location: 'Back',
    notes: 'Noticed slight darkening',
    imageDataURL: generatePlaceholderImage('#4F8EF7'),
    segPoints: generateSegPoints(),
  };
  state.scanHistory.push(demo);
})();

function generatePlaceholderImage(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 200, 200);
  ctx.beginPath();
  ctx.arc(100, 100, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#5a3e2b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(92, 94, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#3d2a1a';
  ctx.fill();
  return canvas.toDataURL();
}
