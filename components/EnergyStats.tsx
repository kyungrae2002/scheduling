
import React, { useMemo } from 'react';
import { Task } from '../types';
import { Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { formatTime } from '../utils';

interface EnergyStatsProps {
  tasks: Task[];
  onOpenBill: () => void;
}

export const EnergyStats: React.FC<EnergyStatsProps> = ({ tasks, onOpenBill }) => {
  const [viewMode, setViewMode] = React.useState<'daily' | 'monthly'>('monthly');
  
  // Calculate dates at the start of the render to ensure consistency
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Helper dates for comparison (Previous Period)
  const yesterday = new Date(now);
  yesterday.setDate(currentDate - 1);
  
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(currentMonth - 1);

  // 1. Calculate Consumption Stats
  let totalSeconds = 0; // Current Period
  let prevTotalSeconds = 0; // Previous Period (Yesterday or Last Month)
  
  const taskConsumption: Record<string, number> = {};

  tasks.forEach(task => {
    // Priority: Use workLogs if they exist (More accurate)
    if (task.workLogs && task.workLogs.length > 0) {
        task.workLogs.forEach(log => {
            const logDate = new Date(log.startedAt);
            
            const logYear = logDate.getFullYear();
            const logMonth = logDate.getMonth();
            const logDay = logDate.getDate();

            // 1. Current Period Logic
            let isCurrent = false;
            if (viewMode === 'monthly') {
                // Same Year AND Same Month
                isCurrent = logYear === currentYear && logMonth === currentMonth;
            } else {
                // Same Year AND Same Month AND Same Day
                isCurrent = logYear === currentYear && logMonth === currentMonth && logDay === currentDate;
            }

            if (isCurrent) {
                totalSeconds += log.duration;
                taskConsumption[task.title] = (taskConsumption[task.title] || 0) + log.duration;
            }

            // 2. Previous Period Logic
            let isPrev = false;
            if (viewMode === 'monthly') {
                // Same Year AND Previous Month (Handle year rollover automatically via Date object if needed, but simple check here)
                // Robust check: Compare against lastMonthDate
                isPrev = logYear === lastMonthDate.getFullYear() && logMonth === lastMonthDate.getMonth();
            } else {
                // Compare against yesterday
                isPrev = logYear === yesterday.getFullYear() && logMonth === yesterday.getMonth() && logDay === yesterday.getDate();
            }

            if (isPrev) {
                prevTotalSeconds += log.duration;
            }
        });
    } else {
        // Fallback for legacy data (No workLogs)
        // We only count this for Monthly view because we can't know the exact day
        if (viewMode === 'monthly') {
            const createdDate = new Date(task.createdAt);
            if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                 if (task.totalTime > 0) {
                     totalSeconds += task.totalTime;
                     taskConsumption[task.title] = (taskConsumption[task.title] || 0) + task.totalTime;
                 }
            }
        }
    }
  });

  // Calculate "Money Saved" (1 hour = 1,000 KRW)
  const hourlyRate = 1000;
  const moneySaved = Math.floor((totalSeconds / 3600) * hourlyRate);
  const prevMoneySaved = Math.floor((prevTotalSeconds / 3600) * hourlyRate);

  // Find Power Hog
  let maxConsumerName = '-';
  let maxConsumerTime = 0;

  Object.entries(taskConsumption).forEach(([name, time]) => {
      if (time > maxConsumerTime) {
          maxConsumerTime = time;
          maxConsumerName = name;
      }
  });

  const periodLabel = viewMode === 'monthly' 
    ? now.toLocaleDateString('ko-KR', { month: 'long' }) 
    : now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

  // Generate Character Message
  const feedback = useMemo(() => {
    const diff = moneySaved - prevMoneySaved;
    const diffFormatted = Math.abs(diff).toLocaleString();
    
    // Encouragement messages
    const dailyEncouragements = ["오늘도 잘 하고 있어요", "오늘은 뭐에 집중할거예요?"];
    const monthlyEncouragements = ["이번 달 당신의 목표는 뭔가요?", "이번 달도 너무 잘 해내고 있어요"];
    
    const randomIdx = Math.floor(Math.random() * 2); // 0 or 1

    if (viewMode === 'daily') {
        // Daily Logic
        if (moneySaved > prevMoneySaved) {
             return {
                highlight: true,
                text: `어제보다 "${diffFormatted}원" 더 많이 생산 했어요!`
            };
        } else {
            return {
                highlight: false,
                text: dailyEncouragements[randomIdx]
            };
        }
    } else {
        // Monthly Logic
        if (moneySaved > prevMoneySaved) {
            return {
                highlight: true,
                text: `지난 달보다 "${diffFormatted}원" 더 많이 생산 했어요!`
            };
        } else {
             return {
                highlight: false,
                text: monthlyEncouragements[randomIdx]
            };
        }
    }
  }, [viewMode, moneySaved, prevMoneySaved]);

  return (
    <div 
        onClick={onOpenBill}
        className="bg-white/60 dark:bg-zinc-800/40 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 dark:border-zinc-700/50 p-6 md:p-10 flex flex-col relative group cursor-pointer hover:bg-white/70 dark:hover:bg-zinc-800/60 transition-colors"
    >
        {/* Hover Hint */}
        <div className="absolute top-10 right-10 z-20 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
            <div className="flex items-center gap-1 text-orange-500 font-bold bg-white dark:bg-black px-4 py-2 rounded-full shadow-lg text-base">
                <span>명세서 상세보기</span>
                <ChevronRight size={16} />
            </div>
        </div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-full">
                <h3 className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight mb-4">
                    Energy Report
                </h3>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                     {/* Toggle Switch */}
                    <div 
                        onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'daily' ? 'monthly' : 'daily'); }}
                        className="inline-flex bg-zinc-200 dark:bg-zinc-700 p-1 rounded-xl cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors self-start"
                    >
                        <span className={`px-4 py-2 text-sm md:text-base font-bold rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>일별</span>
                        <span className={`px-4 py-2 text-sm md:text-base font-bold rounded-lg transition-all ${viewMode === 'monthly' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>월별</span>
                    </div>
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold text-lg md:text-xl">{periodLabel} 청구서</span>
                </div>
            </div>
        </div>

        {/* Main Bill Card */}
        <div className="w-full flex flex-col justify-center items-center relative z-10 py-2">
            
            {/* Ticket / Bill Visual */}
            <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-700 shadow-2xl rounded-3xl p-6 md:p-8 transform transition-transform group-hover:scale-[1.02] duration-500 flex flex-col h-auto min-h-[380px]">
                
                {/* Top Hole Punch Visual */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800/40 border border-zinc-300 dark:border-zinc-700" />

                {/* Money Section */}
                <div className="text-center border-b-2 border-dashed border-zinc-200 dark:border-zinc-700 pb-6 mb-6">
                    <span className="block text-zinc-400 dark:text-zinc-500 text-xs font-black tracking-[0.2em] uppercase mb-2">Total Savings</span>
                    <div className="flex items-center justify-center gap-1 text-5xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        <span className="text-2xl mt-2">₩</span>
                        {moneySaved.toLocaleString()}
                    </div>
                    <p className="text-orange-500 font-bold text-sm mt-2">
                        {viewMode === 'monthly' ? '이번 달 생산 가치' : '오늘 생산 가치'}
                    </p>
                </div>

                {/* Stats Detail */}
                <div className="space-y-4 mb-auto">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-base font-bold text-zinc-600 dark:text-zinc-400">총 집중 시간</span>
                        </div>
                        <span className="text-xl font-black text-zinc-800 dark:text-zinc-200 tabular-nums">
                            {formatTime(totalSeconds)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <span className="text-base font-bold text-zinc-600 dark:text-zinc-400">최대 전력 소모</span>
                        </div>
                        <div className="text-right">
                             <span className="block text-base font-black text-zinc-900 dark:text-white truncate max-w-[120px]">
                                {maxConsumerName}
                            </span>
                             <span className="text-xs font-bold text-zinc-400 tabular-nums">
                                {maxConsumerTime > 0 ? formatTime(maxConsumerTime) : '00:00:00'}
                             </span>
                        </div>
                    </div>
                </div>

                {/* Character Feedback Section */}
                <div className="mt-4 pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 flex items-end gap-3">
                    
                    {/* Character Avatar - Grade Badge Style */}
                    <div className="relative shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center -mb-2 z-10">
                         <img 
                            src="https://i.ibb.co/35rCxqg3/image.png" 
                            alt="Mascot" 
                            className="w-full h-full object-cover scale-[1.5] origin-center translate-y-2"
                         />
                    </div>

                    {/* Speech Bubble */}
                    <div className={`
                        relative flex-1 p-4 rounded-2xl text-sm font-bold shadow-sm leading-relaxed mb-0 border
                        ${feedback.highlight 
                            ? 'bg-orange-100 dark:bg-[#321305] text-orange-800 dark:text-orange-100 border-orange-200 dark:border-[#522008]' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'}
                    `}>
                         {/* Seamless Tail using rotated square */}
                         <div className={`
                            absolute bottom-4 -left-[7px] w-3.5 h-3.5 transform rotate-45 border-l border-b
                            ${feedback.highlight 
                                ? 'bg-orange-100 dark:bg-[#321305] border-orange-200 dark:border-[#522008]' 
                                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}
                         `}></div>
                         
                         <span className="relative z-10 block">{feedback.text}</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};
