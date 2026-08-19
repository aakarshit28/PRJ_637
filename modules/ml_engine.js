/**
 * ORGINTEL (PRJ_637) - Machine Learning & Anomaly Engine
 * 1. Isolation Forest Anomaly Detection simulation
 * 2. XGBoost Project Delay & Operational Risk Classification
 * 3. Next-Quarter Predictive Trend Forecasting
 */

import { KPI_MASTER, QUARTERS, QUARTERLY_KPI_DATA } from './data.js';
import { analyzeQuarter, getOgpiTrendSeries } from './analytics.js';

/**
 * Runs Isolation Forest anomaly detection on quarterly KPI metrics.
 * Identifies statistical outliers comparing current metrics against historical rolling baselines.
 */
export function detectAnomalies(quarterId) {
  const currentData = QUARTERLY_KPI_DATA[quarterId] || QUARTERLY_KPI_DATA["2026-Q2"];
  const qIndex = QUARTERS.findIndex(q => q.id === quarterId);

  // Compute rolling baseline averages across previous quarters
  const historicalQuarters = QUARTERS.slice(Math.max(0, qIndex - 4), qIndex);
  
  const anomalies = [];

  KPI_MASTER.forEach(kpi => {
    const curVal = currentData[kpi.id];
    if (curVal === undefined) return;

    if (historicalQuarters.length === 0) return;

    // Calculate historical mean and standard deviation
    const histVals = historicalQuarters.map(q => QUARTERLY_KPI_DATA[q.id]?.[kpi.id] || curVal);
    const mean = histVals.reduce((sum, v) => sum + v, 0) / histVals.length;
    const variance = histVals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / histVals.length;
    const stdDev = Math.sqrt(variance) || 0.1;

    // Calculate statistical z-score distance
    const zScore = Math.abs(curVal - mean) / stdDev;
    
    // Anomaly score formula simulating Isolation Forest tree path length
    const isolationScore = Math.min(0.99, Math.round((1 - (1 / (1 + (zScore / 2)))) * 100) / 100);

    // Is it an anomaly?
    if (isolationScore >= 0.55 || (kpi.direction === 'lower_is_better' && curVal > kpi.target * 1.3) || (kpi.direction === 'higher_is_better' && curVal < kpi.target * 0.8)) {
      const isNegative = (kpi.direction === 'lower_is_better' && curVal > mean) || (kpi.direction === 'higher_is_better' && curVal < mean);
      
      anomalies.push({
        kpiId: kpi.id,
        kpiName: kpi.name,
        dimension: kpi.dimension,
        currentValue: curVal,
        baselineMean: Math.round(mean * 10) / 10,
        unit: kpi.unit,
        zScore: Math.round(zScore * 10) / 10,
        isolationScore,
        severity: isolationScore >= 0.85 ? 'Critical' : isolationScore >= 0.70 ? 'High' : 'Moderate',
        isNegative,
        explanation: `${kpi.name} shifted from baseline ${Math.round(mean * 10) / 10}${kpi.unit} to ${curVal}${kpi.unit} (Anomaly Score: ${isolationScore})`
      });
    }
  });

  return anomalies.sort((a, b) => b.isolationScore - a.isolationScore);
}

/**
 * Runs XGBoost risk classification model for project delay risk & workforce risk
 */
export function predictProjectDelayRisk(quarterId) {
  const data = QUARTERLY_KPI_DATA[quarterId] || QUARTERLY_KPI_DATA["2026-Q2"];
  
  // Key predictors for delay risk
  const attrition = data.hr_attrition || 8.0;
  const delayedProjects = data.op_project_delay_risk || 2;
  const milestoneDelivery = data.op_milestone_on_time || 88.0;
  const slaCompliance = data.op_sla_compliance || 95.0;
  const budgetVar = data.fin_budget_var || 2.0;

  // Feature weights simulating XGBoost decision tree ensemble
  const attritionWeight = Math.max(0, (attrition - 8.0) * 0.08);
  const delayedProjWeight = Math.max(0, (delayedProjects - 1) * 0.10);
  const milestoneWeight = Math.max(0, (88.0 - milestoneDelivery) * 0.04);
  const slaWeight = Math.max(0, (95.0 - slaCompliance) * 0.03);

  // Combined probability (sigmoid function simulation)
  const rawLogit = -1.8 + (attritionWeight * 3.5) + (delayedProjWeight * 2.8) + (milestoneWeight * 2.2) + (slaWeight * 1.5);
  const riskProbability = Math.round((1 / (1 + Math.exp(-rawLogit))) * 1000) / 10; // %

  const riskLevel = riskProbability >= 70 ? 'HIGH' : riskProbability >= 40 ? 'MEDIUM' : 'LOW';

  // Feature importances
  const featureImportances = [
    { feature: 'People Attrition Rate', contribution: Math.round(attritionWeight * 45), value: `${attrition}%` },
    { feature: 'Milestone Delivery Drop', contribution: Math.round(milestoneWeight * 35), value: `${milestoneDelivery}%` },
    { feature: 'Active Delayed Projects', contribution: Math.round(delayedProjWeight * 30), value: `${delayedProjects} projects` },
    { feature: 'SLA Compliance Slippage', contribution: Math.round(slaWeight * 20), value: `${slaCompliance}%` }
  ].sort((a, b) => b.contribution - a.contribution);

  return {
    quarterId,
    riskProbability,
    riskLevel,
    delayedProjectCount: delayedProjects,
    riskSummary: `XGBoost model evaluates next-quarter project delivery delay risk at ${riskProbability}% (${riskLevel} RISK)`,
    featureImportances
  };
}

/**
 * Predicts next-quarter OGPI and dimension trajectories (Status Quo vs Mitigated)
 */
export function generatePredictiveForecast(currentQuarterId) {
  const currentAnalysis = analyzeQuarter(currentQuarterId);
  const qIndex = QUARTERS.findIndex(q => q.id === currentQuarterId);
  const anomalies = detectAnomalies(currentQuarterId);
  const projectRisk = predictProjectDelayRisk(currentQuarterId);

  // Status Quo trajectory (if no corrective action is taken)
  let statusQuoOgpi = currentAnalysis.ogpiScore;
  if (projectRisk.riskLevel === 'HIGH') {
    statusQuoOgpi = Math.max(50, Math.round((currentAnalysis.ogpiScore - 6.4) * 10) / 10);
  } else if (projectRisk.riskLevel === 'MEDIUM') {
    statusQuoOgpi = Math.max(50, Math.round((currentAnalysis.ogpiScore - 2.8) * 10) / 10);
  } else {
    statusQuoOgpi = Math.min(100, Math.round((currentAnalysis.ogpiScore + 1.2) * 10) / 10);
  }

  // Mitigated trajectory (with planned management action)
  const mitigatedOgpi = Math.min(100, Math.round((currentAnalysis.ogpiScore + 4.8) * 10) / 10);

  const nextQuarterLabel = qIndex < QUARTERS.length - 1 ? QUARTERS[qIndex + 1].label : "2027 Q1";

  return {
    currentQuarterId,
    nextQuarterLabel,
    currentOgpi: currentAnalysis.ogpiScore,
    statusQuoOgpi,
    mitigatedOgpi,
    potentialGain: Math.round((mitigatedOgpi - statusQuoOgpi) * 10) / 10,
    anomaliesCount: anomalies.length,
    projectRisk
  };
}
