/**
 * ORGINTEL (PRJ_637) - Analytics & OGPI Scoring Engine
 * Deterministic mathematical calculation of KPI scores, dimension averages,
 * Overall Governance Performance Index (OGPI), QoQ / YoY deltas, and status alerts.
 */

import { KPI_MASTER, GOVERNANCE_DIMENSIONS, QUARTERS, QUARTERLY_KPI_DATA } from './data.js';

/**
 * Normalizes a raw KPI value to a 0-100 score scale
 */
export function calculateKPIScore(kpiDef, rawVal) {
  if (rawVal === undefined || rawVal === null) return 50;

  const { target, direction, min, max } = kpiDef;
  let score = 0;

  if (direction === 'higher_is_better') {
    if (rawVal >= target) {
      // Score between 85 and 100
      const bonusRange = Math.max(1, max - target);
      score = 85 + Math.min(15, ((rawVal - target) / bonusRange) * 15);
    } else {
      // Score drops from 85 down to 0
      const lowerRange = Math.max(1, target - min);
      score = Math.max(0, (rawVal - min) / lowerRange * 85);
    }
  } else {
    // lower_is_better (e.g. attrition, project delay count, vulnerabilities)
    if (rawVal <= target) {
      const bonusRange = Math.max(0.1, target - min);
      score = 85 + Math.min(15, ((target - rawVal) / bonusRange) * 15);
    } else {
      const upperRange = Math.max(0.1, max - target);
      score = Math.max(0, 85 - ((rawVal - target) / upperRange) * 85);
    }
  }

  return Math.round(score * 10) / 10;
}

/**
 * Computes full analysis for a specific quarter
 */
export function analyzeQuarter(quarterId, customKpiData = null) {
  const rawData = customKpiData || QUARTERLY_KPI_DATA[quarterId] || QUARTERLY_KPI_DATA["2026-Q2"];
  
  const kpiScores = {};
  const dimensionScores = {};
  let totalWeightedOgpi = 0;

  // Initialize dimension accumulators
  GOVERNANCE_DIMENSIONS.forEach(dim => {
    dimensionScores[dim.id] = {
      dimId: dim.id,
      name: dim.name,
      weight: dim.weight,
      color: dim.color,
      totalWeightedScore: 0,
      totalWeight: 0,
      kpis: []
    };
  });

  // Calculate each KPI score and aggregate into dimensions
  KPI_MASTER.forEach(kpi => {
    const rawVal = rawData[kpi.id];
    const score = calculateKPIScore(kpi, rawVal);
    const status = score >= 80 ? 'green' : score >= 65 ? 'amber' : 'red';

    const kpiResult = {
      ...kpi,
      rawVal,
      score,
      status
    };

    kpiScores[kpi.id] = kpiResult;

    if (dimensionScores[kpi.dimension]) {
      dimensionScores[kpi.dimension].totalWeightedScore += score * kpi.weight;
      dimensionScores[kpi.dimension].totalWeight += kpi.weight;
      dimensionScores[kpi.dimension].kpis.push(kpiResult);
    }
  });

  // Calculate final dimension scores and overall OGPI
  const dimensionSummary = {};
  GOVERNANCE_DIMENSIONS.forEach(dim => {
    const d = dimensionScores[dim.id];
    const dimFinalScore = d.totalWeight > 0 ? Math.round((d.totalWeightedScore / d.totalWeight) * 10) / 10 : 0;
    
    dimensionSummary[dim.id] = {
      ...d,
      score: dimFinalScore,
      status: dimFinalScore >= 80 ? 'green' : dimFinalScore >= 65 ? 'amber' : 'red'
    };

    totalWeightedOgpi += dimFinalScore * dim.weight;
  });

  const ogpiScore = Math.round(totalWeightedOgpi * 10) / 10;

  return {
    quarterId,
    ogpiScore,
    status: ogpiScore >= 80 ? 'green' : ogpiScore >= 65 ? 'amber' : 'red',
    dimensions: dimensionSummary,
    kpis: kpiScores
  };
}

/**
 * Calculates QoQ and YoY comparisons across quarters
 */
export function getComparativeAnalysis(currentQuarterId) {
  const currentAnalysis = analyzeQuarter(currentQuarterId);
  const quarterIndex = QUARTERS.findIndex(q => q.id === currentQuarterId);

  // Previous quarter (QoQ)
  let prevQuarterId = null;
  if (quarterIndex > 0) {
    prevQuarterId = QUARTERS[quarterIndex - 1].id;
  }
  const prevAnalysis = prevQuarterId ? analyzeQuarter(prevQuarterId) : null;

  // Same quarter last year (YoY)
  let yoyQuarterId = null;
  if (quarterIndex >= 4) {
    yoyQuarterId = QUARTERS[quarterIndex - 4].id;
  }
  const yoyAnalysis = yoyQuarterId ? analyzeQuarter(yoyQuarterId) : null;

  // Calculate OGPI Deltas
  let qoqDelta = null;
  let qoqPct = null;
  if (prevAnalysis) {
    qoqDelta = Math.round((currentAnalysis.ogpiScore - prevAnalysis.ogpiScore) * 10) / 10;
    qoqPct = Math.round(((currentAnalysis.ogpiScore - prevAnalysis.ogpiScore) / prevAnalysis.ogpiScore) * 1000) / 10;
  }

  let yoyDelta = null;
  let yoyPct = null;
  if (yoyAnalysis) {
    yoyDelta = Math.round((currentAnalysis.ogpiScore - yoyAnalysis.ogpiScore) * 10) / 10;
    yoyPct = Math.round(((currentAnalysis.ogpiScore - yoyAnalysis.ogpiScore) / yoyAnalysis.ogpiScore) * 1000) / 10;
  }

  // Dimension Deltas
  const dimensionDeltas = {};
  GOVERNANCE_DIMENSIONS.forEach(dim => {
    const curDim = currentAnalysis.dimensions[dim.id].score;
    const prevDim = prevAnalysis ? prevAnalysis.dimensions[dim.id].score : curDim;
    const delta = Math.round((curDim - prevDim) * 10) / 10;
    dimensionDeltas[dim.id] = {
      current: curDim,
      previous: prevDim,
      delta: delta,
      direction: delta >= 0 ? 'up' : 'down'
    };
  });

  return {
    currentQuarterId,
    current: currentAnalysis,
    previous: prevAnalysis,
    yoy: yoyAnalysis,
    ogpi: {
      score: currentAnalysis.ogpiScore,
      prevScore: prevAnalysis ? prevAnalysis.ogpiScore : null,
      qoqDelta,
      qoqPct,
      yoyDelta,
      yoyPct
    },
    dimensionDeltas
  };
}

/**
 * Returns multi-quarter trend series for charts
 */
export function getOgpiTrendSeries() {
  return QUARTERS.map(q => {
    const analysis = analyzeQuarter(q.id);
    return {
      quarterId: q.id,
      label: q.label,
      ogpiScore: analysis.ogpiScore,
      hr: analysis.dimensions.hr.score,
      finance: analysis.dimensions.finance.score,
      operations: analysis.dimensions.operations.score,
      customer: analysis.dimensions.customer.score,
      compliance: analysis.dimensions.compliance.score,
      strategy: analysis.dimensions.strategy.score
    };
  });
}
