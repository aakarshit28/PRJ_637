// Policy Impact Simulator Module

let simulationChart = null;

// Baseline configuration
const baselines = {
    budget: 50,
    rigor: 50,
    outreach: 30,
    cyber: 15
};

const currentSliders = { ...baselines };

export function initSimulator() {
    setupSliders();
    runSimulation();
    
    const resetBtn = document.getElementById('btn-reset-simulator');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetToBaseline();
        });
    }
}

function setupSliders() {
    const sliders = [
        { id: 'slider-sim-budget', key: 'budget', labelId: 'val-sim-budget', format: v => `$${v}M` },
        { 
            id: 'slider-sim-rigor', 
            key: 'rigor', 
            labelId: 'val-sim-rigor', 
            format: v => {
                if (v < 30) return `Permissive (${v}%)`;
                if (v < 70) return `Moderated (${v}%)`;
                return `Strict (${v}%)`;
            }
        },
        { 
            id: 'slider-sim-outreach', 
            key: 'outreach', 
            labelId: 'val-sim-outreach', 
            format: v => {
                if (v < 30) return `Low (${v}%)`;
                if (v < 70) return `Targeted (${v}%)`;
                return `Universal (${v}%)`;
            }
        },
        { id: 'slider-sim-cyber', key: 'cyber', labelId: 'val-sim-cyber', format: v => `$${v}M` }
    ];

    sliders.forEach(sliderConfig => {
        const slider = document.getElementById(sliderConfig.id);
        const label = document.getElementById(sliderConfig.labelId);

        if (slider && label) {
            // Set initial state
            slider.value = currentSliders[sliderConfig.key];
            label.textContent = sliderConfig.format(slider.value);

            // Listen for input changes
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                currentSliders[sliderConfig.key] = val;
                label.textContent = sliderConfig.format(val);
                runSimulation();
            });
        }
    });
}

function resetToBaseline() {
    currentSliders.budget = baselines.budget;
    currentSliders.rigor = baselines.rigor;
    currentSliders.outreach = baselines.outreach;
    currentSliders.cyber = baselines.cyber;

    setupSliders();
    runSimulation();
}

function runSimulation() {
    const { budget, rigor, outreach, cyber } = currentSliders;

    // Simulation Math Models (returning values baseline compatible)
    let adoption = Math.round(58 + (budget - 50) * 0.25 + (outreach - 30) * 0.3 - (rigor - 50) * 0.1);
    let trust = Math.round(62 + (cyber - 15) * 0.35 + (rigor - 50) * 0.2 + (outreach - 30) * 0.15);
    let leak = Math.round(42 - (cyber - 15) * 0.6 - (rigor - 50) * 0.3);
    let feasibility = Math.round(78 - (rigor - 50) * 0.3 - (cyber - 15) * 0.15 + (budget - 50) * 0.1 - (outreach - 30) * 0.1);

    // Clamps
    adoption = Math.max(5, Math.min(100, adoption));
    trust = Math.max(5, Math.min(100, trust));
    leak = Math.max(5, Math.min(95, leak));
    feasibility = Math.max(5, Math.min(100, feasibility));

    // Update UI elements
    updateMetricCard('adoption', adoption, 58, '%', false);
    updateMetricCard('trust', trust, 62, '/100', false);
    updateMetricCard('leak', leak, 42, '%', true); // Leak reduction is positive
    updateMetricCard('feasibility', feasibility, 78, '%', false);

    // Render 5-year outlook curves
    renderSimulationChart(adoption, trust, leak, feasibility);
}

function updateMetricCard(id, val, baseVal, suffix, invertDiff) {
    const valText = document.getElementById(`proj-${id}`);
    const bar = document.getElementById(`bar-proj-${id}`);
    const diff = document.getElementById(`proj-${id}-diff`);

    if (valText) valText.textContent = `${val}${suffix}`;
    if (bar) bar.style.width = `${val}%`;

    if (diff) {
        const change = val - baseVal;
        let changeText = '';
        let className = 'sim-indicator ';

        if (change > 0) {
            changeText = `+${change}% change`;
            className += invertDiff ? 'negative' : 'positive';
        } else if (change < 0) {
            changeText = `${change}% change`;
            className += invertDiff ? 'positive' : 'negative';
        } else {
            changeText = '0% change';
            className += 'neutral';
        }

        diff.textContent = changeText;
        diff.className = className;
    }
}

function renderSimulationChart(adoption, trust, leak, feasibility) {
    const ctx = document.getElementById('simulationTrendChart');
    if (!ctx) return;

    if (simulationChart) {
        simulationChart.destroy();
    }

    // Generate 5-year curve projections based on current state values
    const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
    
    // Smooth transition over 5 years
    const getCurve = (targetVal) => [
        Math.round(targetVal * 0.75),
        Math.round(targetVal * 0.88),
        targetVal,
        Math.round(Math.min(100, targetVal * 1.06)),
        Math.round(Math.min(100, targetVal * 1.12))
    ];

    const getLeakCurve = (targetVal) => [
        Math.round(targetVal * 1.15),
        Math.round(targetVal * 1.05),
        targetVal,
        Math.round(Math.max(5, targetVal * 0.9)),
        Math.round(Math.max(5, targetVal * 0.8))
    ];

    simulationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Digital Service Adoption',
                    data: getCurve(adoption),
                    borderColor: '#06B6D4',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 3
                },
                {
                    label: 'Citizen Trust Score',
                    data: getCurve(trust),
                    borderColor: '#8B5CF6',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 3
                },
                {
                    label: 'Data Leak Vulnerability',
                    data: getLeakCurve(leak),
                    borderColor: '#EF4444',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 3
                },
                {
                    label: 'Implementation Feasibility',
                    data: getCurve(feasibility),
                    borderColor: '#10B981',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9CA3AF',
                        boxWidth: 10,
                        font: { size: 10, family: 'Plus Jakarta Sans' }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF', font: { size: 9 } },
                    min: 0,
                    max: 100
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { size: 9 } }
                }
            }
        }
    });
}
