const injectedMonitor = '__MONITOR_API_URL__';
const MONITOR_API = injectedMonitor.startsWith('__') ? 'http://localhost:8001' : injectedMonitor;

const injectedUser = '__USER_SERVICE_URL__';
const USER_SERVICE = injectedUser.startsWith('__') ? 'http://localhost:5001' : injectedUser;

const injectedOrder = '__ORDER_SERVICE_URL__';
const ORDER_SERVICE = injectedOrder.startsWith('__') ? 'http://localhost:5002' : injectedOrder;

const uiElements = {
    apiStatus: document.getElementById('api-status'),
    apiStatusText: document.querySelector('#api-status span'),
    countInfo: document.getElementById('count-info'),
    countWarning: document.getElementById('count-warning'),
    countError: document.getElementById('count-error'),
    countCritical: document.getElementById('count-critical'),
    logTerminal: document.getElementById('log-terminal'),
    filterBtns: document.querySelectorAll('.pill-btn'),
    hwCpuText: document.getElementById('hw-cpu-text'),
    hwCpuBar: document.getElementById('hw-cpu-bar'),
    hwRamText: document.getElementById('hw-ram-text'),
    hwRamBar: document.getElementById('hw-ram-bar')
};

let currentFilter = 'ALL';
let isAutoScrolling = true;
let trafficChart;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Log Incidence Rate',
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: true,
                data: []
            }, {
                label: 'Critical Anomalies',
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: true,
                borderDash: [5, 5],
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400, easing: 'linear' },
            scales: {
                y: { display: false, min: 0 },
                x: { display: true, ticks: { maxTicksLimit: 8, color: '#71717a' }, grid: { display: false } }
            },
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// Handle Log Filtering Toggle
uiElements.filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        uiElements.filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-level');
        fetchLogs(); 
    });
});

// Handle Live Search
const searchInput = document.getElementById('log-search');
let currentSearch = '';
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        fetchLogs();
    });
}

// Handle CSV Export
const exportBtn = document.getElementById('export-csv-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
        try {
            let endpoint = currentFilter === 'ALL' ? '/logs' : `/logs/${currentFilter}`;
            if (currentSearch) endpoint += (endpoint.includes('?') ? '&' : '?') + `search=${encodeURIComponent(currentSearch)}`;
            
            const response = await fetch(`${MONITOR_API}${endpoint}`);
            const logs = await response.json();
            
            let csvContent = "data:text/csv;charset=utf-8,Timestamp,Level,Message\n";
            logs.forEach(log => {
                const parts = log.split(' ');
                if (parts.length >= 3) {
                    const datetime = parts[0] + ' ' + parts[1];
                    const level = parts[2];
                    const msg = parts.slice(3).join(' ').replace(/"/g, '""');
                    csvContent += `"${datetime}","${level}","${msg}"\n`;
                } else {
                    csvContent += `"${log.replace(/"/g, '""')}","",""\n`;
                }
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "telemetry_logs.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to export CSV:', error);
        }
    });
}

// Handle Clear Logs
const clearLogsBtn = document.getElementById('clear-logs-btn');
if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
        try {
            await fetch(`${MONITOR_API}/logs`, { method: 'DELETE' });
            fetchSummary();
            fetchLogs();
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    });
}

// Auto-scroll logic detection
uiElements.logTerminal.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = uiElements.logTerminal;
    if (scrollHeight - scrollTop - clientHeight > 15) {
        isAutoScrolling = false;
    } else {
        isAutoScrolling = true;
    }
});

