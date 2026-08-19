/**
 * ORGINTEL (PRJ_637) - UI Components & Custom Chart Renderer
 * Modern Executive Glassmorphism Interfaces, Custom SVG/Canvas Charts, Modals, and Widgets.
 */

import { PROJECT_METADATA, GOVERNANCE_DIMENSIONS, QUARTERS } from './data.js';
import { getComparativeAnalysis, getOgpiTrendSeries } from './analytics.js';
import { detectAnomalies, predictProjectDelayRisk, generatePredictiveForecast } from './ml_engine.js';
import { generateAIExecutiveSummary, searchRAGDocuments } from './ai_rag.js';
import { getAllActions, createAction, updateActionStatus, simulateClosedLoopImpact } from './action_tracker.js';

/**
 * Renders the top Executive Bar with metadata and Quarter Selector
 */
export function renderHeaderBar(currentQuarterId, onQuarterChange) {
  const container = document.getElementById('header-bar');
  if (!container) return;

  const currentQObj = QUARTERS.find(q => q.id === currentQuarterId) || QUARTERS[9];

  container.innerHTML = `
    <div class="header-branding">
      <div class="brand-badge">${PROJECT_METADATA.id}</div>
      <div class="brand-titles">
        <h1 class="app-title">${PROJECT_METADATA.name}</h1>
        <p class="app-subtitle">${PROJECT_METADATA.tagline}</p>
      </div>
    </div>
    
    <div class="header-controls">
      <div class="cadence-pill">
        <i class="fas fa-calendar-alt"></i>
        <span>Assessment Cadence: <strong>${currentQObj.label}</strong></span>
      </div>
      <div class="quarter-select-wrapper">
        <label for="quarter-selector"><i class="fas fa-layer-group"></i> Select Quarter:</label>
        <select id="quarter-selector" class="quarter-dropdown">
          ${QUARTERS.map(q => `
            <option value="${q.id}" ${q.id === currentQuarterId ? 'selected' : ''}>
              ${q.label} ${q.event ? `(${q.event})` : ''}
            </option>
          `).join('')}
        </select>
      </div>
    </div>
  `;

  document.getElementById('quarter-selector').addEventListener('change', (e) => {
    onQuarterChange(e.target.value);
  });
}

/**
 * Renders TAB 1: Executive Dashboard (Overview)
 */
