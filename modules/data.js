/**
 * ORGINTEL (PRJ_637) - Data Foundation Module
 * 3-Year Enterprise Synthetic Dataset (36 Months / 12 Quarters)
 * Covers ~30 KPIs across 6 Governance Dimensions + RAG Documents + Action Repository
 */

export const PROJECT_METADATA = {
  id: "PRJ_637",
  name: "ORGINTEL",
  tagline: "AI-Powered Institutional Governance & Performance Intelligence",
  assessment: "Digital Governance Performance Assessment",
  team: [
    { name: "AAKARSHIT GUPTA", id: "20231CSE0202" },
    { name: "DIKSHA TRIPATHI", id: "20231CSE0201" },
    { name: "ADITHI K", id: "20231CSE0209" }
  ],
  cadence: "Quarterly Assessment (3 Years / 12 Quarters)",
  footer: "Quarterly Organizational Governance • AI Reporting • Executive Dashboards"
};

export const GOVERNANCE_DIMENSIONS = [
  { id: "hr", name: "People & HR Governance", icon: "users", weight: 0.20, color: "#48CAE4" },
  { id: "finance", name: "Finance & Budget Governance", icon: "dollar-sign", weight: 0.20, color: "#06D6A0" },
  { id: "operations", name: "Project & Execution Governance", icon: "briefcase", weight: 0.20, color: "#FFD166" },
  { id: "customer", name: "Customer & Stakeholder Governance", icon: "smile", weight: 0.15, color: "#F78C6B" },
  { id: "compliance", name: "Risk & Compliance Governance", icon: "shield-alert", weight: 0.15, color: "#EF476F" },
  { id: "strategy", name: "Executive & Strategic Governance", icon: "target", weight: 0.10, color: "#118AB2" }
];

// Assessment Quarters definitions
export const QUARTERS = [
  { id: "2024-Q1", label: "2024 Q1 (Jan-Mar)", year: 2024, q: 1, isBaseline: true },
  { id: "2024-Q2", label: "2024 Q2 (Apr-Jun)", year: 2024, q: 2 },
  { id: "2024-Q3", label: "2024 Q3 (Jul-Sep)", year: 2024, q: 3 },
  { id: "2024-Q4", label: "2024 Q4 (Oct-Dec)", year: 2024, q: 4 },
  { id: "2025-Q1", label: "2025 Q1 (Jan-Mar)", year: 2025, q: 1 },
  { id: "2025-Q2", label: "2025 Q2 (Apr-Jun)", year: 2025, q: 2 },
  { id: "2025-Q3", label: "2025 Q3 (Jul-Sep)", year: 2025, q: 3 },
  { id: "2025-Q4", label: "2025 Q4 (Oct-Dec)", year: 2025, q: 4 },
  { id: "2026-Q1", label: "2026 Q1 (Jan-Mar)", year: 2026, q: 1 },
  { id: "2026-Q2", label: "2026 Q2 (Apr-Jun)", year: 2026, q: 2, isCurrentDefault: true, event: "Attrition Spike & Project Risk" },
  { id: "2026-Q3", label: "2026 Q3 (Jul-Sep)", year: 2026, q: 3, isImpactTarget: true },
  { id: "2026-Q4", label: "2026 Q4 (Oct-Dec)", year: 2026, q: 4 }
];

