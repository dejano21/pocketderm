/**
 * Results Display module — renders pipeline results into the DOM.
 * Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5, 10.2, 10.3
 */

import { DISCLAIMER } from './explanationGenerator.js';

const DISCLAIMER_TEXT =
  typeof DISCLAIMER === 'string' && DISCLAIMER.length > 0
    ? DISCLAIMER
    : 'This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist.';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getOrCreate(id, tag, parent, className) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    if (className) el.className = className;
    parent.appendChild(el);
  }
  return el;
}

function formatConfidence(confidence) {
  return Math.round(confidence * 100) + '%';
}

function formatArea(estimatedAreaMm2) {
  if (estimatedAreaMm2 == null) return 'Unavailable';
  return estimatedAreaMm2.toFixed(1) + ' mm²';
}

function formatScore(score) {
  if (typeof score !== 'number') return String(score);
  return score.toFixed(2);
}

function riskColorClass(level) {
  if (level === 'low') return 'low';
  if (level === 'high') return 'high';
  return 'moderate';
}

/**
 * Draws boundary points on a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{x: number, y: number}>} points
 * @param {string} riskLevel
 */
function drawBoundaryPoints(canvas, points, riskLevel) {
  if (!canvas || !points || points.length === 0) return;
  const size = 120;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // canvas not supported in this environment
  const color =
    riskLevel === 'low' ? '#34c77b' : riskLevel === 'high' ? '#ef4444' : '#f59e0b';

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(points[0].x * size, points[0].y * size);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * size, points[i].y * size);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.stroke();
  ctx.fillStyle = color + '33';
  ctx.fill();

  // Draw individual points
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  for (const pt of points) {
    ctx.beginPath();
    ctx.arc(pt.x * size, pt.y * size, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders all four result sections plus the disclaimer into #results-panel.
 * @param {import('./analysisPipeline.js').PipelineResult} pipelineResult
 */
export function renderResults(pipelineResult) {
  const panel = document.getElementById('results-panel');
  if (!panel) return;

  const { classificationResult, featureMetrics, explanationText, riskResult } = pipelineResult;
  const disclaimer = pipelineResult.disclaimer || DISCLAIMER_TEXT;
  const riskLevel = riskResult.level;
  const colorClass = riskColorClass(riskLevel);

  panel.innerHTML = `
    <!-- Section 1: Classification -->
    <div class="result-card" id="rd-classification-card">
      <div class="result-card-header">
        <span>🔬</span> Classification
      </div>
      <div class="result-card-body">
        <div class="classification-result">
          <div class="risk-badge ${colorClass}" id="rd-risk-badge">${riskLevel.toUpperCase()} RISK</div>
          <div class="classification-details">
            <h4 id="rd-category">${classificationResult.category}</h4>
            <div class="confidence-bar-wrap">
              <div class="confidence-bar">
                <div class="confidence-fill ${colorClass}" id="rd-conf-fill" style="width:0%"></div>
              </div>
              <span class="confidence-pct" id="rd-confidence">${formatConfidence(classificationResult.confidence)}</span>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Model confidence</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Metrics -->
    <div class="result-card" id="rd-metrics-card">
      <div class="result-card-header">
        <span>📊</span> Feature Metrics
      </div>
      <div class="result-card-body">
        <div class="seg-result">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <canvas id="rd-boundary-canvas" width="120" height="120" style="border-radius:8px;background:#0f172a;display:block"></canvas>
            <span style="font-size:11px;color:var(--text-muted)">${featureMetrics.boundaryPoints ? featureMetrics.boundaryPoints.length + ' boundary points' : 'No boundary data'}</span>
          </div>
          <div class="seg-metrics">
            <div class="seg-metric">
              <span class="seg-metric-label">Border Regularity</span>
              <span class="seg-metric-value" id="rd-border-regularity">${formatScore(featureMetrics.borderRegularity)}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Symmetry Score</span>
              <span class="seg-metric-value" id="rd-symmetry">${formatScore(featureMetrics.symmetryScore)}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Color Uniformity</span>
              <span class="seg-metric-value" id="rd-color-uniformity">${formatScore(featureMetrics.colorUniformity)}</span>
            </div>
            <div class="seg-metric">
              <span class="seg-metric-label">Estimated Area</span>
              <span class="seg-metric-value" id="rd-area">${formatArea(featureMetrics.estimatedAreaMm2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Medical Explanation -->
    <div class="result-card" id="rd-explanation-card">
      <div class="result-card-header">
        <span>💬</span> Medical Explanation
      </div>
      <div class="result-card-body">
        <div class="ai-explanation" id="rd-explanation">${explanationText}</div>
      </div>
    </div>

    <!-- Section 4: Overall Risk -->
    <div class="result-card" id="rd-risk-card">
      <div class="result-card-header">
        <span>⚠️</span> Overall Risk
      </div>
      <div class="result-card-body">
        <div class="classification-result">
          <div class="risk-badge ${colorClass}" id="rd-risk-level">${riskLevel.toUpperCase()}</div>
          <div class="classification-details">
            <h4>Risk Score: <span id="rd-risk-score">${riskResult.score}</span> / 100</h4>
            <p style="font-size:13px;color:var(--text-muted)">
              ${riskLevel === 'low' ? 'Low risk — continue routine monitoring.' : riskLevel === 'moderate' ? 'Moderate risk — consider a dermatologist consultation.' : 'High risk — prompt dermatologist evaluation recommended.'}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Disclaimer (persistently visible) -->
    <div class="result-disclaimer" id="rd-disclaimer" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;margin-top:4px">
      ⚠️ <span id="rd-disclaimer-text">${disclaimer}</span>
    </div>

    <div class="results-actions">
      <button class="btn-secondary" onclick="resetScan()">New Scan</button>
    </div>
  `;

  // Animate confidence bar
  setTimeout(() => {
    const fill = document.getElementById('rd-conf-fill');
    if (fill) fill.style.width = formatConfidence(classificationResult.confidence);
  }, 100);

  // Draw boundary visualization
  const canvas = document.getElementById('rd-boundary-canvas');
  if (canvas && featureMetrics.boundaryPoints && featureMetrics.boundaryPoints.length > 0) {
    drawBoundaryPoints(canvas, featureMetrics.boundaryPoints, riskLevel);
  }
}

/**
 * Shows the loading indicator while the pipeline is running.
 * Hides partial results.
 * Requirements: 8.1, 8.2
 */
export function showLoading() {
  const panel = document.getElementById('results-panel');
  if (panel) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  }

  let loadingEl = document.getElementById('rd-loading');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'rd-loading';
    loadingEl.className = 'rd-loading';
    loadingEl.innerHTML = `
      <div style="text-align:center;padding:40px">
        <div class="rd-spinner" style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:rd-spin 0.8s linear infinite;margin:0 auto 16px"></div>
        <p style="color:var(--text-muted);font-size:14px">Analyzing your image…</p>
      </div>
    `;
    // Inject keyframes if not already present
    if (!document.getElementById('rd-spin-style')) {
      const style = document.createElement('style');
      style.id = 'rd-spin-style';
      style.textContent = '@keyframes rd-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    const container = panel ? panel.parentNode : document.body;
    if (panel) {
      container.insertBefore(loadingEl, panel);
    } else {
      container.appendChild(loadingEl);
    }
  }
  loadingEl.classList.remove('hidden');
}

/**
 * Hides the loading indicator.
 * Requirements: 8.3
 */
export function hideLoading() {
  const loadingEl = document.getElementById('rd-loading');
  if (loadingEl) loadingEl.classList.add('hidden');

  const panel = document.getElementById('results-panel');
  if (panel) panel.classList.remove('hidden');
}

/**
 * Shows a user-friendly error message.
 * @param {string} message
 * Requirements: 8.2, 8.3
 */
export function showError(message) {
  hideLoading();

  const panel = document.getElementById('results-panel');
  if (!panel) return;

  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div id="rd-error" class="result-card" style="border-color:#fca5a5">
      <div class="result-card-header" style="color:#dc2626">
        <span>❌</span> Analysis Error
      </div>
      <div class="result-card-body">
        <p id="rd-error-message" style="color:var(--text);font-size:14px">${message}</p>
        <button class="btn-secondary" style="margin-top:16px" onclick="resetScan()">Try Again</button>
      </div>
    </div>
  `;
}
