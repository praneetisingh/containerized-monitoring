const MONITOR_API = 'http://localhost:8000';
const DEMO_APP = 'http://localhost:5000';

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
        const response = await fetch(`${MONITOR_API}/summary`);
        if (!response.ok) throw new Error('API down');
        const data = await response.json();
        
        animateValue(uiElements.countInfo, data.INFO || 0);
        animateValue(uiElements.countWarning, data.WARNING || 0);
        animateValue(uiElements.countError, data.ERROR || 0);
        animateValue(uiElements.countCritical, data.CRITICAL || 0);

        setApiStatus(true);
    } catch (error) {
        setApiStatus(false);
    }
}

// Fetch Hardware Metrics
async function fetchHardware() {
    try {
        const response = await fetch(`${DEMO_APP}/metrics`);
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
    try {
        fetch(`${DEMO_APP}${path}`).catch(e => console.error(e));
        
        // Fast-refresh UI to make it feel extremely responsive
        setTimeout(fetchSummary, 200);
        setTimeout(fetchLogs, 250);
        setTimeout(fetchSummary, 600);
        setTimeout(fetchLogs, 650);
    } catch (error) {
        console.error(`Failed to trigger ${path}:`, error);
    }
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

// Start continuous polling sequence
function launchTelemetry() {
    fetchSummary();
    fetchLogs();
    fetchHardware();
    
    // Poll every 1.5s
    setInterval(() => {
        fetchSummary();
        fetchLogs();
        fetchHardware();
    }, 1500);
}

// Init when DOM is ready
document.addEventListener('DOMContentLoaded', launchTelemetry);