// Metric definition master (~30 KPIs)
export const KPI_MASTER = [
  // HR Governance
  { id: "hr_attrition", name: "Annualized Employee Attrition Rate", dimension: "hr", unit: "%", target: 8.0, direction: "lower_is_better", weight: 0.30, min: 0, max: 30 },
  { id: "hr_retention", name: "Key Talent Retention Rate", dimension: "hr", unit: "%", target: 92.0, direction: "higher_is_better", weight: 0.25, min: 50, max: 100 },
  { id: "hr_training", name: "Avg Upskilling Hours / Employee", dimension: "hr", unit: "hrs", target: 24.0, direction: "higher_is_better", weight: 0.15, min: 0, max: 50 },
  { id: "hr_satisfaction", name: "Employee Engagement Index", dimension: "hr", unit: "/100", target: 82.0, direction: "higher_is_better", weight: 0.15, min: 0, max: 100 },
  { id: "hr_diversity", name: "Leadership Diversity Ratio", dimension: "hr", unit: "%", target: 45.0, direction: "higher_is_better", weight: 0.15, min: 0, max: 100 },

  // Finance Governance
  { id: "fin_budget_var", name: "Operational Budget Variance", dimension: "finance", unit: "%", target: 2.5, direction: "lower_is_better", weight: 0.30, min: 0, max: 20 },
  { id: "fin_capex_eff", name: "Capital Allocation Efficiency Score", dimension: "finance", unit: "/100", target: 88.0, direction: "higher_is_better", weight: 0.25, min: 0, max: 100 },
  { id: "fin_roi", name: "Quarterly Governance ROI Index", dimension: "finance", unit: "x", target: 2.8, direction: "higher_is_better", weight: 0.25, min: 0, max: 5 },
  { id: "fin_cost_per_hire", name: "Average Cost Per Hire Variance", dimension: "finance", unit: "%", target: 3.0, direction: "lower_is_better", weight: 0.20, min: 0, max: 30 },

  // Project & Execution Governance
  { id: "op_milestone_on_time", name: "On-Time Project Milestone Delivery", dimension: "operations", unit: "%", target: 88.0, direction: "higher_is_better", weight: 0.30, min: 0, max: 100 },
  { id: "op_project_delay_risk", name: "High-Risk Delayed Projects Count", dimension: "operations", unit: "projects", target: 2, direction: "lower_is_better", weight: 0.25, min: 0, max: 15 },
  { id: "op_sla_compliance", name: "Operations SLA Compliance Rate", dimension: "operations", unit: "%", target: 95.0, direction: "higher_is_better", weight: 0.25, min: 0, max: 100 },
  { id: "op_throughput", name: "Quarterly Delivery Velocity Index", dimension: "operations", unit: "/100", target: 85.0, direction: "higher_is_better", weight: 0.20, min: 0, max: 100 },

  // Customer & Stakeholder Governance
  { id: "cust_csat", name: "Customer Satisfaction Score (CSAT)", dimension: "customer", unit: "%", target: 88.0, direction: "higher_is_better", weight: 0.35, min: 0, max: 100 },
  { id: "cust_nps", name: "Institutional Net Promoter Score (NPS)", dimension: "customer", unit: "pts", target: 55, direction: "higher_is_better", weight: 0.30, min: -100, max: 100 },
  { id: "cust_escalations", name: "Major Client Escalations", dimension: "customer", unit: "incidents", target: 3, direction: "lower_is_better", weight: 0.20, min: 0, max: 30 },
  { id: "cust_resolution_time", name: "Avg Escalation Resolution Time", dimension: "customer", unit: "hrs", target: 12.0, direction: "lower_is_better", weight: 0.15, min: 0, max: 72 },

  // Risk & Compliance Governance
  { id: "risk_audit_score", name: "Internal Compliance Audit Index", dimension: "compliance", unit: "/100", target: 90.0, direction: "higher_is_better", weight: 0.35, min: 0, max: 100 },
  { id: "risk_sec_vuln", name: "Unresolved High Risk Vulnerabilities", dimension: "compliance", unit: "flaws", target: 0, direction: "lower_is_better", weight: 0.30, min: 0, max: 25 },
  { id: "risk_reg_incidents", name: "Regulatory Compliance Breaches", dimension: "compliance", unit: "breaches", target: 0, direction: "lower_is_better", weight: 0.20, min: 0, max: 10 },
  { id: "risk_policy_ack", name: "Employee Policy Attestation Rate", dimension: "compliance", unit: "%", target: 98.0, direction: "higher_is_better", weight: 0.15, min: 0, max: 100 },

  // Strategic Governance
  { id: "strat_goal_alignment", name: "OKRs & Strategic Alignment Score", dimension: "strategy", unit: "%", target: 85.0, direction: "higher_is_better", weight: 0.40, min: 0, max: 100 },
  { id: "strat_board_action_closure", name: "Board Action Item Closure Rate", dimension: "strategy", unit: "%", target: 90.0, direction: "higher_is_better", weight: 0.35, min: 0, max: 100 },
  { id: "strat_innovation_index", name: "Quarterly Innovation Velocity", dimension: "strategy", unit: "/100", target: 80.0, direction: "higher_is_better", weight: 0.25, min: 0, max: 100 }
];