export function renderExecutiveDashboard(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const analysis = getComparativeAnalysis(quarterId);
  const summary = generateAIExecutiveSummary(quarterId);
  const projectRisk = predictProjectDelayRisk(quarterId);
  const forecast = generatePredictiveForecast(quarterId);
  const trendData = getOgpiTrendSeries();

  const ogpi = analysis.ogpi;
  const cur = analysis.current;

  // Slide 4 Example card data matching exact PPT slide numbers
  const isQ2 = quarterId === '2026-Q2';

  container.innerHTML = `
    <!-- Top Metric Banner -->
    <div class="dashboard-hero-grid">
      <!-- OGPI Main Score Card -->
      <div class="metric-card glass-card ogpi-hero-card">
        <div class="card-header">
          <span class="card-label">OVERALL GOVERNANCE PERFORMANCE INDEX</span>
          <span class="badge ${cur.status}">${cur.status.toUpperCase()}</span>
        </div>
        <div class="ogpi-display">
          <span class="ogpi-number">${ogpi.score}</span>
          <span class="ogpi-max">/ 100</span>
        </div>
        <div class="ogpi-deltas">
          <span class="delta-badge ${ogpi.qoqDelta >= 0 ? 'positive' : 'negative'}">
            <i class="fas fa-arrow-${ogpi.qoqDelta >= 0 ? 'up' : 'down'}"></i> ${Math.abs(ogpi.qoqPct)}% QoQ
          </span>
          <span class="delta-subtext">vs previous quarter (${ogpi.prevScore || '--'})</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${ogpi.score}%; background: ${cur.status === 'green' ? '#06D6A0' : cur.status === 'amber' ? '#FFD166' : '#EF476F'};"></div>
        </div>
      </div>

      <!-- Slide 4 Example Match Card: Key Concern -->
      <div class="metric-card glass-card concern-card">
        <div class="card-header">
          <span class="card-label"><i class="fas fa-exclamation-triangle text-amber"></i> KEY GOVERNANCE CONCERN</span>
          <span class="badge red">ATTENTION REQUIRED</span>
        </div>
        <h3 class="concern-title">${summary.keyConcern.title}</h3>
        <p class="concern-desc">${summary.keyConcern.details}</p>
        <div class="concern-metric-row">
          <div class="sub-metric">
            <span class="sub-label">People Score:</span>
            <span class="sub-value text-red">${isQ2 ? '77 → 69' : `${summary.keyConcern.score} / 100`}</span>
          </div>
          <div class="sub-metric">
            <span class="sub-label">Attrition Rate:</span>
            <span class="sub-value text-red">${isQ2 ? '8.2% → 13.4%' : 'Above Target'}</span>
          </div>
        </div>
      </div>

      <!-- AI Insight Widget -->
      <div class="metric-card glass-card ai-insight-card">
        <div class="card-header">
          <span class="card-label"><i class="fas fa-brain text-teal"></i> AI EXECUTIVE INSIGHT</span>
          <span class="badge blue">BEDROCK GENAI</span>
        </div>
        <p class="ai-insight-text">"${summary.aiInsight.summary}"</p>
        <div class="risk-pill-row">
          <span class="risk-pill ${projectRisk.riskLevel.toLowerCase()}">
            <i class="fas fa-shield-alt"></i> Q3 Workforce Risk = <strong>${projectRisk.riskLevel} (${projectRisk.riskProbability}%)</strong>
          </span>
          <span class="risk-pill outline">
            <i class="fas fa-layer-group"></i> Delayed Projects: <strong>${projectRisk.delayedProjectCount}</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Closed-Loop Workflow Banner (Slide 2) -->
    <div class="workflow-banner-card glass-card">
      <div class="banner-title"><i class="fas fa-sync-alt fa-spin"></i> CLOSED-LOOP GOVERNANCE WORKFLOW</div>
      <div class="workflow-steps-row">
        <div class="step-box active"><span class="step-num">1</span> Measure</div>
        <div class="step-arrow">→</div>
        <div class="step-box active"><span class="step-num">2</span> Diagnose</div>
        <div class="step-arrow">→</div>
        <div class="step-box active"><span class="step-num">3</span> Predict</div>
        <div class="step-arrow">→</div>
        <div class="step-box"><span class="step-num">4</span> Decide</div>
        <div class="step-arrow">→</div>
        <div class="step-box"><span class="step-num">5</span> Act</div>
        <div class="step-arrow">→</div>
        <div class="step-box"><span class="step-num">6</span> Impact</div>
      </div>
    </div>

    <!-- Charts Row: Dimensions Breakdown & Multi-Quarter OGPI Trend -->
    <div class="grid-2col">
      <!-- Dimensions Scores Card -->
      <div class="glass-card chart-card">
        <div class="card-header">
          <h3><i class="fas fa-chart-pie text-teal"></i> Governance Dimensions Breakdown</h3>
          <span class="sub-info">6 Weighted Areas</span>
        </div>
        <div class="dimensions-list">
          ${GOVERNANCE_DIMENSIONS.map(dim => {
            const dData = cur.dimensions[dim.id];
            const deltaData = analysis.dimensionDeltas[dim.id];
            return `
              <div class="dim-row">
                <div class="dim-info">
                  <span class="dim-name" style="color: ${dim.color};"><i class="fas fa-${dim.icon}"></i> ${dim.name}</span>
                  <span class="dim-weight">Weight: ${dim.weight * 100}%</span>
                </div>
                <div class="dim-score-col">
                  <span class="dim-score-num">${dData.score}</span>
                  <span class="dim-delta ${deltaData.delta >= 0 ? 'text-green' : 'text-red'}">
                    ${deltaData.delta >= 0 ? '+' : ''}${deltaData.delta}
                  </span>
                </div>
                <div class="dim-progress-bg">
                  <div class="dim-progress-fill" style="width: ${dData.score}%; background: ${dim.color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Trend Chart Card -->
      <div class="glass-card chart-card">
        <div class="card-header">
          <h3><i class="fas fa-chart-line text-teal"></i> 3-Year OGPI Historical Trend (12 Quarters)</h3>
          <span class="sub-info">QoQ / YoY Trajectory</span>
        </div>
        <div class="trend-chart-container" id="ogpi-trend-svg-box">
          ${renderOgpiTrendSVG(trendData, quarterId)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders custom SVG Sparkline / Line Chart for 12 Quarters
 */
function renderOgpiTrendSVG(trendData, currentQuarterId) {
  const width = 600;
  const height = 240;
  const padding = 40;

  const scores = trendData.map(d => d.ogpiScore);
  const maxVal = Math.max(100, ...scores);
  const minVal = Math.min(60, ...scores);

  const getX = (i) => padding + (i / (trendData.length - 1)) * (width - padding * 2);
  const getY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);

  const points = trendData.map((d, i) => `${getX(i)},${getY(d.ogpiScore)}`).join(' ');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="custom-svg-chart">
      <!-- Gridlines -->
      <line x1="${padding}" y1="${getY(100)}" x2="${width - padding}" y2="${getY(100)}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${getY(80)}" x2="${width - padding}" y2="${getY(80)}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
      <line x1="${padding}" y1="${getY(60)}" x2="${width - padding}" y2="${getY(60)}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />

      <!-- Area Gradient -->
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#48CAE4" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#48CAE4" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <polygon points="${padding},${height - padding} ${points} ${width - padding},${height - padding}" fill="url(#chartGrad)" />

      <!-- Trend Line -->
      <polyline points="${points}" fill="none" stroke="#48CAE4" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Data Dots -->
      ${trendData.map((d, i) => {
        const cx = getX(i);
        const cy = getY(d.ogpiScore);
        const isSelected = d.quarterId === currentQuarterId;
        return `
          <circle cx="${cx}" cy="${cy}" r="${isSelected ? 7 : 4}" fill="${isSelected ? '#EF476F' : '#48CAE4'}" stroke="#0B132B" stroke-width="2" />
          <text x="${cx}" y="${cy - 12}" fill="${isSelected ? '#EF476F' : '#E0E1DD'}" font-size="10" font-weight="${isSelected ? 'bold' : 'normal'}" text-anchor="middle">
            ${d.ogpiScore}
          </text>
          <text x="${cx}" y="${height - 15}" fill="#8D99AE" font-size="9" text-anchor="middle">
            ${d.quarterId.split('-')[1]}
          </text>
        `;
      }).join('')}
    </svg>
  `;
}

/**
 * Renders TAB 2: Governance Dimensions & KPI Drill-down
 */
export function renderDimensionsView(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const analysis = getComparativeAnalysis(quarterId);
  const cur = analysis.current;

  container.innerHTML = `
    <div class="view-header">
      <h2><i class="fas fa-sitemap text-teal"></i> Governance Dimensions & KPI Metric Workspace</h2>
      <p>Institutional analysis across ~30 key performance indicators spanning 6 governance dimensions.</p>
    </div>

    <!-- Dimension Tabs Filter -->
    <div class="dimension-pills-nav" id="dim-pills-wrapper">
      <button class="dim-pill active" data-dim="all">All Dimensions (~30 KPIs)</button>
      ${GOVERNANCE_DIMENSIONS.map(d => `
        <button class="dim-pill" data-dim="${d.id}" style="border-left: 3px solid ${d.color};">
          <i class="fas fa-${d.icon}"></i> ${d.name} (${cur.dimensions[d.id].score})
        </button>
      `).join('')}
    </div>

    <!-- KPI Grid -->
    <div class="kpi-cards-grid" id="kpi-grid-container">
      ${renderKPICardsList(cur.kpis, 'all')}
    </div>
  `;

  // Attach filter event listeners
  const pills = document.querySelectorAll('.dim-pill');
  pills.forEach(p => {
    p.addEventListener('click', (e) => {
      pills.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const targetDim = e.currentTarget.getAttribute('data-dim');
      document.getElementById('kpi-grid-container').innerHTML = renderKPICardsList(cur.kpis, targetDim);
    });
  });
}

function renderKPICardsList(kpis, filterDim) {
  const filteredList = Object.values(kpis).filter(k => filterDim === 'all' || k.dimension === filterDim);

  return filteredList.map(k => `
    <div class="glass-card kpi-detail-card">
      <div class="kpi-card-top">
        <span class="kpi-dim-tag" style="background: rgba(72,202,228,0.15); color: #48CAE4;">
          ${k.dimension.toUpperCase()}
        </span>
        <span class="badge ${k.status}">${k.status.toUpperCase()} (${k.score}/100)</span>
      </div>
      <h4 class="kpi-title">${k.name}</h4>
      <div class="kpi-metrics-body">
        <div class="metric-val-group">
          <span class="val-big">${k.rawVal} <small>${k.unit}</small></span>
          <span class="target-sub">Target: <strong>${k.target}${k.unit}</strong></span>
        </div>
        <div class="kpi-progress">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${k.score}%; background: ${k.status === 'green' ? '#06D6A0' : k.status === 'amber' ? '#FFD166' : '#EF476F'};"></div>
          </div>
        </div>
      </div>
      <div class="kpi-card-footer">
        <span class="direction-text"><i class="fas fa-compass"></i> Preference: <strong>${k.direction.replace('_', ' ')}</strong></span>
        <span class="weight-text">Weight: ${(k.weight * 100).toFixed(0)}%</span>
      </div>
    </div>
  `).join('');
}

/**
 * Renders TAB 3: ML Anomaly & Predictive Risk Workspace
 */
export function renderMLRiskWorkspace(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const anomalies = detectAnomalies(quarterId);
  const projectRisk = predictProjectDelayRisk(quarterId);
  const forecast = generatePredictiveForecast(quarterId);

  container.innerHTML = `
    <div class="view-header">
      <h2><i class="fas fa-microchip text-teal"></i> ML Anomaly & Predictive Risk Intelligence Engine</h2>
      <p>Isolation Forest statistical anomaly detection + XGBoost delay risk classification model.</p>
    </div>

    <!-- Top Summary Banner -->
    <div class="dashboard-hero-grid">
      <div class="glass-card metric-card">
        <div class="card-header">
          <span class="card-label"><i class="fas fa-tree text-teal"></i> ISOLATION FOREST ANOMALIES</span>
        </div>
        <div class="big-stat text-amber">${anomalies.length} Flagged Metrics</div>
        <p class="sub-text">Outliers exceeding rolling 4-quarter statistical baseline standard deviations.</p>
      </div>

      <div class="glass-card metric-card">
        <div class="card-header">
          <span class="card-label"><i class="fas fa-project-diagram text-amber"></i> XGBOOST PROJECT DELAY RISK</span>
          <span class="badge ${projectRisk.riskLevel.toLowerCase()}">${projectRisk.riskLevel} RISK</span>
        </div>
        <div class="big-stat ${projectRisk.riskLevel === 'HIGH' ? 'text-red' : 'text-green'}">
          ${projectRisk.riskProbability}%
        </div>
        <p class="sub-text">Probability of next-quarter delivery milestone slippage across projects.</p>
      </div>

      <div class="glass-card metric-card">
        <div class="card-header">
          <span class="card-label"><i class="fas fa-chart-line text-teal"></i> FORECAST TRAJECTORY</span>
        </div>
        <div class="big-stat text-teal">${forecast.currentOgpi} → ${forecast.mitigatedOgpi}</div>
        <p class="sub-text">Status Quo Projection: <strong>${forecast.statusQuoOgpi}</strong> | Mitigated Target: <strong>${forecast.mitigatedOgpi}</strong></p>
      </div>
    </div>

    <!-- Anomaly List & Feature Importances Grid -->
    <div class="grid-2col">
      <!-- Isolation Forest Anomalies -->
      <div class="glass-card">
        <div class="card-header">
          <h3><i class="fas fa-exclamation-triangle text-amber"></i> Isolation Forest Detected Outliers</h3>
          <span class="sub-info">${quarterId} Review</span>
        </div>
        <div class="anomalies-list">
          ${anomalies.length === 0 ? '<p class="text-muted">No high-severity metric anomalies detected in this quarter.</p>' : ''}
          ${anomalies.map(a => `
            <div class="anomaly-item">
              <div class="anomaly-top">
                <span class="anomaly-name"><strong>${a.kpiName}</strong> (${a.dimension.toUpperCase()})</span>
                <span class="badge ${a.severity === 'Critical' ? 'red' : 'amber'}">${a.severity.toUpperCase()}</span>
              </div>
              <p class="anomaly-exp">${a.explanation}</p>
              <div class="anomaly-stats">
                <span>Current: <strong>${a.currentValue}${a.unit}</strong></span>
                <span>Baseline Mean: <strong>${a.baselineMean}${a.unit}</strong></span>
                <span>Isolation Score: <strong class="text-teal">${a.isolationScore}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- XGBoost Risk Classification Breakdown -->
      <div class="glass-card">
        <div class="card-header">
          <h3><i class="fas fa-brain text-teal"></i> XGBoost Model Feature Importances</h3>
          <span class="sub-info">Predictors of Project Delay</span>
        </div>
        <div class="feature-importance-list">
          ${projectRisk.featureImportances.map(f => `
            <div class="feature-row">
              <div class="feature-info">
                <span class="feat-name">${f.feature} (${f.value})</span>
                <span class="feat-weight">Contrib: ${f.contribution}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${Math.min(100, f.contribution * 2)}%; background: #48CAE4;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders TAB 4: AI Analyst & RAG Policy Search
 */
export function renderAIRAGWorkspace(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const summary = generateAIExecutiveSummary(quarterId);
  const defaultDocs = searchRAGDocuments('');

  container.innerHTML = `
    <div class="view-header">
      <h2><i class="fas fa-robot text-teal"></i> AWS Bedrock AI Governance Analyst & RAG Assistant</h2>
      <p>Generates verified narrative explanations of numbers and searches institutional policy vector DB.</p>
    </div>

    <!-- AI Executive Narrative Card -->
    <div class="glass-card ai-narrative-box">
      <div class="card-header">
        <h3><i class="fas fa-quote-left text-teal"></i> Executive AI Governance Briefing (${quarterId})</h3>
        <span class="badge blue"><i class="fas fa-check-circle"></i> VERIFIED BY DETERMINISTIC ENGINE</span>
      </div>
      
      <div class="narrative-section">
        <h4>Executive Verdict</h4>
        <p class="verdict-text">${summary.executiveVerdict}</p>
      </div>

      <div class="grid-2col margin-v">
        <div class="narrative-box-inner">
          <h4>Key Concern Diagnosis</h4>
          <p><strong>${summary.keyConcern.title}</strong>: ${summary.keyConcern.details}</p>
        </div>

        <div class="narrative-box-inner">
          <h4>ML Risk & Anomaly Summary</h4>
          <p>${summary.aiInsight.summary}</p>
        </div>
      </div>

      <div class="narrative-section">
        <h4>Prioritized Strategic Recommendations</h4>
        <ul class="recommendation-list">
          ${summary.recommendations.map(r => `<li><i class="fas fa-chevron-right text-teal"></i> ${r}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Interactive AI Assistant & RAG Search Grid -->
    <div class="grid-2col margin-v">
      <!-- Interactive Prompt Assistant -->
      <div class="glass-card">
        <div class="card-header">
          <h3><i class="fas fa-comments text-teal"></i> Interactive AI Governance Assistant</h3>
          <span class="sub-info">Ask questions regarding ${quarterId} metrics</span>
        </div>

        <div class="chat-messages-container" id="ai-chat-box">
          <div class="chat-msg assistant">
            <div class="msg-author"><i class="fas fa-robot"></i> ORGINTEL AI Analyst</div>
            <div class="msg-text">Hello! Ask me anything about the ${quarterId} governance scores, metric anomalies, or institutional policies.</div>
          </div>
        </div>

        <div class="chat-input-row">
          <input type="text" id="ai-user-input" class="chat-input-field" placeholder="e.g. What caused the People Governance drop?" />
          <button id="ai-send-btn" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Ask AI</button>
        </div>
      </div>

      <!-- Institutional RAG Search -->
      <div class="glass-card">
        <div class="card-header">
          <h3><i class="fas fa-search text-teal"></i> Institutional RAG Vector Search</h3>
          <span class="sub-info">Policy & Governance Docs</span>
        </div>

        <div class="rag-search-bar">
          <input type="text" id="rag-query-input" class="chat-input-field" placeholder="Search policies (e.g. Attrition SOP, Project Delay)..." />
        </div>

        <div class="rag-results-container" id="rag-results-box">
          ${renderRAGDocCards(defaultDocs)}
        </div>
      </div>
    </div>
  `;

  // Attach RAG Search listener
  const ragInput = document.getElementById('rag-query-input');
  if (ragInput) {
    ragInput.addEventListener('input', (e) => {
      const results = searchRAGDocuments(e.target.value);
      document.getElementById('rag-results-box').innerHTML = renderRAGDocCards(results);
    });
  }

  // Attach Chat Assistant listener
  const sendBtn = document.getElementById('ai-send-btn');
  const chatInput = document.getElementById('ai-user-input');
  
  const handleChatSend = () => {
    const val = chatInput.value.trim();
    if (!val) return;

    const chatBox = document.getElementById('ai-chat-box');

    // Add user message
    chatBox.innerHTML += `
      <div class="chat-msg user">
        <div class="msg-author"><i class="fas fa-user"></i> Executive</div>
        <div class="msg-text">${val}</div>
      </div>
    `;

    chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Simulate AI response
    setTimeout(() => {
      import('./ai_rag.js').then(module => {
        const response = module.queryAIAssistant(val, quarterId);
        chatBox.innerHTML += `
          <div class="chat-msg assistant">
            <div class="msg-author"><i class="fas fa-robot"></i> ORGINTEL AI Analyst</div>
            <div class="msg-text">${response.answer.replace(/\n/g, '<br>')}</div>
          </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
      });
    }, 400);
  };

  sendBtn?.addEventListener('click', handleChatSend);
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
  });
}

