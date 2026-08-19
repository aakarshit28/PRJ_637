// Maturity Audit Module

const questions = [
    {
        title: "Policy Frameworks",
        desc: "Does the government possess active national digital registry and infrastructure policies?",
        options: [
            { text: "No active policy framework; processes are purely paper-based.", score: 0 },
            { text: "Individual departments maintain separate, unaligned digital drafts.", score: 1 },
            { text: "Coordinated national digital strategy is active across agencies.", score: 2 },
            { text: "Legislative governance policy backed by standard audit metrics.", score: 3 }
        ]
    },
    {
        title: "Regulatory & Compliance Standards",
        desc: "How are data privacy regulations and standard protocols audited?",
        options: [
            { text: "No formal data privacy protocols or audit standards exist.", score: 0 },
            { text: "Basic compliance exists, but lacks independent audit validation.", score: 1 },
            { text: "Privacy standards are aligned to domestic regulatory requirements.", score: 2 },
            { text: "Fully integrated compliance audits aligned with global standards.", score: 3 }
        ]
    },
    {
        title: "Interoperability & Data Architecture",
        desc: "Are departmental databases and registries structurally interconnected?",
        options: [
            { text: "Complete database silos; data is manually duplicated.", score: 0 },
            { text: "Bilateral API data exchange exists between limited departments.", score: 1 },
            { text: "National registry backbone architecture (e.g., X-Road style) is active.", score: 2 },
            { text: "Fully semantic federated architecture with standardized open APIs.", score: 3 }
        ]
    },
    {
        title: "Citizen Feedback Integration",
        desc: "How is citizen service feedback captured and utilized to adjust policies?",
        options: [
            { text: "No tracking channels for digital service experience.", score: 0 },
            { text: "Manual citizen satisfaction surveys conducted annually.", score: 1 },
            { text: "Unified public portal with live rating feedback forms.", score: 2 },
            { text: "Real-time AI sentiment analysis engine guides resource allocation.", score: 3 }
        ]
    },
    {
        title: "Infrastructure & Cybersecurity Resilience",
        desc: "What is the structural scale and security layer of the public cloud network?",
        options: [
            { text: "Decentralized on-premise local servers; frequent down-time.", score: 0 },
            { text: "Commercial cloud hosting with basic firewalls.", score: 1 },
            { text: "Dedicated, secure government private cloud with DDoS mitigation.", score: 2 },
            { text: "Multi-region sovereign hybrid cloud with AI threat scanning.", score: 3 }
        ]
    },
    {
        title: "Public Sector Digital Skills",
        desc: "Does the public workforce possess the competencies needed to manage digitalization?",
        options: [
            { text: "Critical deficit in software management and data literacy.", score: 0 },
            { text: "Basic IT maintenance skills with ad-hoc training programs.", score: 1 },
            { text: "Standardized training frameworks with specialized technical units.", score: 2 },
            { text: "Continuous adaptive training pipelines with in-house AI experts.", score: 3 }
        ]
    }
];

const roadmaps = {
    level1: {
        badge: "LEVEL 1: AD-HOC",
        class: "level-1",
        desc: "Digitalization is fragmented. Immediate foundational frameworks are required.",
        items: [
            "Draft a basic data governance regulation framework.",
            "Consolidate departmental hardware assets under centralized IT."
        ]
    },
    level2: {
        badge: "LEVEL 2: REPEATABLE",
        class: "level-2",
        desc: "Basic digital services are deployed. Lack of standardization limits efficiency.",
        items: [
            "Establish bilateral API sharing protocols.",
            "Introduce mandatory cybersecurity awareness training."
        ]
    },
    level3: {
        badge: "LEVEL 3: DEFINED",
        class: "level-3",
        desc: "Coordinated digital strategy exists. Interoperability remains moderate.",
        items: [
            "Deploy a central national registry hub.",
            "Define standard compliance guidelines for all APIs."
        ]
    },
    level4: {
        badge: "LEVEL 4: MANAGED",
        class: "level-4",
        desc: "Processes are monitored. Insights are gathered for service optimization.",
        items: [
            "Implement live citizen feedback widgets.",
            "Initiate automated compliance scans across databases."
        ]
    },
    level5: {
        badge: "LEVEL 5: OPTIMIZED",
        class: "level-5",
        desc: "Self-optimizing governance system powered by real-time analytics.",
        items: [
            "Explore automated AI policy compliance auditing.",
            "Open developer sandboxes for civic-tech integrations."
        ]
    }
};

let currentQuestion = 0;
let userAnswers = Array(questions.length).fill(null);

export function initAuditor() {
    setupUI();
}

function setupUI() {
    renderQuestion();
    setupListeners();
    updateScorecard();
}