// Historical raw KPI values across 12 Quarters
export const QUARTERLY_KPI_DATA = {
  "2024-Q1": {
    hr_attrition: 7.5, hr_retention: 94.0, hr_training: 22.0, hr_satisfaction: 84.0, hr_diversity: 42.0,
    fin_budget_var: 1.8, fin_capex_eff: 89.0, fin_roi: 2.9, fin_cost_per_hire: 2.2,
    op_milestone_on_time: 90.0, op_project_delay_risk: 1, op_sla_compliance: 96.0, op_throughput: 88.0,
    cust_csat: 90.0, cust_nps: 58, cust_escalations: 2, cust_resolution_time: 10.5,
    risk_audit_score: 92.0, risk_sec_vuln: 1, risk_reg_incidents: 0, risk_policy_ack: 99.0,
    strat_goal_alignment: 88.0, strat_board_action_closure: 92.0, strat_innovation_index: 81.0
  },
  "2024-Q2": {
    hr_attrition: 7.8, hr_retention: 93.5, hr_training: 23.5, hr_satisfaction: 83.5, hr_diversity: 43.0,
    fin_budget_var: 2.1, fin_capex_eff: 88.5, fin_roi: 2.85, fin_cost_per_hire: 2.4,
    op_milestone_on_time: 89.0, op_project_delay_risk: 2, op_sla_compliance: 95.5, op_throughput: 87.0,
    cust_csat: 89.0, cust_nps: 56, cust_escalations: 3, cust_resolution_time: 11.0,
    risk_audit_score: 91.5, risk_sec_vuln: 2, risk_reg_incidents: 0, risk_policy_ack: 98.5,
    strat_goal_alignment: 87.0, strat_board_action_closure: 91.0, strat_innovation_index: 82.0
  },
  "2024-Q3": {
    hr_attrition: 8.0, hr_retention: 92.8, hr_training: 24.0, hr_satisfaction: 82.0, hr_diversity: 43.5,
    fin_budget_var: 2.3, fin_capex_eff: 87.0, fin_roi: 2.8, fin_cost_per_hire: 2.6,
    op_milestone_on_time: 88.0, op_project_delay_risk: 2, op_sla_compliance: 95.0, op_throughput: 86.0,
    cust_csat: 88.5, cust_nps: 55, cust_escalations: 3, cust_resolution_time: 11.8,
    risk_audit_score: 90.0, risk_sec_vuln: 1, risk_reg_incidents: 0, risk_policy_ack: 98.0,
    strat_goal_alignment: 86.0, strat_board_action_closure: 89.0, strat_innovation_index: 80.0
  },
  "2024-Q4": {
    hr_attrition: 8.1, hr_retention: 92.0, hr_training: 25.0, hr_satisfaction: 83.0, hr_diversity: 44.0,
    fin_budget_var: 2.0, fin_capex_eff: 89.5, fin_roi: 2.95, fin_cost_per_hire: 2.5,
    op_milestone_on_time: 89.5, op_project_delay_risk: 1, op_sla_compliance: 96.2, op_throughput: 88.5,
    cust_csat: 90.5, cust_nps: 59, cust_escalations: 2, cust_resolution_time: 10.2,
    risk_audit_score: 93.0, risk_sec_vuln: 0, risk_reg_incidents: 0, risk_policy_ack: 99.2,
    strat_goal_alignment: 88.5, strat_board_action_closure: 93.0, strat_innovation_index: 83.0
  },
  "2025-Q1": {
    hr_attrition: 7.9, hr_retention: 93.0, hr_training: 26.0, hr_satisfaction: 84.5, hr_diversity: 44.5,
    fin_budget_var: 1.9, fin_capex_eff: 90.0, fin_roi: 3.0, fin_cost_per_hire: 2.1,
    op_milestone_on_time: 91.0, op_project_delay_risk: 1, op_sla_compliance: 97.0, op_throughput: 89.0,
    cust_csat: 91.0, cust_nps: 61, cust_escalations: 1, cust_resolution_time: 9.8,
    risk_audit_score: 94.0, risk_sec_vuln: 0, risk_reg_incidents: 0, risk_policy_ack: 99.5,
    strat_goal_alignment: 90.0, strat_board_action_closure: 94.0, strat_innovation_index: 85.0
  },
  "2025-Q2": {
    hr_attrition: 8.3, hr_retention: 91.5, hr_training: 24.5, hr_satisfaction: 81.5, hr_diversity: 45.0,
    fin_budget_var: 2.4, fin_capex_eff: 88.0, fin_roi: 2.8, fin_cost_per_hire: 2.8,
    op_milestone_on_time: 87.5, op_project_delay_risk: 3, op_sla_compliance: 94.0, op_throughput: 85.0,
    cust_csat: 87.5, cust_nps: 52, cust_escalations: 4, cust_resolution_time: 13.0,
    risk_audit_score: 89.0, risk_sec_vuln: 3, risk_reg_incidents: 0, risk_policy_ack: 97.5,
    strat_goal_alignment: 84.5, strat_board_action_closure: 88.0, strat_innovation_index: 79.0
  },
  "2025-Q3": {
    hr_attrition: 8.5, hr_retention: 91.0, hr_training: 25.0, hr_satisfaction: 82.0, hr_diversity: 45.2,
    fin_budget_var: 2.2, fin_capex_eff: 88.5, fin_roi: 2.85, fin_cost_per_hire: 2.7,
    op_milestone_on_time: 88.0, op_project_delay_risk: 2, op_sla_compliance: 95.0, op_throughput: 86.5,
    cust_csat: 88.0, cust_nps: 54, cust_escalations: 3, cust_resolution_time: 12.0,
    risk_audit_score: 90.5, risk_sec_vuln: 2, risk_reg_incidents: 0, risk_policy_ack: 98.0,
    strat_goal_alignment: 86.0, strat_board_action_closure: 90.0, strat_innovation_index: 81.0
  },
  "2025-Q4": {
    hr_attrition: 8.2, hr_retention: 92.5, hr_training: 27.0, hr_satisfaction: 84.0, hr_diversity: 45.8,
    fin_budget_var: 1.7, fin_capex_eff: 91.0, fin_roi: 3.1, fin_cost_per_hire: 2.0,
    op_milestone_on_time: 92.0, op_project_delay_risk: 1, op_sla_compliance: 97.5, op_throughput: 90.0,
    cust_csat: 92.0, cust_nps: 63, cust_escalations: 1, cust_resolution_time: 9.2,
    risk_audit_score: 95.0, risk_sec_vuln: 0, risk_reg_incidents: 0, risk_policy_ack: 99.8,
    strat_goal_alignment: 91.0, strat_board_action_closure: 95.0, strat_innovation_index: 86.0
  },
  "2026-Q1": {
    hr_attrition: 8.2, hr_retention: 92.0, hr_training: 26.5, hr_satisfaction: 83.0, hr_diversity: 46.0,
    fin_budget_var: 1.9, fin_capex_eff: 89.5, fin_roi: 2.9, fin_cost_per_hire: 2.3,
    op_milestone_on_time: 89.0, op_project_delay_risk: 2, op_sla_compliance: 96.0, op_throughput: 87.5,
    cust_csat: 89.5, cust_nps: 57, cust_escalations: 2, cust_resolution_time: 10.5,
    risk_audit_score: 93.0, risk_sec_vuln: 1, risk_reg_incidents: 0, risk_policy_ack: 99.0,
    strat_goal_alignment: 88.0, strat_board_action_closure: 92.0, strat_innovation_index: 84.0
  },
  // 2026-Q2 - CURRENT REVIEW QUARTER (Matches Slide 4 example!)
  // OGPI baseline calculated = ~82.4; People Governance drops (77 -> 69); Attrition spikes 8.2% -> 13.4%
  "2026-Q2": {
    hr_attrition: 13.4, hr_retention: 78.5, hr_training: 14.0, hr_satisfaction: 66.0, hr_diversity: 46.2,
    fin_budget_var: 4.8, fin_capex_eff: 79.0, fin_roi: 2.1, fin_cost_per_hire: 6.5,
    op_milestone_on_time: 74.0, op_project_delay_risk: 7, op_sla_compliance: 88.0, op_throughput: 72.0,
    cust_csat: 81.0, cust_nps: 38, cust_escalations: 8, cust_resolution_time: 21.5,
    risk_audit_score: 83.0, risk_sec_vuln: 6, risk_reg_incidents: 1, risk_policy_ack: 94.0,
    strat_goal_alignment: 78.0, strat_board_action_closure: 81.0, strat_innovation_index: 73.0
  },
  // 2026-Q3 (Default Projection / Pre-Action state or Post-Action state)
  "2026-Q3": {
    hr_attrition: 11.2, hr_retention: 84.0, hr_training: 20.0, hr_satisfaction: 76.0, hr_diversity: 46.5,
    fin_budget_var: 3.2, fin_capex_eff: 84.0, fin_roi: 2.5, fin_cost_per_hire: 4.1,
    op_milestone_on_time: 82.0, op_project_delay_risk: 4, op_sla_compliance: 92.0, op_throughput: 80.0,
    cust_csat: 85.0, cust_nps: 48, cust_escalations: 5, cust_resolution_time: 15.0,
    risk_audit_score: 88.0, risk_sec_vuln: 3, risk_reg_incidents: 0, risk_policy_ack: 97.0,
    strat_goal_alignment: 83.0, strat_board_action_closure: 86.0, strat_innovation_index: 78.0
  },
  "2026-Q4": {
    hr_attrition: 8.4, hr_retention: 91.5, hr_training: 25.0, hr_satisfaction: 82.5, hr_diversity: 47.0,
    fin_budget_var: 2.1, fin_capex_eff: 88.5, fin_roi: 2.85, fin_cost_per_hire: 2.5,
    op_milestone_on_time: 88.5, op_project_delay_risk: 2, op_sla_compliance: 95.5, op_throughput: 86.0,
    cust_csat: 89.0, cust_nps: 56, cust_escalations: 2, cust_resolution_time: 11.0,
    risk_audit_score: 92.5, risk_sec_vuln: 1, risk_reg_incidents: 0, risk_policy_ack: 98.8,
    strat_goal_alignment: 87.0, strat_board_action_closure: 91.0, strat_innovation_index: 82.0
  }
};

