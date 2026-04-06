
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show prompt for iOS after a small delay
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    // 3. Handle Android/Desktop "beforeinstallprompt"
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent default mini-infobar
      setDeferredPrompt(e);
      // Show custom UI
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-[400px]"
      >
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-black/50 rounded-2xl p-5 relative overflow-hidden">
          
          {/* Close Button */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex gap-4 items-start">
            {/* App Icon Area */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center shadow-lg shrink-0">
               <img src="https://i.ibb.co/KzXXK3rZ/core-tab-icon.png" alt="Icon" className="w-12 h-12 rounded-xl" />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight mb-1">
                앱으로 더 쾌적하게
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-3">
                Core Tab을 홈 화면에 추가하여<br/>
                전체 화면으로 몰입하세요.
              </p>

              {isIOS ? (
                // iOS Instructions
                <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <Share size={14} className="text-blue-500" />
                    <span><span className="font-bold">공유</span> 버튼을 누르고</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlusSquare size={14} className="text-zinc-500" />
                    <span><span className="font-bold">홈 화면에 추가</span>를 선택하세요</span>
                  </div>
                </div>
              ) : (
                // Android/Desktop Button
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    나중에
                  </button>
                  <button 
                    onClick={handleInstallClick}
                    className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-orange-500 text-white text-xs font-bold hover:bg-black dark:hover:bg-orange-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    설치하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
