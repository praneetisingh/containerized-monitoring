const injectedMonitor = '__MONITOR_API_URL__';
const MONITOR_API = injectedMonitor.startsWith('__') ? 'http://localhost:8001' : injectedMonitor;

const injectedUser = '__USER_SERVICE_URL__';
const USER_SERVICE = injectedUser.startsWith('__') ? 'http://localhost:5001' : injectedUser;

const injectedOrder = '__ORDER_SERVICE_URL__';
const ORDER_SERVICE = injectedOrder.startsWith('__') ? 'http://localhost:5002' : injectedOrder;

// VERCEL PRODUCTION MOCK INTERCEPTOR
const IS_SERVERLESS = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

if (IS_SERVERLESS) {
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const url = arguments[0];
        if (url.includes(USER_SERVICE) || url.includes(ORDER_SERVICE)) {
            // Emulate slight network latency
            await new Promise(r => setTimeout(r, 600));
            // Simulate chaos test dropping the container
            if (Math.random() > 0.8) {
                // If it fails, we dispatch a custom event to sync with the other tab (if they open side by side)
                localStorage.setItem('chaos_trigger', Date.now()); 
                return new Response("Chaos Drop", {status: 500});
            }
            // Sync success logs
            localStorage.setItem('success_trigger', Date.now());
            return new Response("Success", {status: 200});
        }
        return originalFetch.apply(this, arguments);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const statusMsg = document.getElementById('checkout-status');
    const errBanner = document.getElementById('connection-error');

    loginBtn.addEventListener('click', async () => {
        loginBtn.textContent = 'Authenticating User...';
        try {
            const resp = await fetch(`${USER_SERVICE}/success`);
            if (!resp.ok) throw new Error("Connection failed");
            loginBtn.textContent = 'Authenticated. Telemetry Sent.';
            setTimeout(() => loginBtn.textContent = 'Authenticate (User Service)', 2000);
        } catch (e) {
            loginBtn.textContent = 'Authentication Service Down ❌';
            setTimeout(() => loginBtn.textContent = 'Authenticate (User Service)', 2000);
        }
    });

    checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.textContent = 'Processing Transaction...';
        checkoutBtn.style.opacity = '0.7';
        statusMsg.textContent = '';
        errBanner.style.display = 'none';

        try {
            const resp = await fetch(`${ORDER_SERVICE}/success`);
            if (!resp.ok) throw new Error("Connection dropped");
            
            checkoutBtn.textContent = 'Purchase Confirmed!';
            checkoutBtn.style.background = '#4ade80';
            statusMsg.textContent = 'Log sent to Dashboard via Order Service.';
            
            setTimeout(() => {
                checkoutBtn.textContent = 'Pre-Order Now (Order Service)';
                checkoutBtn.style.background = 'var(--brand)';
                checkoutBtn.style.opacity = '1';
                statusMsg.textContent = '';
            }, 3000);
        } catch (e) {
            checkoutBtn.textContent = 'Transaction Failed ❌';
            checkoutBtn.style.background = '#ef4444';
            errBanner.style.display = 'block';
            
            setTimeout(() => {
                checkoutBtn.textContent = 'Pre-Order Now (Order Service)';
                checkoutBtn.style.background = 'var(--brand)';
                checkoutBtn.style.opacity = '1';
                errBanner.style.display = 'none';
            }, 4000);
        }
    });
});