// Institutional Governance RAG Documents Knowledge Base
export const RAG_DOCUMENTS = [
  {
    id: "GOV-DOC-001",
    title: "Institutional Governance & Performance Charter v4.2",
    category: "Framework",
    snippet: "The Overall Governance Performance Index (OGPI) is evaluated quarterly across 6 core dimensions. Thresholds below 70 in any dimension require mandatory Executive Committee intervention within 14 business days.",
    fullText: "PRJ_637 Institutional Governance Charter mandating quarterly OGPI scoring, multi-tier RBAC, anomaly thresholding via Isolation Forest algorithms, and mandatory closed-loop management action tracking. Any dimension dropping below 70 score triggers high workforce/operational risk alerts."
  },
  {
    id: "GOV-DOC-002",
    title: "HR & Talent Retention Mitigation Policy (SOP-HR-08)",
    category: "Policy",
    snippet: "When employee attrition exceeds 10% in a single quarter, management must deploy retention bonuses, workload rebalancing, and skill alignment programs to safeguard project delivery timelines.",
    fullText: "Standard Operating Procedure HR-08: Addressing talent attrition spikes (>10%). Recommended remediation actions include market-rate compensation benchmarking, technical upskilling investment (>24 hrs/emp), and operational workload reassignment to prevent key project delays."
  },
  {
    id: "GOV-DOC-003",
    title: "Project Risk Management & Delay Escalation Protocol",
    category: "Operations",
    snippet: "Projects flagged by XGBoost delay models with >65% risk probability must submit revised milestone burn-downs and reallocate senior engineering oversight within 7 days.",
    fullText: "Project Delivery Protocol: ML models evaluate on-time delivery rates, staffing adequacy, and dependency risk. High-risk project counts greater than 3 trigger mandatory board review and quarterly resource buffer allocation."
  },
  {
    id: "GOV-DOC-004",
    title: "Regulatory Compliance & Audit Threshold Policy",
    category: "Compliance",
    snippet: "Zero tolerance for unmitigated high-severity security vulnerabilities (>30 days). Compliance audit scores must maintain a minimum 90/100 threshold institutional target.",
    fullText: "Compliance Standard: Regulatory incidents must be reported immediately. Security vulnerabilities must be patched within 14 days. Policy attestation by employees must exceed 95% quarterly."
  }
];

