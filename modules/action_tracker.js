/**
 * ORGINTEL (PRJ_637) - Management Action & Closed-Loop Impact Tracker
 * Closed-Loop Workflow: Measure -> Diagnose -> Predict -> Decide -> Act -> Impact
 * Tracks decision-to-action lifecycles and simulates Q2 Action -> Q3 OGPI recovery impact.
 */

import { INITIAL_MANAGEMENT_ACTIONS, QUARTERLY_KPI_DATA } from './data.js';
import { analyzeQuarter } from './analytics.js';

let actionsStore = [...INITIAL_MANAGEMENT_ACTIONS];

/**
 * Retrieves all registered management actions
 */
export function getAllActions() {
  return actionsStore;
}

/**
 * Retrieves actions for a specific quarter
 */
export function getActionsByQuarter(quarterId) {
  return actionsStore.filter(a => a.quarter === quarterId);
}

/**
 * Creates a new management action item
 */
export function createAction(actionData) {
  const newAction = {
    id: `ACT-${new Date().getFullYear()}-${String(actionsStore.length + 1).padStart(3, '0')}`,
    quarter: actionData.quarter || '2026-Q2',
    dimension: actionData.dimension || 'hr',
    title: actionData.title,
    owner: actionData.owner || 'Executive Governance Team',
    priority: actionData.priority || 'High',
    status: actionData.status || 'In Progress',
    targetDate: actionData.targetDate || '2026-08-30',
    description: actionData.description,
    projectedImpact: actionData.projectedImpact || {
      targetQuarter: '2026-Q3',
      kpiUpdates: {
        hr_attrition: 7.8,
        hr_retention: 92.5,
        op_milestone_on_time: 88.0,
        op_project_delay_risk: 2
      },
      ogpiImpact: '+6.8 points recovery'
    },
    createdAt: new Date().toISOString()
  };

  actionsStore.unshift(newAction);
  return newAction;
}

/**
 * Updates action status (e.g., Draft -> Approved -> In Progress -> Completed)
 */
export function updateActionStatus(actionId, newStatus) {
  const action = actionsStore.find(a => a.id === actionId);
  if (action) {
    action.status = newStatus;
  }
  return action;
}

/**
 * Simulates Closed-Loop Management Impact:
 * Takes Q2 management actions and applies them to Q3 metrics,
 * returning the before-and-after OGPI recovery score!
 */
export function simulateClosedLoopImpact(sourceQuarterId = "2026-Q2", targetQuarterId = "2026-Q3") {
  // Baseline Q3 calculation before action intervention
  const baselineQ3 = analyzeQuarter(targetQuarterId);

  // Active actions originating in source quarter
  const activeActions = actionsStore.filter(a => a.quarter === sourceQuarterId && (a.status === 'In Progress' || a.status === 'Completed' || a.status === 'Approved'));

  // Clone raw Q3 data
  const modifiedQ3Data = { ...QUARTERLY_KPI_DATA[targetQuarterId] };

  // Apply metric improvements defined by active actions
  activeActions.forEach(action => {
    if (action.projectedImpact && action.projectedImpact.kpiUpdates) {
      Object.entries(action.projectedImpact.kpiUpdates).forEach(([kpiId, newVal]) => {
        modifiedQ3Data[kpiId] = newVal;
      });
    }
  });

  // Calculate post-intervention Q3 analysis
  const postInterventionQ3 = analyzeQuarter(targetQuarterId, modifiedQ3Data);

  const ogpiGain = Math.round((postInterventionQ3.ogpiScore - baselineQ3.ogpiScore) * 10) / 10;

  return {
    sourceQuarterId,
    targetQuarterId,
    activeActionsCount: activeActions.length,
    baselineOgpi: baselineQ3.ogpiScore,
    simulatedOgpi: postInterventionQ3.ogpiScore,
    ogpiGain: ogpiGain > 0 ? `+${ogpiGain}` : `${ogpiGain}`,
    baselineAnalysis: baselineQ3,
    simulatedAnalysis: postInterventionQ3,
    actionsApplied: activeActions
  };
}
