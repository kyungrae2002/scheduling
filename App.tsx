
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Moon, Sun, Menu as MenuIcon, Sparkles } from 'lucide-react';
import { Task, TaskFormData, DEFAULT_CATEGORIES } from './types';
import { generateId, calculatePriorityScore, trackEvent, calculateTodayEnergy } from './utils';
import { MultitapCard } from './components/MultitapCard';
import { TaskDashboard } from './components/TaskDashboard';
import { AddTaskModal } from './components/AddTaskModal';
import { EnergyStats } from './components/EnergyStats';
import { EnergyBillModal } from './components/EnergyBillModal';
import { InstallPrompt } from './components/InstallPrompt';
import { AIBrainDumpModal } from './components/AIBrainDumpModal';
import { Sidebar } from './components/Sidebar';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CrewLeaderboard } from './components/CrewLeaderboard';
import { TabBoard } from './components/TabBoard/TabBoard';
import { PomodoroSessionResult } from './components/PomodoroTimer';

// Electron 환경 감지
const isElectronApp = !!(window as any).electronAPI?.isElectron;

const App: React.FC = () => {
  // Data State - Initialize from LocalStorage
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('core_tab_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('core_tab_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIBrainDumpOpen, setIsAIBrainDumpOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [reminderInterval, setReminderInterval] = useState<number>(() => {
    const saved = localStorage.getItem('core_tab_reminder_interval');
    return saved ? parseInt(saved, 10) : 0; 
  });
  
  const lastNotifiedIndexRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);
  const [rightTab, setRightTab] = useState<'energy' | 'crew'>('energy');
  const [currentView, setCurrentView] = useState<'home' | 'tabboard'>('home');

  // Firebase Auth AuthState Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
      return localStorage.getItem('core_tab_theme') === 'dark';
  });

  // 활성 태스크 메모이제이션 (매 렌더마다 재계산 방지)
  const activeTask = useMemo(() => tasks.find(t => t.isActive) ?? null, [tasks]);

  // Persist Tasks to LocalStorage (300ms 디바운스 - 빠른 연속 변경 시 과도한 I/O 방지)
  const taskSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (taskSaveTimerRef.current) clearTimeout(taskSaveTimerRef.current);
    taskSaveTimerRef.current = setTimeout(() => {
      localStorage.setItem('core_tab_tasks', JSON.stringify(tasks));
    }, 300);
  }, [tasks]);

  // 포커스 ID 동기화 & 트레이 업데이트 (activeTask 변경 시만)
  useEffect(() => {
    const newFocusId = activeTask?.id ?? null;

    if (activeTask && activeTask.id !== focusId) {
        lastNotifiedIndexRef.current = 0;
    } else if (!activeTask) {
        lastNotifiedIndexRef.current = 0;
    }

    setFocusId(newFocusId);

    if ((window as any).electronAPI?.syncTaskState) {
        (window as any).electronAPI.syncTaskState(
            activeTask ? { id: activeTask.id, title: activeTask.title } : null
        );
    }
  }, [activeTask]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('core_tab_reminder_interval', reminderInterval.toString());
  }, [reminderInterval]);

  // Firebase 리더보드 동기화 (단일 통합 로직)
  // - 비활성 시: tasks 변경 후 60초 디바운스
  // - 집중 중: 90초마다 주기적 동기화
  const firebaseSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user) return;
    if (firebaseSyncRef.current) clearTimeout(firebaseSyncRef.current);
    const delay = activeTask ? 90000 : 60000;
    firebaseSyncRef.current = setTimeout(() => {
      const todayEnergy = calculateTodayEnergy(tasks);
      setDoc(doc(db, 'leaderboard', user.uid), {
        uid: user.uid,
        displayName: user.displayName || '익명 크루',
        photoURL: user.photoURL || '',
        todayEnergy,
        lastUpdated: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }, delay);
    return () => { if (firebaseSyncRef.current) clearTimeout(firebaseSyncRef.current); };
  }, [tasks, user, activeTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for Tray "Turn Off" commands
  useEffect(() => {
    if ((window as any).electronAPI?.onTurnOffTask) {
        (window as any).electronAPI.onTurnOffTask((taskIdToTurnOff: string) => {
            const now = Date.now();
            setTasks(prev => prev.map(t => {
                if (t.id === taskIdToTurnOff && t.isActive) {
                    const startTime = t.lastStartTime || now;
                    const addedTime = (now - startTime) / 1000;
                    const newLog = { startedAt: startTime, duration: addedTime };
                    return {
                        ...t,
                        isActive: false,
                        lastStartTime: null,
                        totalTime: t.totalTime + addedTime,
                        workLogs: [...(t.workLogs || []), newLog]
                    };
                }
                return t;
            }));
            
            // Notification
            if (Notification.permission === 'granted') {
                new Notification("Core Tab", {
                    body: "트레이 메뉴에서 코어를 무사히 껐습니다.",
                    icon: "/logo.png"
                });
            }
        });
    }
  }, []);

  // Persist Categories to LocalStorage
  useEffect(() => {
    localStorage.setItem('core_tab_categories', JSON.stringify(categories));
  }, [categories]);

  // 알림 인터벌 체크 (activeTask/reminderInterval 변경 시만)
  useEffect(() => {
    if (reminderInterval === 0 || !activeTask) return;

    const checkInterval = setInterval(() => {
        if (!activeTask.lastStartTime) return;
        const currentDurationSeconds = activeTask.totalTime + ((Date.now() - activeTask.lastStartTime) / 1000);
        const intervalSeconds = reminderInterval * 60;
        const currentIntervalIndex = Math.floor(currentDurationSeconds / intervalSeconds);

        if (currentIntervalIndex > 0 && currentIntervalIndex > lastNotifiedIndexRef.current) {
            if (Notification.permission === 'granted') {
                new Notification('Core Tab: 리마인더 ⏰', {
                    body: `"${activeTask.title}" 작업에 ${currentIntervalIndex * reminderInterval}분째 집중 중이시네요!`,
                    icon: '/logo.png'
                });
            }
            lastNotifiedIndexRef.current = currentIntervalIndex;
        }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [activeTask, reminderInterval]);

  // Dark Mode Effect
  useEffect(() => {
      localStorage.setItem('core_tab_theme', isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [isDarkMode]);

  // Modals Scroll Lock (배경 스크롤 방지)
  useEffect(() => {
    if (isModalOpen || isAIBrainDumpOpen || isBillModalOpen || isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isAIBrainDumpOpen, isBillModalOpen, isSidebarOpen]);

  // --- Task Handlers ---

  const addTask = useCallback((data: TaskFormData) => {
    const newId = generateId();
    const newTask: Task = {
      id: newId,
      ...data,
      isCompleted: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      totalTime: 0,
      lastStartTime: null,
      workLogs: [],
    };

    setTasks(prev => [...prev, newTask]);
    trackEvent('create_task', { category: newTask.category });
  }, []);

  const updateTask = useCallback((data: TaskFormData) => {
    if (!editingTask) return;
    
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...data } : t));
    setEditingTask(null);
    trackEvent('update_task', { id: editingTask.id });
  }, [editingTask]);

  const toggleFocus = useCallback((id: string) => {
    const now = Date.now();
    lastNotifiedIndexRef.current = 0;

    setTasks(prev => {
        const currentTask = prev.find(t => t.id === id);
        if (!currentTask) return prev;

        if (currentTask.isActive) {
            // Turning OFF
            const startTime = currentTask.lastStartTime || now;
            const addedTime = (now - startTime) / 1000;
            const newLog = { startedAt: startTime, duration: addedTime };
            
            trackEvent('end_focus', { taskId: id });
            return prev.map(t => t.id === id ? {
                ...t,
                isActive: false,
                lastStartTime: null,
                totalTime: t.totalTime + addedTime,
                workLogs: [...(t.workLogs || []), newLog]
            } : t);
        } else {
            // Turning ON: Turn off others first
            trackEvent('start_focus', { taskId: id });
            return prev.map(t => {
                if (t.id === id) {
                    return { ...t, isActive: true, lastStartTime: now };
                }
                if (t.isActive) {
                    const startTime = t.lastStartTime || now;
                    const addedTime = (now - startTime) / 1000;
                    const newLog = { startedAt: startTime, duration: addedTime };
                    return {
                        ...t,
                        isActive: false,
                        lastStartTime: null,
                        totalTime: t.totalTime + addedTime,
                        workLogs: [...(t.workLogs || []), newLog]
                    };
                }
                return t;
            });
        }
    });
  }, []);

  const completeTask = useCallback((id: string) => {
    const now = Date.now();
    
    setTasks(prev => prev.map(task => {
        if (task.id !== id) return task;

        const startTime = task.lastStartTime || now;
        const addedTime = (task.isActive && task.lastStartTime) ? (now - startTime) / 1000 : 0;
        
        let newLogs = task.workLogs || [];
        if (task.isActive && addedTime > 0) {
            newLogs = [...newLogs, { startedAt: startTime, duration: addedTime }];
        }

        return {
            ...task,
            isCompleted: true,
            isActive: false,
            lastStartTime: null,
            completedAt: new Date().toISOString(),
            totalTime: task.totalTime + addedTime,
            workLogs: newLogs
        };
    }));

    trackEvent('complete_task', { taskId: id });
  }, []);

  const deleteTask = useCallback((id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        setTasks(prev => prev.filter(t => t.id !== id));
        trackEvent('delete_task', { taskId: id });
    }
  }, []);

  const openAddModal = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const addCategory = useCallback((newCat: string) => {
      setCategories(prev => prev.includes(newCat) ? prev : [...prev, newCat]);
  }, []);

  const deleteCategory = useCallback((catToDelete: string) => {
      setCategories(prev => {
          if (prev.length <= 1) { alert('최소 하나의 카테고리는 필요합니다.'); return prev; }
          return prev.filter(c => c !== catToDelete);
      });
  }, []);

  // [TabBoard → Dashboard] 메모를 할 일로 전송
  const handleSendToDashboard = useCallback((text: string) => {
    const today = new Date();
    const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 일주일 뒤
      .toISOString().split('T')[0];

    const newTask: Task = {
      id: generateId(),
      title: text,
      category: categories[0] || '업무',
      dueDate,
      impact: 5,
      urgency: 5,
      effort: 5,
      isDomino: false,
      isBlocked: false,
      isCompleted: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      totalTime: 0,
      lastStartTime: null,
      workLogs: [],
    };

    setTasks(prev => [...prev, newTask]);
    setCurrentView('dashboard');
    trackEvent('send_idea_to_dashboard', { from: 'tabboard' });
  }, [categories]);

  // [Step 3 - 포모도로 완료 핸들러]
  // SRP: 알림 발송 / 태스크 누적시간 반영 / IPC 트레이 업데이트 / Firebase 즉시 동기화
  const handlePomodoroSessionComplete = useCallback((result: PomodoroSessionResult) => {
    const { sessionType, duration } = result;

    // 1) 네이티브 알림 발송 (Notification API)
    if (Notification.permission === 'granted') {
      const messages: Record<string, { title: string; body: string }> = {
        work:       { title: 'Core Tab 🍅 집중 완료!',    body: `${Math.round(duration / 60)}분 집중했어요. 잠깐 쉬어가세요!` },
        shortBreak: { title: 'Core Tab ☕ 휴식 끝!',      body: '다시 집중할 준비가 됐나요?' },
        longBreak:  { title: 'Core Tab 🛌 긴 휴식 끝!',   body: '새로운 사이클을 시작해볼까요?' },
      };
      const msg = messages[sessionType];
      if (msg) {
        try {
          new Notification(msg.title, { body: msg.body, icon: '/logo.png' });
        } catch (err) {
          console.error('[Pomodoro] Notification error:', err);
        }
      }
    }

    // 2) work 세션 완료 시: 활성 태스크에 누적 시간 + workLog 추가
    if (sessionType === 'work' && duration > 0) {
      const now = Date.now();
      setTasks(prev => prev.map(t => {
        if (!t.isActive) return t;
        const newLog = { startedAt: now - duration * 1000, duration };
        return {
          ...t,
          totalTime: t.totalTime + duration,
          workLogs: [...(t.workLogs || []), newLog],
        };
      }));

      // 3) [Step 3 - Firebase] 포모도로 완료 시 Crew 리더보드 즉시 동기화
      if (user) {
        const todayEnergy = calculateTodayEnergy(tasks) + duration; // 방금 추가분 포함
        setDoc(doc(db, 'leaderboard', user.uid), {
          uid: user.uid,
          displayName: user.displayName || '익명 크루',
          photoURL: user.photoURL || '',
          todayEnergy,
          lastUpdated: serverTimestamp(),
        }, { merge: true }).catch(err => console.error('[Pomodoro] Firebase sync error:', err));
      }
    }

    // 4) [Step 2 - IPC] 트레이 포모도로 상태 초기화 (세션 전환 완료 알림)
    if ((window as any).electronAPI?.syncPomodoroState) {
      (window as any).electronAPI.syncPomodoroState(null);
    }

    trackEvent('pomodoro_session_complete', { sessionType, duration });
  }, [user, tasks]);

  // 상위 태스크 메모이제이션 (tasks가 실제로 바뀔 때만 재계산)
  const topTasks = useMemo(() => {
    const active = tasks
      .filter(t => !t.isCompleted && !t.isBlocked)
      .sort((a, b) => {
        const sA = calculatePriorityScore(a.impact, a.urgency, a.effort, a.dueDate, a.isDomino, a.isBlocked);
        const sB = calculatePriorityScore(b.impact, b.urgency, b.effort, b.dueDate, b.isDomino, b.isBlocked);
        return sB - sA;
      })
      .slice(0, 3);
    while (active.length < 3) active.push(null as any);
    return active;
  }, [tasks]);

  const isEmptyState = tasks.length === 0;

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      {currentView === 'tabboard' ? (
        <div className="w-screen h-screen absolute inset-0 z-50 bg-[#F4F4F5] dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 overflow-hidden">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 left-4 z-[60] p-3 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white shadow-xl hover:bg-white dark:hover:bg-zinc-700 transition-colors backdrop-blur-md"
                title="메뉴"
            >
                <MenuIcon size={24} />
            </button>
            <TabBoard onSendToDashboard={handleSendToDashboard} />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                reminderInterval={reminderInterval}
                setReminderInterval={setReminderInterval}
                user={user}
                currentView={currentView}
                setCurrentView={setCurrentView}
            />
        </div>
      ) : (
        <div className={`
            bg-[#F4F4F5] dark:bg-[#18181B] 
            p-3 md:p-10 flex flex-col gap-6 md:gap-8 max-w-full mx-auto 
            text-zinc-900 dark:text-zinc-100 
            transition-colors duration-700 
            ${focusId ? 'bg-[#E4E4E7] dark:bg-[#000000]' : ''} 
            min-h-screen
        `}>
        
        {/* Header */}
        <header className="flex justify-between items-center h-auto md:h-[80px] px-1 md:px-8 z-50 py-3 md:py-0">
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 md:p-2 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors border border-transparent dark:border-zinc-700"
                  title="메뉴 및 알림 설정"
                >
                  <MenuIcon size={20} className="md:w-6 md:h-6" />
                </button>
                <div>
                    <h1 className="text-xl md:text-3xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">CORE TAB</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 font-bold text-[10px] md:text-xs mt-0.5 md:mt-1 tracking-wide">Priority Focus System</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 md:p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                    {isDarkMode ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
                </button>

                <button 
                    onClick={() => setIsAIBrainDumpOpen(true)}
                    className="group flex items-center justify-center p-2 md:py-3 md:px-5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all border border-blue-200 dark:border-blue-900/50"
                    title="AI 브레인덤프 비서"
                >
                    <Sparkles size={18} className="md:w-5 md:h-5" fill="currentColor" />
                    <span className="hidden md:block ml-2 font-bold text-sm">AI 비서</span>
                </button>

                <button 
                    onClick={openAddModal}
                    className="group flex items-center gap-1.5 md:gap-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 pl-3 pr-4 md:pl-8 md:pr-10 py-2 md:py-5 rounded-full hover:bg-zinc-800 dark:hover:bg-200 transition-all shadow-xl active:scale-95"
                >
                    <div className="bg-orange-500 rounded-full p-1 md:p-2">
                        <Plus size={14} className="md:w-6 md:h-6" strokeWidth={4} color="white" />
                    </div>
                    <span className="font-black tracking-wider text-xs md:text-lg whitespace-nowrap">탭 추가</span>
                </button>
            </div>
        </header>


            <main className="flex-1 w-full flex flex-row items-stretch gap-2 md:gap-6 pt-1 md:pt-4 overflow-hidden">
                {topTasks.map((task, index) => {
                    const taskId = task ? task.id : `empty-${index}`;
                    const isActive = task ? task.isActive : false;
                    const isDimmed = focusId !== null && focusId !== taskId;

                    return (
                        <MultitapCard
                        key={taskId}
                        task={task || undefined}
                        onToggle={task ? toggleFocus : undefined}
                        onComplete={task ? completeTask : undefined}
                        onAdd={openAddModal}
                        onEdit={task ? openEditModal : undefined}
                        onPomodoroSessionComplete={handlePomodoroSessionComplete}
                        isActive={isActive}
                        isDimmed={isDimmed}
                        />
                    );
                })}
            </main>

            {!isEmptyState && (
                <section className={`grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-10 pb-8 transition-opacity duration-500 items-start ${focusId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <TaskDashboard 
                        tasks={tasks} 
                        onDelete={deleteTask} 
                        onEdit={openEditModal}
                    />
                    <div className="relative w-full">
                        {/* 뷰 전환 토글을 상단 헤더 메뉴바로 이동시켰음 (UX 개선 및 레이아웃 오차 해결) */}
                        <div className="hidden lg:flex absolute -top-[52px] right-2 md:right-0 z-10 bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl w-fit backdrop-blur-md">
                            <button onClick={() => setRightTab('energy')} className={`px-4 md:px-6 py-2 font-bold rounded-xl text-xs md:text-sm transition-all focus:outline-none ${rightTab === 'energy' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>내 에너지 분석</button>
                            <button onClick={() => setRightTab('crew')} className={`px-4 md:px-6 py-2 font-bold rounded-xl text-xs md:text-sm transition-all focus:outline-none flex items-center gap-1 ${rightTab === 'crew' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>마이 크루</button>
                        </div>

                        {rightTab === 'energy' ? (
                            <EnergyStats tasks={tasks} onOpenBill={() => setIsBillModalOpen(true)} />
                        ) : (
                            <CrewLeaderboard user={user} />
                        )}
                    </div>
                </section>
            )}

        
        <AddTaskModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onAdd={addTask}
            onUpdate={updateTask}
            taskToEdit={editingTask}
            categories={categories}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
        />

        <EnergyBillModal 
            isOpen={isBillModalOpen}
            onClose={() => setIsBillModalOpen(false)}
            tasks={tasks}
        />
        
        <AIBrainDumpModal
            isOpen={isAIBrainDumpOpen}
            onClose={() => setIsAIBrainDumpOpen(false)}
            onTasksGenerated={(generatedTasks) => {
              generatedTasks.forEach(task => addTask(task));
            }}
            categories={categories}
        />

        <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            reminderInterval={reminderInterval}
            setReminderInterval={setReminderInterval}
            user={user}
            currentView={currentView}
            setCurrentView={setCurrentView}
        />

        {!isElectronApp && <InstallPrompt />}
        </div>
      )}
    </div>
  );
};

export default App;
