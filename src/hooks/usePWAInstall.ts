import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const checkStandaloneStatus = () => {
    if (typeof window === 'undefined') return false;
    const standaloneMatch =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    return standaloneMatch;
  };

  useEffect(() => {
    setIsInstalled(checkStandaloneStatus());

    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile|tablet/.test(userAgent);

      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
      setIsMobile(isMobileDevice);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar so we control the exact moment of install prompt
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      // Store event safely so it can be triggered on user click
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('lms_pwa_installed_confirmed', 'true');
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem('lms_pwa_installed_confirmed', 'true');
        } catch (err) {
          // ignore
        }
        return true;
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
    return false;
  };

  const confirmInstalled = () => {
    setIsInstalled(true);
    try {
      localStorage.setItem('lms_pwa_installed_confirmed', 'true');
    } catch (err) {
      // ignore
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    install,
    confirmInstalled,
    recheckStandalone: () => {
      const res = checkStandaloneStatus();
      setIsInstalled(res);
      return res;
    },
  };
}
