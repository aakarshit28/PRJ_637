// Policy Intelligence Module

const templates = {
    data: `Draft National Data Localization Framework. 
Objective: Secure personal citizen records within regional storage hubs. 
Mandates: All personal identifiers, biometric records, and primary medical logs must reside on national soil. Cross-border transit of metadata requires explicit approval from the Governance Board. Double-key cryptography is compulsory for transmission outside public cloud segments. Consent mechanisms must be updated annually.`,
    
    health: `Draft Framework for AI Deployment in Public Health Systems.
Objective: Enable predictive diagnostic tools within regional clinics. 
Mandates: Clinical systems may process imagery and lab profiles using pre-cleared, unbiased convolutional neural networks. Anonymized diagnostic metadata is shared with regional hospitals for quality auditing. Patient opt-in is requested at check-in. Audits for algorithmic bias are voluntary and recommended every two years.`
};

const analysisReports = {
    data: {
        score: 68,
        statusText: 'Moderate Compliance Risk',
        risks: [
            { severity: 'danger', param: 'Cross-Border Transfer Audit', desc: 'Mandating double-key cryptographic clearance creates severe operational overhead and overlaps with standard TLS/encryption regulations.' },
            { severity: 'warning', param: 'Consent Revocation mechanics', desc: 'No clear mechanism is defined for citizens to request local data purge or retrieve their personal records.' },
            { severity: 'success', param: 'Data Portability rights', desc: 'Strict regional storage guarantees secure sovereign jurisdiction over biometric files.' }
        ],
        recs: [
            { title: 'Harmonize Transfer Auditing', desc: 'Replace dual-key approval with a standardized, risk-based bilateral transfer framework (similar to EU adequacy decisions).' },
            { title: 'Incorporate Purge Provisions', desc: 'Amend Section 4.2 to add explicit right-to-be-forgotten steps and standard JSON data exports for portability.' }
        ],
        tableValues: {
            portability: { label: 'Guaranteed', class: 'label success', score: '90%' },
            transfer: { label: 'High Overhead', class: 'label danger', score: '35%' },
            consent: { label: 'Partial', class: 'label warning', score: '60%' },
            aiAudit: { label: 'Not Applicable', class: 'label warning', score: '50%' }
        }
    },
    health: {
        score: 85,
        statusText: 'Strong Alignment & Low Risk',
        risks: [
            { severity: 'success', param: 'AI Risk-Categorization audits', desc: 'CNN models are strictly pre-cleared for structural bias before deployment.' },
            { severity: 'warning', param: 'Consent Revocation mechanics', desc: 'Opt-in requested during physical registration is easy, but no clear pathway exists for digital opt-out after diagnostic simulation.' },
            { severity: 'warning', param: 'Cross-Border Transfer Audit', desc: 'Voluntary audits every two years may lead to compliance gaps. Mandatory scheduling is recommended.' }
        ],
        recs: [
            { title: 'Implement Digital Consent Portal', desc: 'Incorporate an online portal enabling retrospective revocation of diagnostic data sharing.' },
            { title: 'Mandate Annual Audits', desc: 'Standardize audit frequencies to annually for safety-critical medical models.' }
        ],
        tableValues: {
            portability: { label: 'Partial', class: 'label warning', score: '70%' },
            transfer: { label: 'Flexible', class: 'label success', score: '85%' },
            consent: { label: 'Easy Opt-in', class: 'label success', score: '90%' },
            aiAudit: { label: 'Planned Framework', class: 'label success', score: '95%' }
        }
    }
};

export function initIntelligence() {
    const dataBtn = document.getElementById('btn-preset-data');
    const healthBtn = document.getElementById('btn-preset-health');
    const inputArea = document.getElementById('policy-text-input');
    const analyzeBtn = document.getElementById('btn-analyze-policy');

    if (!inputArea) return;

    // Load templates
    if (dataBtn) {
        dataBtn.addEventListener('click', () => {
            inputArea.value = templates.data;
        });
    }

    if (healthBtn) {
        healthBtn.addEventListener('click', () => {
            inputArea.value = templates.health;
        });
    }

    // Run simulation analysis
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            const text = inputArea.value.trim();
            if (!text) {
                alert('Please enter or load a policy draft first.');
                return;
            }

            runPolicyAnalysis(text);
        });
    }
}

