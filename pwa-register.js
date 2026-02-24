// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // התיקון הקריטי: הוספת נקודה לפני הסלאש כדי שהנתיב יהיה יחסי לתיקייה הנוכחית
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registered successfully:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            if (confirm('גרסה חדשה זמינה! לרענן את האפליקציה?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('❌ Service Worker registration failed:', error);
            });
    });
}

// Install prompt for PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 PWA install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button/banner
    showInstallPromotion();
});

window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully!');
    deferredPrompt = null;
});

// Optional: Show install promotion
function showInstallPromotion() {
    // מניעת כפילות של הבאנר
    if (document.getElementById('pwa-install-banner')) return;

    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #58a6ff 0%, #4a8fd8 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        gap: 12px;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
        direction: rtl;
        width: 90%;
        max-width: 400px;
    `;
    
    installBanner.innerHTML = `
        <span style="flex: 1; font-size: 14px;">התקן את האפליקציה למסך הבית 📱</span>
        <button id="pwa-install-btn" style="
            background: white;
            color: #58a6ff;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
        ">התקן</button>
        <button id="pwa-dismiss-btn" style="
            background: transparent;
            color: white;
            border: none;
            padding: 8px;
            cursor: pointer;
            font-size: 1.2em;
        ">✕</button>
    `;
    
    document.body.appendChild(installBanner);
    
    // Install button click
    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        installBanner.remove();
    });
    
    // Dismiss button click
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        installBanner.remove();
    });
}