// Fetch metrics summary
async function fetchSummary() {
    try {
        const sumResp = await fetch(`${MONITOR_API}/summary`);
        if (!sumResp.ok) throw new Error('API down');
        const data = await sumResp.json();
        
        animateValue(uiElements.countInfo, data.INFO || 0);
        animateValue(uiElements.countWarning, data.WARNING || 0);
        animateValue(uiElements.countError, data.ERROR || 0);
        animateValue(uiElements.countCritical, data.CRITICAL || 0);

        setApiStatus(true);
        
        // Fetch Advanced Heuristics separately
        const analyticsResp = await fetch(`${MONITOR_API}/api/analytics`);
        if (analyticsResp.ok) {
            const aData = await analyticsResp.json();
            
            // Health Score Logic Focus
            const hsElem = document.getElementById('health-score');
            hsElem.textContent = aData.health_score;
            let scoreVal = parseInt(aData.health_score);
            let anomalyBanner = document.getElementById('anomaly-banner');
            
            if (scoreVal < 70) {
                hsElem.style.color = 'var(--color-critical)';
                hsElem.style.textShadow = '0 0 20px rgba(220, 38, 38, 0.5)';
                anomalyBanner.style.display = 'flex';
                document.documentElement.style.setProperty('--border-subtle', 'rgba(220, 38, 38, 0.3)');
            } else if (scoreVal < 90) {
                hsElem.style.color = 'var(--color-warning)';
                anomalyBanner.style.display = 'none';
                document.documentElement.style.setProperty('--border-subtle', '#3f3f46');
            } else {
                hsElem.style.color = 'var(--color-success)';
                anomalyBanner.style.display = 'none';
                document.documentElement.style.setProperty('--border-subtle', '#3f3f46');
            }
            
            // Update the live chart!
            let now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            let errors = (aData.summary.ERROR || 0) + (aData.summary.CRITICAL || 0);
            
            if (trafficChart) {
                trafficChart.data.labels.push(now);
                // Introduce baseline noise so graph isn't entirely flat when empty
                let baselineTraffic = aData.total_analyzed === 0 ? Math.floor(Math.random() * 5) : aData.total_analyzed;
                trafficChart.data.datasets[0].data.push(baselineTraffic);
                trafficChart.data.datasets[1].data.push(errors);
                
                if(trafficChart.data.labels.length > 30) {
                    trafficChart.data.labels.shift();
                    trafficChart.data.datasets[0].data.shift();
                    trafficChart.data.datasets[1].data.shift();
                }
                trafficChart.update();
            }
        }
        
    } catch (error) {
        setApiStatus(false);
        // Force the graph to violently react to the Monitor API being murdered by Chaos Engineering
        if (trafficChart) {
            let now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            trafficChart.data.labels.push(now);
            trafficChart.data.datasets[0].data.push(0); // Zero traffic on blackout
            let currentErr = trafficChart.data.datasets[1].data.length > 0 ? trafficChart.data.datasets[1].data[trafficChart.data.datasets[1].data.length - 1] : 0;
            trafficChart.data.datasets[1].data.push(currentErr + 30); // Spike the red line
            if(trafficChart.data.labels.length > 30) {
                trafficChart.data.labels.shift();
                trafficChart.data.datasets[0].data.shift();
                trafficChart.data.datasets[1].data.shift();
            }
            trafficChart.update();
        }
        // Completely override the health visualizer
        document.getElementById('health-score').textContent = 'SYS.FAIL';
        document.getElementById('health-score').style.color = 'var(--color-critical)';
        document.getElementById('anomaly-banner').style.display = 'flex';
        document.documentElement.style.setProperty('--border-subtle', 'rgba(220, 38, 38, 0.5)');
    }
}

// Fetch Hardware Metrics
async function fetchHardware() {
    try {
        const response = await fetch(`${USER_SERVICE}/metrics`);
        if (response.ok) {
            const data = await response.json();
            
            if (uiElements.hwCpuText) {
                uiElements.hwCpuText.textContent = `${data.cpu.toFixed(1)}%`;
                uiElements.hwCpuBar.style.width = `${data.cpu}%`;
                if (data.cpu > 80) uiElements.hwCpuBar.style.background = 'var(--color-critical)';
                else if (data.cpu > 50) uiElements.hwCpuBar.style.background = 'var(--color-warning)';
                else uiElements.hwCpuBar.style.background = 'var(--color-brand)';

                uiElements.hwRamText.textContent = `${data.ram.toFixed(1)}%`;
                uiElements.hwRamBar.style.width = `${data.ram}%`;
                if (data.ram > 85) uiElements.hwRamBar.style.background = 'var(--color-critical)';
                else if (data.ram > 60) uiElements.hwRamBar.style.background = 'var(--color-warning)';
                else uiElements.hwRamBar.style.background = 'var(--color-info)';
            }
        }
    } catch (e) {
        console.error("Failed to fetch hardware metrics");
    }
}

// Number animation function
function animateValue(obj, end) {
    const start = parseInt(obj.textContent) || 0;
    if (start === end) return;
    
    // Smooth transition
    const duration = 600; 
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(start + (end - start) * ease);
        
        obj.textContent = currentVal;
        
        if (progress < 1) requestAnimationFrame(update);
        else obj.textContent = end;
    }
    requestAnimationFrame(update);
}