function runPolicyAnalysis(text) {
    const statusBadge = document.getElementById('policy-analysis-status');
    const reportContent = document.getElementById('policy-report-content');

    if (!statusBadge || !reportContent) return;

    // Determine which template was used (or default to data if unknown)
    let type = 'data';
    if (text.includes('Public Health') || text.includes('AI Deployment') || text.includes('diagnostic')) {
        type = 'health';
    }

    const report = analysisReports[type];

    // Set processing UI state
    statusBadge.textContent = 'Analyzing...';
    statusBadge.className = 'badge processing';
    
    reportContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon-wrapper">
                <i data-lucide="refresh-cw" class="rotating"></i>
            </div>
            <h4 id="analysis-step-text">Connecting to NLP Engine...</h4>
            <p class="text-muted">Parsing syntax structure and compliance anchors.</p>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons({ attrs: { class: ['rotating'] } });
    }

    const steps = [
        'Scanning regulatory database...',
        'Checking SDG metrics alignment...',
        'Auditing privacy safeguards...',
        'Compiling recommendations...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        const stepText = document.getElementById('analysis-step-text');
        if (stepText && currentStep < steps.length) {
            stepText.textContent = steps[currentStep];
            currentStep++;
        } else {
            clearInterval(interval);
            finishAnalysis(report);
        }
    }, 450);
}

function finishAnalysis(report) {
    const statusBadge = document.getElementById('policy-analysis-status');
    const reportContent = document.getElementById('policy-report-content');

    if (!statusBadge || !reportContent) return;

    statusBadge.textContent = 'COMPLETED';
    statusBadge.className = 'badge success';

    // Build the analysis report HTML
    const risksHtml = report.risks.map(risk => `
        <div class="report-risk-item">
            <i data-lucide="info" class="risk-bullet ${risk.severity}"></i>
            <div class="risk-desc">
                <strong>${risk.param}:</strong> ${risk.desc}
            </div>
        </div>
    `).join('');

    const recsHtml = report.recs.map(rec => `
        <div class="rec-item">
            <i data-lucide="lightbulb"></i>
            <div class="rec-content">
                <h6>${rec.title}</h6>
                <p>${rec.desc}</p>
            </div>
        </div>
    `).join('');

    reportContent.innerHTML = `
        <div class="ai-report">
            <div class="report-section">
                <div class="report-score-box">
                    <div class="report-score-details">
                        <h5>${report.statusText}</h5>
                        <p>Evaluated Governance Alignment Score</p>
                    </div>
                    <div class="report-score-circle">
                        ${report.score}%
                    </div>
                </div>
            </div>
            
            <div class="report-section">
                <div class="report-title-group">
                    <i data-lucide="shield-alert"></i>
                    <span>Compliance Risk Profile</span>
                </div>
                <div class="risks-list">
                    ${risksHtml}
                </div>
            </div>

            <div class="report-section">
                <div class="report-title-group">
                    <i data-lucide="zap"></i>
                    <span>Actionable Optimization Pathways</span>
                </div>
                <div class="recommendations-box">
                    ${recsHtml}
                </div>
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Update Comparison Matrix Table
    updateComparisonTable(report.tableValues);
}

function updateComparisonTable(tableValues) {
    const fields = document.querySelectorAll('.simulated-field');
    
    fields.forEach(field => {
        const param = field.dataset.param;
        let valueData = null;

        if (param === 'portability') valueData = tableValues.portability;
        if (param === 'transfer') valueData = tableValues.transfer;
        if (param === 'consent') valueData = tableValues.consent;
        if (param === 'ai-audit') valueData = tableValues.aiAudit;

        if (valueData) {
            // Update table cell HTML
            field.innerHTML = `<span class="${valueData.class}">${valueData.label}</span>`;
            
            // Update score cell
            const scoreCell = document.getElementById(`score-${param}`);
            if (scoreCell) {
                scoreCell.textContent = valueData.score;
            }

            // Flash update effect
            field.classList.add('updated');
            if (scoreCell) scoreCell.classList.add('updated');
            
            setTimeout(() => {
                field.classList.remove('updated');
                if (scoreCell) scoreCell.classList.remove('updated');
            }, 1000);
        }
    });
}
