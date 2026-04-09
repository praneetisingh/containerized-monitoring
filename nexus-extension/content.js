// Inject an invisible script into the page to catch raw window errors
const script = document.createElement('script');
script.textContent = `
    // Hijack console.error
    const originalConsoleError = console.error;
    console.error = function() {
        const message = Array.from(arguments).join(' ');
        window.postMessage({ type: 'NEXUS_ERROR', payload: message, level: 'ERROR' }, '*');
        originalConsoleError.apply(console, arguments);
    };

    // Hijack console.warn
    const originalConsoleWarn = console.warn;
    console.warn = function() {
        const message = Array.from(arguments).join(' ');
        window.postMessage({ type: 'NEXUS_ERROR', payload: message, level: 'WARNING' }, '*');
        originalConsoleWarn.apply(console, arguments);
    };

    // Catch unhandled exceptions
    window.addEventListener('error', function(event) {
        window.postMessage({ type: 'NEXUS_ERROR', payload: event.message, level: 'CRITICAL' }, '*');
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        window.postMessage({ type: 'NEXUS_ERROR', payload: 'Promise Rejection: ' + event.reason, level: 'CRITICAL' }, '*');
    });
`;
(document.head || document.documentElement).appendChild(script);

// Listen for the hijacked messages from the page
window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'NEXUS_ERROR') return;
    
    const { payload, level } = event.data;
    
    // Format the date EXACTLY how the Monitor API expects it so the charts don't break!
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = \`\${now.getFullYear()}-\${pad(now.getMonth()+1)}-\${pad(now.getDate())} \${pad(now.getHours())}:\${pad(now.getMinutes())}:\${pad(now.getSeconds())}\`;
    
    // The exact string format expected by the api regex
    const logString = \`\${timestamp} - \${level} - [Nexus Extension via \${window.location.hostname}] \${payload}\`;
    
    // Send to Monitor API
    fetch('http://localhost:8000/logs/ingest', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log: logString })
    }).catch(e => console.log('Nexus Backend Offline', e));

    // Display aggressive visual popup immediately!
    showErrorPopup(\`Caught \${level}: \${payload}\`);
});

// The UI code to inject a red warning box into whatever website you visit
function showErrorPopup(msg) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.backgroundColor = '#ff2a2a';
    div.style.color = 'white';
    div.style.padding = '15px 20px';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'monospace';
    div.style.zIndex = '2147483647';
    div.style.boxShadow = '0 10px 25px rgba(255, 0, 0, 0.4)';
    div.style.border = '1px solid #ffaaaa';
    div.style.maxWidth = '300px';
    div.style.fontSize = '12px';
    div.style.transition = 'all 0.3s ease';
    
    div.innerHTML = \`<strong style="font-size:14px;display:block;margin-bottom:5px;">⚠️ Nexus Tracker Alert</strong>\${msg}\`;
    
    document.body.appendChild(div);
    
    // Animate removal after 4 seconds
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        setTimeout(() => div.remove(), 300);
    }, 4000);
}