function renderQuestion() {
    const qTitle = document.getElementById('audit-q-title');
    const qDesc = document.getElementById('audit-q-desc');
    const qOptions = document.getElementById('audit-q-options');
    const progressText = document.getElementById('audit-progress-text');
    const progressBar = document.getElementById('audit-progress-bar');
    const prevBtn = document.getElementById('btn-audit-prev');
    const nextBtn = document.getElementById('btn-audit-next');

    if (!qTitle || !qDesc || !qOptions) return;

    if (currentQuestion >= questions.length) {
        // Render completion state
        renderCompletionState();
        return;
    }

    const q = questions[currentQuestion];
    
    // Update labels and progress
    qTitle.textContent = q.title;
    qDesc.textContent = q.desc;
    if (progressText) progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    if (progressBar) progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;

    // Render options
    qOptions.innerHTML = q.options.map((opt, index) => {
        const isSelected = userAnswers[currentQuestion] === index;
        return `
            <div class="option-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <div class="option-radio-visual"></div>
                <div class="option-text-content">${opt.text}</div>
            </div>
        `;
    }).join('');

    // Attach option listeners
    const optionCards = qOptions.querySelectorAll('.option-item');
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.index, 10);
            userAnswers[currentQuestion] = idx;
            
            // Re-render to show selected active style
            renderQuestion();
            updateScorecard();
        });
    });

    // Button states
    if (prevBtn) prevBtn.disabled = currentQuestion === 0;
    if (nextBtn) {
        nextBtn.innerHTML = currentQuestion === questions.length - 1 
            ? `Complete Assessment <i data-lucide="check" class="btn-icon-right"></i>`
            : `Next Question <i data-lucide="arrow-right" class="btn-icon-right"></i>`;
        
        // Disable next if current question isn't answered yet
        nextBtn.disabled = userAnswers[currentQuestion] === null;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function renderCompletionState() {
    const surveyBody = document.getElementById('audit-survey-body');
    const progressText = document.getElementById('audit-progress-text');
    const progressBar = document.getElementById('audit-progress-bar');
    const prevBtn = document.getElementById('btn-audit-prev');
    const nextBtn = document.getElementById('btn-audit-next');

    if (!surveyBody) return;

    if (progressText) progressText.textContent = `Assessment Complete`;
    if (progressBar) progressBar.style.width = `100%`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) {
        nextBtn.innerHTML = `Restart Audit <i data-lucide="rotate-ccw" class="btn-icon-right"></i>`;
        nextBtn.disabled = false;
    }

    surveyBody.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon-wrapper" style="color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05);">
                <i data-lucide="award"></i>
            </div>
            <h4>Audit Completed Successfully</h4>
            <p class="text-muted">A dynamic compliance scorecard has been compiled. See findings and standard roadmap on the right panel.</p>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function setupListeners() {
    const prevBtn = document.getElementById('btn-audit-prev');
    const nextBtn = document.getElementById('btn-audit-next');

    if (prevBtn) {
        // Prevent duplicate listener attachments by replacing button
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        newPrevBtn.addEventListener('click', () => {
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        });
    }

    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => {
            if (currentQuestion < questions.length) {
                currentQuestion++;
                renderQuestion();
            } else {
                // Restart action
                currentQuestion = 0;
                userAnswers = Array(questions.length).fill(null);
                setupUI();
            }
        });
    }
}

function updateScorecard() {
    const scoreText = document.getElementById('audit-score-text');
    const gaugeFill = document.getElementById('audit-gauge-fill');
    const badge = document.getElementById('audit-status-badge');
    const preview = document.getElementById('audit-details-preview');

    if (!scoreText || !gaugeFill || !badge || !preview) return;

    // Calculate score
    let answeredCount = 0;
    let scoreSum = 0;
    userAnswers.forEach((ans) => {
        if (ans !== null) {
            answeredCount++;
            scoreSum += questions[answeredCount - 1].options[ans].score;
        }
    });

    const maxScorePossible = questions.length * 3;
    const scorePercentage = answeredCount > 0 ? Math.round((scoreSum / maxScorePossible) * 100) : 0;

    // Update gauge path (dashoffset)
    // Circumference = 2 * Math.PI * r = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const offset = circumference - (circumference * scorePercentage) / 100;
    gaugeFill.setAttribute('stroke-dashoffset', offset);
    scoreText.textContent = `${scorePercentage}%`;

    // Map percentage to maturity levels
    let level = null;
    if (answeredCount === 0) {
        badge.textContent = "UNASSESSED";
        badge.className = "maturity-result-badge";
        preview.innerHTML = `<p class="text-muted text-center font-small">Complete the questions on the left to see the level mapping and recommendation roadmap.</p>`;
    } else {
        if (scorePercentage <= 20) level = roadmaps.level1;
        else if (scorePercentage <= 40) level = roadmaps.level2;
        else if (scorePercentage <= 60) level = roadmaps.level3;
        else if (scorePercentage <= 80) level = roadmaps.level4;
        else level = roadmaps.level5;

        badge.textContent = level.badge;
        badge.className = `maturity-result-badge ${level.class}`;

        const roadmapItemsHtml = level.items.map(item => `
            <div class="roadmap-item">
                <i data-lucide="check-circle-2"></i>
                <span>${item}</span>
            </div>
        `).join('');

        preview.innerHTML = `
            <div class="roadmap-wrapper animate-fadeIn">
                <p class="font-small text-muted mb-2">${level.desc}</p>
                <div class="roadmap-list">
                    ${roadmapItemsHtml}
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}
