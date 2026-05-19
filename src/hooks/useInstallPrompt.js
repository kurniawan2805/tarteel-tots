import { useState, useEffect } from 'react';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return standalone && !isIOS;
  });
  const [dismissCount, setDismissCount] = useState(() => {
    const saved = localStorage.getItem('pwaPromptDismissCount');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) return;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 10 seconds of using the app
      // Only suppress on multiple consecutive dismissals (>3)
      const shouldShow = dismissCount < 3;
      if (shouldShow) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 10000);

        return () => clearTimeout(timer);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);
      localStorage.setItem('pwaInstalled', 'true');
      localStorage.removeItem('pwaPromptDismissCount');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissCount]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      localStorage.removeItem('pwaPromptDismissCount');
    }
    
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Soft approach: increment dismiss count (allow up to 3 re-prompts)
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    localStorage.setItem('pwaPromptDismissCount', String(newCount));
  };

  return {
    deferredPrompt,
    showPrompt,
    isInstalled,
    handleInstall,
    handleDismiss,
    dismissCount
  };
}
