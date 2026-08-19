/**
 * ORGINTEL (PRJ_637) - Main Application Controller & Orchestrator
 * Connects state, quarter selection, tab routing, and component renderers.
 */

import {
  renderHeaderBar,
  renderExecutiveDashboard,
  renderDimensionsView,
  renderMLRiskWorkspace,
  renderAIRAGWorkspace,
  renderActionBoardView,
  renderDataAndReportView
} from './modules/ui_components.js';

// Application State
const state = {
  currentQuarterId: '2026-Q2', // Default quarter matching Slide 4 example!
  activeTab: 'dashboard'
};

/**
 * Renders active view based on tab state
 */
function renderActiveView() {
  const { activeTab, currentQuarterId } = state;

  switch (activeTab) {
    case 'dashboard':
      renderExecutiveDashboard(currentQuarterId);
      break;
    case 'dimensions':
      renderDimensionsView(currentQuarterId);
      break;
    case 'ml-risk':
      renderMLRiskWorkspace(currentQuarterId);
      break;
    case 'ai-rag':
      renderAIRAGWorkspace(currentQuarterId);
      break;
    case 'action-board':
      renderActionBoardView(currentQuarterId);
      break;
    case 'reports':
      renderDataAndReportView(currentQuarterId);
      break;
    default:
      renderExecutiveDashboard(currentQuarterId);
  }
}

/**
 * Handles quarter change event
 */
function onQuarterChange(newQuarterId) {
  state.currentQuarterId = newQuarterId;
  renderHeaderBar(state.currentQuarterId, onQuarterChange);
  renderActiveView();
}

/**
 * Setup navigation listeners
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      navButtons.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');

      const targetTab = targetBtn.getAttribute('data-tab');
      state.activeTab = targetTab;
      renderActiveView();
    });
  });
}

/**
 * Application Bootstrap Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Header Bar
  renderHeaderBar(state.currentQuarterId, onQuarterChange);

  // Initialize Navigation
  setupNavigation();

  // Render Default View (Executive Dashboard)
  renderActiveView();

  console.log("ORGINTEL (PRJ_637) initialized successfully.");
});
