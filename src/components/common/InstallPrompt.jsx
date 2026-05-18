import { useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function InstallPrompt() {
  const { showPrompt, isInstalled, handleInstall, handleDismiss } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwaPromptDismissed') === 'true');
  const [isIOS] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));

  if (isInstalled || dismissed || !showPrompt) {
    return null;
  }

  const handleDismissClick = () => {
    setDismissed(true);
    handleDismiss();
  };

  const handleInstallClick = async () => {
    await handleInstall();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-lg shadow-lg p-4 sm:max-w-md sm:left-auto sm:right-4 animate-slide-up z-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-1">
          {isIOS ? '📱' : '💚'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-emerald-900 mb-1">
            {isIOS ? 'Install Tarteel Tots' : 'Get Tarteel Tots on Your Device'}
          </h3>
          <p className="text-sm text-emerald-800 mb-3">
            {isIOS
              ? 'Tap the Share icon and select "Add to Home Screen" for quick access'
              : 'Install as an app for faster access and better performance'}
          </p>
          <div className="flex gap-2">
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Install
              </button>
            )}
            <button
              onClick={handleDismissClick}
              className="px-3 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 text-sm font-medium rounded-md transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismissClick}
          className="text-emerald-600 hover:text-emerald-900 flex-shrink-0 text-lg"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
