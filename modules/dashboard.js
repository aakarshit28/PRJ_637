// Dashboard Module

let sectorChart = null;
let trendChart = null;

// Mock Data
const sectorData = {
    labels: [
        'Digital Identity & Access',
        'E-Health & Social Welfare',
        'E-Education & Skills',
        'Financial Inclusion & Digital Economy',
        'Public Safety & Cyber-resilience'
    ],
    values: [88, 76, 82, 91, 68]
};

const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    governance: [72.4, 73.8, 74.5, 75.2, 76.0, 76.8],
    satisfaction: [79.5, 80.2, 81.1, 82.3, 83.5, 84.2],
    delivery: [2.5, 2.3, 2.1, 2.0, 1.9, 1.8] // in days
};

const departmentRankings = [
    { name: 'Dept. of Finance & Digital Economy', score: '93.2%', trend: '+1.2%', class: 'top-1' },
    { name: 'Dept. of Health & Social Care', score: '88.5%', trend: '+2.4%', class: 'top-2' },
    { name: 'Dept. of Civil Registration', score: '84.0%', trend: '+0.8%', class: 'top-3' },
    { name: 'Dept. of Education & Skills', score: '79.6%', trend: '-0.5%', class: '' },
    { name: 'Dept. of Transportation', score: '71.2%', trend: '+3.0%', class: '' }
];

const mockAnomalies = [
    {
        id: 1,
        title: 'API Authentication Failure Spike',
        desc: 'Dept. of Transportation registry API encountered high authentication latency rates.',
        severity: 'critical',
        time: '3m ago'
    },
    {
        id: 2,
        title: 'Privacy Compliance Flag',
        desc: 'Data sharing protocol in Draft Health Policy deviates from GDPR cross-border transfer standards.',
        severity: 'warning',
        time: '18m ago'
    },
    {
        id: 3,
        title: 'Infrastructure Overhead Alert',
        desc: 'Server utilization on regional cloud node 4B exceeded 92% capacity.',
        severity: 'info',
        time: '1h ago'
    }
];

export function initDashboard() {
    renderDepartmentRankings();
    renderAnomalyFeed();
    initSectorChart('radar');
    initTrendChart('governance');
    setupEventListeners();
}

// Draw/Redraw sector chart depending on type (radar or bar)
function initSectorChart(chartType) {
    const ctx = document.getElementById('sectorPerformanceChart');
    if (!ctx) return;

    if (sectorChart) {
        sectorChart.destroy();
    }

    const primaryColor = '#8B5CF6';
    const secondaryColor = '#06B6D4';

    const baseConfig = {
        data: {
            labels: sectorData.labels,
            datasets: [{
                label: 'Sector Score',
                data: sectorData.values,
                backgroundColor: chartType === 'radar' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.4)',
                borderColor: chartType === 'radar' ? primaryColor : secondaryColor,
                borderWidth: 2,
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: primaryColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: chartType === 'radar' ? {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: { color: '#9CA3AF', font: { family: 'Plus Jakarta Sans', size: 10 } },
                    ticks: { display: false },
                    min: 0,
                    max: 100
                }
            } : {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#9CA3AF' },
                    min: 0,
                    max: 100
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { size: 9 } }
                }
            }
        }
    };

    sectorChart = new Chart(ctx, {
        type: chartType,
        ...baseConfig
    });
}

// Draw/Redraw Trend line charts
function initTrendChart(trendKey) {
    const ctx = document.getElementById('kpiTrendChart');
    if (!ctx) return;

    if (trendChart) {
        trendChart.destroy();
    }

    let datasetLabel = '';
    let datasetData = [];
    let borderColor = '#8B5CF6';
    let gradientFill = 'rgba(139, 92, 246, 0.1)';

    if (trendKey === 'governance') {
        datasetLabel = 'Governance Index';
        datasetData = trendData.governance;
        borderColor = '#8B5CF6';
        gradientFill = 'rgba(139, 92, 246, 0.1)';
    } else if (trendKey === 'satisfaction') {
        datasetLabel = 'Citizen Satisfaction (%)';
        datasetData = trendData.satisfaction;
        borderColor = '#10B981';
        gradientFill = 'rgba(16, 185, 129, 0.1)';
    } else if (trendKey === 'delivery') {
        datasetLabel = 'Avg. Delivery (Days)';
        datasetData = trendData.delivery;
        borderColor = '#06B6D4';
        gradientFill = 'rgba(6, 182, 212, 0.1)';
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: datasetLabel,
                data: datasetData,
                borderColor: borderColor,
                backgroundColor: gradientFill,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#9CA3AF' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF' }
                }
            }
        }
    });
}

function renderDepartmentRankings() {
    const listElement = document.getElementById('dept-rankings');
    if (!listElement) return;

    listElement.innerHTML = departmentRankings.map((dept, index) => `
        <div class="ranking-item">
            <div class="ranking-rank ${dept.class}">${index + 1}</div>
            <div class="ranking-details">
                <span class="ranking-dept">${dept.name}</span>
                <span class="ranking-metric">Growth: ${dept.trend}</span>
            </div>
            <span class="ranking-score">${dept.score}</span>
        </div>
    `).join('');
}

function renderAnomalyFeed() {
    const feedElement = document.getElementById('anomaly-feed');
    if (!feedElement) return;

    feedElement.innerHTML = mockAnomalies.map(anomaly => {
        let iconName = 'alert-triangle';
        if (anomaly.severity === 'critical') iconName = 'shield-alert';
        if (anomaly.severity === 'info') iconName = 'info';

        return `
            <div class="anomaly-item ${anomaly.severity}">
                <i data-lucide="${iconName}" class="anomaly-icon"></i>
                <div class="anomaly-details">
                    <div class="anomaly-title-row">
                        <span class="anomaly-title">${anomaly.title}</span>
                        <span class="anomaly-time">${anomaly.time}</span>
                    </div>
                    <p class="anomaly-desc">${anomaly.desc}</p>
                </div>
            </div>
        `;
    }).join('');

    // re-initialize icons inside anomaly feed
    if (window.lucide) {
        window.lucide.createIcons({
            attrs: {
                class: ['anomaly-icon']
            }
        });
    }
}

function setupEventListeners() {
    // Sector Select Filter
    const sectorFilter = document.getElementById('sector-chart-filter');
    if (sectorFilter) {
        sectorFilter.addEventListener('change', (e) => {
            initSectorChart(e.target.value);
        });
    }

    // Trend Tab switchers
    const trendButtons = document.querySelectorAll('[data-trend]');
    trendButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            trendButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            initTrendChart(btn.dataset.trend);
        });
    });

    // Refresh anomalies button simulation
    const refreshBtn = document.getElementById('refresh-anomalies-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('rotating');
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                // Shuffle mock anomalies for demonstration
                mockAnomalies.unshift(mockAnomalies.pop());
                renderAnomalyFeed();
                
                refreshBtn.classList.remove('rotating');
                refreshBtn.disabled = false;
            }, 1000);
        });
    }
}

export function refreshDashboardCharts() {
    if (sectorChart) sectorChart.resize();
    if (trendChart) trendChart.resize();
}