// Fetch live logs
async function fetchLogs() {
    try {
        let endpoint = currentFilter === 'ALL' ? '/logs' : `/logs/${currentFilter}`;
        if (currentSearch) {
            endpoint += (endpoint.includes('?') ? '&' : '?') + `search=${encodeURIComponent(currentSearch)}`;
        }
        
        const response = await fetch(`${MONITOR_API}${endpoint}`);
        if (!response.ok) throw new Error('API down');
        const logs = await response.json();
        
        renderLogs(logs);
        setApiStatus(true);
    } catch (error) {
        setApiStatus(false);
    }
}

function renderLogs(logs) {
    uiElements.logTerminal.innerHTML = '';
    
    if (logs.length === 0) {
        uiElements.logTerminal.innerHTML = '<div class="log-waiting">> No logs intercepted yet...</div>';
        return;
    }

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-line';
        
        const parts = log.split(' ');
        if (parts.length >= 3) {
            const date = parts[0];
            const time = parts[1].split(',')[0]; // Simplify time by removing ms
            const level = parts[2];
            let msg = parts.slice(3).join(' ');
            
            // Basic formatting logic for different log levels
            div.classList.add(`log-${level}`);
            
            div.innerHTML = `
                <div class="log-timestamp">${time}</div>
                <div class="log-badge">${level}</div>
                <div class="log-msg">${msg}</div>
            `;
        } else {
            div.textContent = log;
        }
        
        uiElements.logTerminal.appendChild(div);
    });

    if (isAutoScrolling) {
        uiElements.logTerminal.scrollTop = uiElements.logTerminal.scrollHeight;
    }
}

// Trigger Demo App actions 
async function triggerEndpoint(path) {
    let targetService = Math.random() > 0.5 ? USER_SERVICE : ORDER_SERVICE;
    try {
        const resp = await fetch(`${targetService}${path}`);
        if (!resp.ok && resp.status !== 400 && resp.status !== 500) {
            throw new Error("HTTP Drop");
        }
    } catch (error) {
        // Container was murdered by Chaos Script! Directly force a Critical Log to the Monitor API
        console.error(`Chaos Extinction detected on ${targetService}:`, error);
        
        let now = new Date().toISOString().replace('T', ' ').substring(0, 23);
        const deadLog = `${now} CRITICAL [CONTAINER BLACKOUT] Target microservice connection instantly refused. Node eviction suspected!`;
        
        // Push fake log
        fetch(`${MONITOR_API}/logs/ingest`, {
            method: 'POST',
            headers:{'Content-Type': 'application/json'},
            body: JSON.stringify({log: deadLog})
        }).catch(e => {}); // ignore if Api is also dead
    } 
        
    // Fast-refresh UI to make it feel extremely responsive
        setTimeout(fetchSummary, 200);
        setTimeout(fetchLogs, 250);
        setTimeout(fetchSummary, 600);
        setTimeout(fetchLogs, 650);

}

// Status UI Handler
function setApiStatus(isOnline) {
    if (isOnline) {
        uiElements.apiStatus.className = 'connection-status online';
        uiElements.apiStatusText.textContent = 'System Online';
    } else {
        uiElements.apiStatus.className = 'connection-status offline';
        uiElements.apiStatusText.textContent = 'Disconnected';
    }
}

// Automatic Autopilot Traffic Generator
let autopilotActive = false;
function startAutopilot() {
    if (autopilotActive) return;
    autopilotActive = true;
    
    // Periodically throw traffic at the backend so the graph isn't a flat zero line
    setInterval(() => {
        let r = Math.random();
        if (r > 0.8) {
            triggerEndpoint('/success');
            triggerEndpoint('/load');
        } else if (r > 0.6) {
            triggerEndpoint('/load');
        }
    }, 2000);
}

// Start continuous polling sequence
function launchTelemetry() {
    fetchSummary();
    fetchLogs();
    fetchHardware();
    startAutopilot();
    
    // Poll every 1.5s
    setInterval(() => {
        fetchSummary();
        fetchLogs();
        fetchHardware();
    }, 1500);
}

// Init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const authBtn = document.getElementById('auth-btn');
    const authInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');

    function attemptLogin() {
        if (authInput.value === 'admin123') {
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                appContainer.style.display = 'flex';
                initChart(); // Initialize chart when DOM is visible
                launchTelemetry();
            }, 500);
        } else {
            authError.style.display = 'block';
            authInput.value = '';
            authInput.focus();
        }
    }

    if (authBtn) {
        authBtn.addEventListener('click', attemptLogin);
        authInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
        authInput.focus();
    } else {
        initChart();
        launchTelemetry();
    }
});
