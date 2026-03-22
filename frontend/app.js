const MONITOR_API = 'http://localhost:8000';
const DEMO_APP = 'http://localhost:5000';

const uiElements = {
    apiStatus: document.getElementById('api-status'),
    countInfo: document.getElementById('count-info'),
    countWarning: document.getElementById('count-warning'),
    countError: document.getElementById('count-error'),
    countCritical: document.getElementById('count-critical'),
    logTerminal: document.getElementById('log-terminal'),
    filterBtns: document.querySelectorAll('.filter-btn'),
};

let currentFilter = 'ALL';
let isAutoScrolling = true;

// Handle Log Filtering
uiElements.filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        uiElements.filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-level');
        fetchLogs(); // refresh immediately
    });
});

// Auto-scroll logic detection
uiElements.logTerminal.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = uiElements.logTerminal;
    // If user scrolled up manually, turn off auto-scroll
    if (scrollHeight - scrollTop - clientHeight > 10) {
        isAutoScrolling = false;
    } else {
        isAutoScrolling = true;
    }
});

// Fetch metrics summary
async function fetchSummary() {
    try {
        const response = await fetch(`${MONITOR_API}/summary`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Ensure keys exist, default to 0
        animateValue(uiElements.countInfo, data.INFO || 0);
        animateValue(uiElements.countWarning, data.WARNING || 0);
        animateValue(uiElements.countError, data.ERROR || 0);
        animateValue(uiElements.countCritical, data.CRITICAL || 0);

        setApiStatus(true);
    } catch (error) {
        console.error("Error fetching summary:", error);
        setApiStatus(false);
    }
}

function animateValue(obj, end) {
    const start = parseInt(obj.textContent) || 0;
    if (start === end) return;
    
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing out function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(start + (end - start) * easeOut);
        
        obj.textContent = currentVal;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            obj.textContent = end;
        }
    }
    requestAnimationFrame(update);
}

// Fetch live logs
let lastLogCount = 0;

async function fetchLogs() {
    try {
        const endpoint = currentFilter === 'ALL' ? '/logs' : `/logs/${currentFilter}`;
        const response = await fetch(`${MONITOR_API}${endpoint}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const logs = await response.json();
        
        renderLogs(logs);
        setApiStatus(true);
    } catch (error) {
        console.error("Error fetching logs:", error);
        setApiStatus(false);
    }
}

function renderLogs(logs) {
    // Only clear if empty or completely changed
    uiElements.logTerminal.innerHTML = '';
    
    if (logs.length === 0) {
        uiElements.logTerminal.innerHTML = '<div class="log-line" style="color: var(--text-muted)">> Waiting for logs...</div>';
        return;
    }

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-line';
        
        // Basic parsing of the log line "2023-10-10 12:00:00,000 INFO message..."
        const parts = log.split(' ');
        if (parts.length >= 3) {
            const date = parts[0];
            const time = parts[1];
            const level = parts[2];
            const msg = parts.slice(3).join(' ');
            
            div.innerHTML = `<span class="log-timestamp">[${date} ${time}]</span> <span class="log-${level}">${level}</span> <span class="log-msg">${msg}</span>`;
        } else {
            div.textContent = log;
        }
        
        uiElements.logTerminal.appendChild(div);
    });

    if (isAutoScrolling) {
        uiElements.logTerminal.scrollTop = uiElements.logTerminal.scrollHeight;
    }
}

// Trigger actions on the Demo App
async function triggerEndpoint(path) {
    try {
        const response = await fetch(`${DEMO_APP}${path}`);
        console.log(`Triggered ${path}:`, response.statusText);
        
        // Immediately trigger a fetch to make UI feel responsive
        setTimeout(() => {
            fetchSummary();
            fetchLogs();
        }, 500); // give app a moment to write to file
        
    } catch (error) {
        console.error(`Failed to trigger ${path}:`, error);
        alert(`Failed to trigger demo app endpoint. Ensure demo_app is running and CORS is enabled.`);
    }
}

function setApiStatus(isOnline) {
    if (isOnline) {
        uiElements.apiStatus.textContent = 'API Connected';
        uiElements.apiStatus.className = 'status-badge';
    } else {
        uiElements.apiStatus.textContent = 'API Disconnected';
        uiElements.apiStatus.className = 'status-badge error';
    }
}

// Polling loop
function startPolling() {
    fetchSummary();
    fetchLogs();
    
    // Refresh every 2 seconds
    setInterval(() => {
        fetchSummary();
        fetchLogs();
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', startPolling);
