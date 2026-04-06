import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, LogOut, LayoutDashboard, Share2, ChevronDown, ChevronRight, Search, FileText } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  reminderInterval: number;
  setReminderInterval: (val: number) => void;
  user: User | null;
  currentView?: 'home' | 'tabboard';
  setCurrentView?: (v: 'home' | 'tabboard') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  reminderInterval,
  setReminderInterval,
  user,
  currentView = 'home',
  setCurrentView,
}) => {
  const [notifExpanded, setNotifExpanded] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [pendingInterval, setPendingInterval] = useState<number>(0);

  const handleIntervalChange = (val: number) => {
    if (val > 0 && Notification.permission !== 'granted') {
      // 처음 알림 설정할 때만 팝업 표시
      setPendingInterval(val);
      setShowNotifPopup(true);
    } else {
      setReminderInterval(val);
    }
  };

  const handleRequestPermission = async () => {
    // Electron 환경: 시스템 설정으로 이동
    if ((window as any).electronAPI?.openNotificationSettings) {
      (window as any).electronAPI.openNotificationSettings();
    } else {
      // 웹 환경: 브라우저 권한 요청
      await Notification.requestPermission();
    }
    setReminderInterval(pendingInterval);
    setShowNotifPopup(false);
  };

  const handleDismissPopup = () => {
    setReminderInterval(pendingInterval);
    setShowNotifPopup(false);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const notifOptions = [
    { label: '끄기', value: 0 },
    { label: '30분마다', value: 30 },
    { label: '1시간마다', value: 60 },
    { label: '2시간마다', value: 120 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-zinc-900/30 backdrop-blur-sm dark:bg-black/50"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-60 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-xl z-[101] flex flex-col"
          >
            {/* Header: App Brand */}
            <div className="px-4 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shadow shrink-0">
                    <img src="/logo.png" alt="Core Tab" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">CORE TAB</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">Priority Focus System</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 shrink-0"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-transparent dark:border-zinc-700">
                <Search size={13} className="text-zinc-400 shrink-0" />
                <span className="text-[13px] text-zinc-400">Search</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
              {setCurrentView && (
                <div className="px-2 mb-1">
                  <button
                    onClick={() => { setCurrentView('home'); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      currentView === 'home'
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <LayoutDashboard size={16} className="shrink-0" />
                    <span className="flex-1 text-left">Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('tabboard'); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      currentView === 'tabboard'
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Share2 size={16} className="shrink-0" />
                    <span className="flex-1 text-left">탭 보드</span>
                  </button>
                </div>
              )}

              <div className="mx-3 my-2 border-t border-zinc-100 dark:border-zinc-800" />

              {/* Notifications (collapsible) */}
              <div className="px-2">
                <button
                  onClick={() => setNotifExpanded(!notifExpanded)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all"
                >
                  <Bell size={16} className="shrink-0" />
                  <span className="flex-1 text-left">알림 설정</span>
                  {notifExpanded
                    ? <ChevronDown size={14} className="shrink-0 text-zinc-400" />
                    : <ChevronRight size={14} className="shrink-0 text-zinc-400" />
                  }
                </button>

                <AnimatePresence initial={false}>
                  {notifExpanded && (
                    <motion.div
                      key="notif-options"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 pt-0.5 pb-1 flex flex-col gap-0.5">
                        {notifOptions.map((opt) => {
                          const isSelected = reminderInterval === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleIntervalChange(opt.value)}
                              className={`flex items-center gap-3 px-3 py-1.5 text-[13px] rounded-lg transition-all text-left ${
                                isSelected
                                  ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10'
                                  : 'text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}
                            >
                              {opt.value === 0
                                ? <BellOff size={14} className="shrink-0" />
                                : <Bell size={14} className="shrink-0" />
                              }
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-2 mt-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all">
                  <FileText size={16} className="shrink-0" />
                  <span className="flex-1 text-left">Documentation</span>
                </button>
              </div>
            </div>

            {/* Footer: User Profile */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-2 py-2">
              {user ? (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <img
                    src={user.photoURL || ''}
                    alt="Profile"
                    className="w-7 h-7 rounded-full bg-zinc-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate leading-tight">{user.displayName}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="로그아웃"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-sm">👋</span>
                  </div>
                  <span className="flex-1 text-[13px] text-zinc-500">로그인 필요</span>
                  <button
                    onClick={handleLogin}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    로그인
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Notification Permission Popup */}
          <AnimatePresence>
            {showNotifPopup && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-6"
              >
                <div
                  className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-5 w-full max-w-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Bell size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">알림 권한이 필요해요</p>
                      <p className="text-[11px] text-zinc-400">리마인더를 받으려면 허용해주세요</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                    {(window as any).electronAPI?.isElectron
                      ? '시스템 설정 → 알림에서 Core Tab을 허용해주세요.'
                      : '설정한 간격마다 진행 중인 작업을 리마인드해드립니다.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDismissPopup}
                      className="flex-1 py-2 rounded-lg text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
                    >
                      나중에
                    </button>
                    <button
                      onClick={handleRequestPermission}
                      className="flex-1 py-2 rounded-lg text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      {(window as any).electronAPI?.isElectron ? '설정 열기' : '허용하기'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