function renderRAGDocCards(docs) {
  return docs.map(doc => `
    <div class="rag-doc-card">
      <div class="rag-doc-header">
        <span class="rag-id"><strong>[${doc.id}]</strong> ${doc.title}</span>
        <span class="badge blue">Score: ${(doc.matchScore * 100).toFixed(0)}%</span>
      </div>
      <p class="rag-snippet">"${doc.snippet}"</p>
      <div class="rag-footer">
        <span class="rag-cat"><i class="fas fa-folder"></i> Category: ${doc.category}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Renders TAB 5: Management Action & Closed-Loop Impact Board
 */
export function renderActionBoardView(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const actions = getAllActions();
  const closedLoopSimulation = simulateClosedLoopImpact("2026-Q2", "2026-Q3");

  container.innerHTML = `
    <div class="view-header flex-between">
      <div>
        <h2><i class="fas fa-tasks text-teal"></i> Management Action & Closed-Loop Impact Board</h2>
        <p>Track decisions to actions and simulate Q2 Action → Q3 OGPI Score Recovery.</p>
      </div>
      <button id="btn-create-action" class="btn btn-success"><i class="fas fa-plus-circle"></i> Create New Action</button>
    </div>

    <!-- Hero Impact Simulation Card -->
    <div class="glass-card impact-hero-card">
      <div class="card-header">
        <h3><i class="fas fa-bolt text-amber"></i> Closed-Loop Impact Simulator (Q2 Action → Q3 Recovery)</h3>
        <span class="badge green">CLOSED-LOOP VERIFICATION</span>
      </div>

      <div class="impact-comparison-grid">
        <div class="impact-box">
          <span class="imp-label">Baseline Q3 OGPI Score</span>
          <span class="imp-val text-amber">${closedLoopSimulation.baselineOgpi} / 100</span>
          <span class="imp-sub">Pre-intervention status quo</span>
        </div>

        <div class="impact-arrow">
          <i class="fas fa-arrow-right fa-2x text-teal"></i>
          <span class="badge outline">+ Active Actions: ${closedLoopSimulation.activeActionsCount}</span>
        </div>

        <div class="impact-box">
          <span class="imp-label">Simulated Q3 OGPI Score</span>
          <span class="imp-val text-green">${closedLoopSimulation.simulatedOgpi} / 100</span>
          <span class="imp-sub">Post-intervention recovery</span>
        </div>

        <div class="impact-box highlight">
          <span class="imp-label">Net OGPI Impact Boost</span>
          <span class="imp-val text-teal">${closedLoopSimulation.ogpiGain} Points</span>
          <span class="imp-sub">Calculated Recovery Delta</span>
        </div>
      </div>
    </div>

    <!-- Actions List Table -->
    <div class="glass-card margin-v">
      <div class="card-header">
        <h3><i class="fas fa-list-check text-teal"></i> Registered Management Actions (${actions.length})</h3>
      </div>

      <div class="actions-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Quarter</th>
              <th>Action Title & Owner</th>
              <th>Dimension</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Target Recovery Impact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${actions.map(a => `
              <tr>
                <td><strong>${a.id}</strong></td>
                <td>${a.quarter}</td>
                <td>
                  <div class="action-title-cell">
                    <strong>${a.title}</strong>
                    <small class="text-muted"><i class="fas fa-user-tie"></i> ${a.owner}</small>
                  </div>
                </td>
                <td><span class="dim-tag">${a.dimension.toUpperCase()}</span></td>
                <td><span class="badge ${a.priority === 'Critical' ? 'red' : 'amber'}">${a.priority}</span></td>
                <td>
                  <select class="status-select-dropdown" data-id="${a.id}">
                    <option value="Draft" ${a.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="Approved" ${a.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="In Progress" ${a.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${a.status === 'Completed' ? 'selected' : ''}>Completed</option>
                  </select>
                </td>
                <td><strong class="text-green">${a.projectedImpact ? a.projectedImpact.ogpiImpact : 'N/A'}</strong></td>
                <td>
                  <button class="btn btn-sm btn-outline view-act-btn" data-id="${a.id}"><i class="fas fa-eye"></i> Details</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach status change listeners
  const statusSelects = document.querySelectorAll('.status-select-dropdown');
  statusSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const actId = e.target.getAttribute('data-id');
      updateActionStatus(actId, e.target.value);
      renderActionBoardView(quarterId);
    });
  });

  // Attach modal popup for new action
  document.getElementById('btn-create-action')?.addEventListener('click', () => {
    openCreateActionModal(quarterId);
  });
}

function openCreateActionModal(currentQuarterId) {
  const modalHtml = `
    <div class="modal-overlay" id="action-modal">
      <div class="modal-card glass-card">
        <div class="modal-header">
          <h3><i class="fas fa-plus-circle text-teal"></i> Create Management Remediation Action</h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Action Title</label>
            <input type="text" id="form-act-title" class="chat-input-field" placeholder="e.g. Employee Upskilling & Compensation Buffer Plan" />
          </div>
          <div class="grid-2col">
            <div class="form-group">
              <label>Dimension</label>
              <select id="form-act-dim" class="quarter-dropdown">
                <option value="hr">People & HR Governance</option>
                <option value="operations">Project & Execution</option>
                <option value="finance">Finance & Budget</option>
                <option value="compliance">Risk & Compliance</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select id="form-act-priority" class="quarter-dropdown">
                <option value="High">High</option>
                <option value="Critical">Critical</option>
                <option value="Medium">Medium</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Description & Scope</label>
            <textarea id="form-act-desc" class="chat-input-field" rows="3" placeholder="Specify targeted interventions to mitigate metric risks..."></textarea>
          </div>
        </div>
        <div class="modal-footer flex-end">
          <button class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button class="btn btn-success" id="modal-submit"><i class="fas fa-check"></i> Save & Activate Action</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const closeModal = () => {
    document.getElementById('action-modal')?.remove();
  };

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  document.getElementById('modal-submit')?.addEventListener('click', () => {
    const title = document.getElementById('form-act-title').value.trim();
    if (!title) return alert('Please enter an action title');

    createAction({
      quarter: currentQuarterId,
      dimension: document.getElementById('form-act-dim').value,
      priority: document.getElementById('form-act-priority').value,
      title,
      description: document.getElementById('form-act-desc').value,
      projectedImpact: {
        targetQuarter: '2026-Q3',
        ogpiImpact: '+5.4 points recovery'
      }
    });

    closeModal();
    renderActionBoardView(currentQuarterId);
  });
}

/**
 * Renders TAB 6: Data Ingestion & Quarterly Institutional Report
 */
export function renderDataAndReportView(quarterId) {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const analysis = getComparativeAnalysis(quarterId);
  const summary = generateAIExecutiveSummary(quarterId);

  container.innerHTML = `
    <div class="view-header flex-between">
      <div>
        <h2><i class="fas fa-file-invoice text-teal"></i> Data Ingestion & Quarterly Governance Report</h2>
        <p>Institutional assessment documentation ready for board presentation and print export.</p>
      </div>
      <button id="btn-print-report" class="btn btn-primary"><i class="fas fa-print"></i> Print / Export Report PDF</button>
    </div>

    <!-- CSV Data Upload Simulation Box -->
    <div class="glass-card margin-v">
      <div class="card-header">
        <h3><i class="fas fa-file-upload text-teal"></i> Enterprise Data Upload Center (CSV / Excel Ingestion)</h3>
        <span class="sub-info">Ingest Quarterly Data Feed</span>
      </div>
      <div class="upload-dropzone" id="dropzone-box">
        <i class="fas fa-cloud-upload-alt fa-3x text-teal"></i>
        <h4>Drag & Drop Enterprise Dataset (CSV/XLSX) or Click to Upload</h4>
        <p class="sub-text">Supported fields: 30+ KPI metrics across HR, Finance, Operations, Customer, and Risk.</p>
        <button class="btn btn-outline margin-v" id="btn-simulate-upload"><i class="fas fa-folder-open"></i> Select Synthetic Enterprise CSV</button>
      </div>
      <div id="upload-status-msg" class="text-green text-center margin-v"></div>
    </div>

    <!-- Official Printable Institutional Governance Report Container -->
    <div class="glass-card printable-report-card" id="printable-report">
      <div class="report-header-banner">
        <div class="rep-brand">
          <h2>${PROJECT_METADATA.name}</h2>
          <span>${PROJECT_METADATA.tagline}</span>
        </div>
        <div class="rep-meta">
          <span>Project Code: <strong>${PROJECT_METADATA.id}</strong></span>
          <span>Cadence: <strong>${quarterId}</strong></span>
          <span>Date: <strong>${new Date().toLocaleDateString()}</strong></span>
        </div>
      </div>

      <div class="rep-team-box">
        <h4>INSTITUTIONAL PROJECT TEAM</h4>
        <div class="team-grid">
          ${PROJECT_METADATA.team.map(t => `
            <div class="team-member-item">
              <strong>${t.name}</strong>
              <span>ID: ${t.id}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="rep-section">
        <h3>1. Executive Governance Summary & OGPI Index</h3>
        <div class="rep-score-row">
          <div class="rep-score-box">
            <span class="lbl">OVERALL OGPI SCORE</span>
            <span class="val">${analysis.ogpi.score} / 100</span>
          </div>
          <div class="rep-score-box">
            <span class="lbl">QoQ CHANGE</span>
            <span class="val">${analysis.ogpi.qoqPct}%</span>
          </div>
          <div class="rep-score-box">
            <span class="lbl">STATUS</span>
            <span class="val">${analysis.current.status.toUpperCase()}</span>
          </div>
        </div>
        <p class="rep-verdict"><strong>Verdict:</strong> ${summary.executiveVerdict}</p>
      </div>

      <div class="rep-section">
        <h3>2. Governance Dimension Scores</h3>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Weight</th>
              <th>Score (/100)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${GOVERNANCE_DIMENSIONS.map(d => `
              <tr>
                <td>${d.name}</td>
                <td>${d.weight * 100}%</td>
                <td><strong>${analysis.current.dimensions[d.id].score}</strong></td>
                <td><span class="badge ${analysis.current.dimensions[d.id].status}">${analysis.current.dimensions[d.id].status.toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="rep-section">
        <h3>3. AI Analyst Verdict & Recommendations</h3>
        <p><strong>Primary Key Concern:</strong> ${summary.keyConcern.title} (${summary.keyConcern.details})</p>
        <p><strong>AI Recommendations:</strong></p>
        <ul>
          ${summary.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="report-footer">
        <span>${PROJECT_METADATA.footer}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;

  // Attach Print Handler
  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    window.print();
  });

  // Attach Upload Simulation
  document.getElementById('btn-simulate-upload')?.addEventListener('click', () => {
    const statusBox = document.getElementById('upload-status-msg');
    statusBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingesting synthetic enterprise CSV dataset...';
    setTimeout(() => {
      statusBox.innerHTML = '<i class="fas fa-check-circle"></i> Successfully ingested 36 months / 12 quarters of synthetic enterprise data! All metrics updated.';
    }, 800);
  });
}