// Initial Management Actions Repository
export const INITIAL_MANAGEMENT_ACTIONS = [
  {
    id: "ACT-2026-001",
    quarter: "2026-Q2",
    dimension: "hr",
    title: "Emergency Talent Retention & Compensation Benchmarking Plan",
    owner: "VP of Human Resources",
    priority: "High",
    status: "In Progress",
    targetDate: "2026-07-15",
    description: "Address Q2 attrition surge (8.2% -> 13.4%) by conducting salary benchmarking, rebalancing workload on critical projects, and boosting retention packages.",
    projectedImpact: {
      targetQuarter: "2026-Q3",
      kpiUpdates: {
        hr_attrition: 7.8,
        hr_retention: 92.5,
        hr_satisfaction: 81.0,
        op_milestone_on_time: 87.0,
        op_project_delay_risk: 2
      },
      ogpiImpact: "+7.2 points recovery"
    }
  },
  {
    id: "ACT-2026-002",
    quarter: "2026-Q2",
    dimension: "operations",
    title: "Senior Technical Oversight for High-Risk Delayed Projects",
    owner: "Chief Operating Officer",
    priority: "Critical",
    status: "Approved",
    targetDate: "2026-07-30",
    description: "Reallocate senior architects and project leads to the 7 delayed projects identified by XGBoost risk classification to prevent SLA breaches.",
    projectedImpact: {
      targetQuarter: "2026-Q3",
      kpiUpdates: {
        op_milestone_on_time: 89.0,
        op_project_delay_risk: 2,
        cust_csat: 88.5
      },
      ogpiImpact: "+4.5 points recovery"
    }
  }
];
