
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../types';
import { formatTime } from '../utils';

interface EnergyBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

interface DailyStats {
  date: number; // 1-31
  seconds: number;
  cost: number;
}

interface CategoryStats {
  name: string;
  seconds: number;
  cost: number;
}

export const EnergyBillModal: React.FC<EnergyBillModalProps> = ({ isOpen, onClose, tasks }) => {
  const [viewDate, setViewDate] = useState(new Date());

  // Reset to current month when opening
  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date());
    }
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Calendar Logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  
  // Data Aggregation
  const dailyStats: Record<number, DailyStats> = {};
  const categoryStats: Record<string, CategoryStats> = {};
  let totalMonthlySeconds = 0;

  tasks.forEach(task => {
    if (task.workLogs) {
      task.workLogs.forEach(log => {
        const d = new Date(log.startedAt);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          
          // Daily Aggregation
          if (!dailyStats[day]) {
            dailyStats[day] = { date: day, seconds: 0, cost: 0 };
          }
          dailyStats[day].seconds += log.duration;
          dailyStats[day].cost += (log.duration / 3600) * 1000;

          // Category Aggregation
          if (!categoryStats[task.category]) {
            categoryStats[task.category] = { name: task.category, seconds: 0, cost: 0 };
          }
          categoryStats[task.category].seconds += log.duration;
          categoryStats[task.category].cost += (log.duration / 3600) * 1000;

          totalMonthlySeconds += log.duration;
        }
      });
    }
  });

  const totalCost = Math.floor((totalMonthlySeconds / 3600) * 1000);
  const categoryList = Object.values(categoryStats).sort((a, b) => b.seconds - a.seconds);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative bg-zinc-100 dark:bg-zinc-900 w-full max-w-[1000px] h-[90vh] md:h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
        >
           {/* Sidebar / Receipt Summary (Right side on Desktop, Bottom on Mobile) */}
           <div className="md:order-2 w-full md:w-[320px] bg-white dark:bg-zinc-950 border-b md:border-b-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-10">
                <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                명세서
                            </h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono mt-1">
                                {year}.{String(month + 1).padStart(2, '0')} BILLING CYCLE
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <X size={20} className="text-zinc-500"/>
                        </button>
                    </div>

                    {/* Total Box */}
                    <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8 text-center">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Value</span>
                        <div className="text-4xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
                            ₩{totalCost.toLocaleString()}
                        </div>
                        <div className="text-xl font-bold text-zinc-500 mt-2">
                            {formatTime(totalMonthlySeconds)}
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            Category Breakdown
                        </h3>
                        
                        <div className="space-y-4">
                            {categoryList.length > 0 ? categoryList.map(cat => {
                                const percent = totalMonthlySeconds > 0 ? (cat.seconds / totalMonthlySeconds) * 100 : 0;
                                return (
                                    <div key={cat.name}>
                                        <div className="flex justify-between text-sm font-bold mb-1 text-zinc-800 dark:text-zinc-200">
                                            <span>{cat.name}</span>
                                            <span>₩{Math.floor(cat.cost).toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-orange-500 rounded-full" 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="text-right text-xs text-zinc-400 mt-1 font-mono font-bold">
                                            {formatTime(cat.seconds)} ({percent.toFixed(1)}%)
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-zinc-400 text-sm text-center py-4">데이터가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <button onClick={onClose} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg">
                        확인
                    </button>
                </div>
           </div>

           {/* Main Calendar Area (Left/Top) */}
           <div className="md:order-1 flex-1 flex flex-col bg-[#F4F4F5] dark:bg-[#18181B] relative overflow-hidden">
                
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-6 md:p-8">
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:scale-110 transition-transform">
                            <ChevronLeft size={20} className="text-zinc-700 dark:text-zinc-300"/>
                        </button>
                        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">
                            {year}년 {month + 1}월
                        </h2>
                        <button onClick={nextMonth} className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:scale-110 transition-transform">
                            <ChevronRight size={20} className="text-zinc-700 dark:text-zinc-300"/>
                        </button>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-zinc-500 text-sm font-bold bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-sm">
                        <span>Daily Power Usage</span>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 px-4 md:px-8 pb-8 overflow-y-auto">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-2">
                        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                            <div key={d} className={`text-center text-xs font-black p-2 ${i === 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 gap-1 md:gap-3 auto-rows-fr">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Date cells */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const date = i + 1;
                            const stats = dailyStats[date];
                            const hasData = stats && stats.seconds > 0;
                            
                            // Intensity for background opacity logic (max 8 hours/28800s for full opacity)
                            const intensity = hasData ? Math.min(stats.seconds / 28800, 1) : 0;

                            return (
                                <div 
                                    key={date} 
                                    className={`
                                        relative aspect-square rounded-xl md:rounded-2xl border transition-all group
                                        flex flex-col justify-between p-1.5 md:p-3
                                        ${hasData 
                                            ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 shadow-sm' 
                                            : 'bg-transparent border-transparent text-zinc-300 dark:text-zinc-800'
                                        }
                                    `}
                                >
                                    {/* Date Number */}
                                    <span className={`text-sm md:text-lg font-bold ${hasData ? 'text-zinc-900 dark:text-white' : ''}`}>
                                        {date}
                                    </span>

                                    {/* Stats (Only if data exists) */}
                                    {hasData && (
                                        <div className="flex flex-col items-end gap-0.5 md:gap-1">
                                            <span className="text-[10px] md:text-xs font-black text-orange-500">
                                                ₩{Math.floor(stats.cost).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] md:text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                                                {formatTime(stats.seconds)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Background Visual for Intensity */}
                                    {hasData && (
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500/20 rounded-b-xl overflow-hidden"
                                        >
                                            <div 
                                                className="h-full bg-orange-500 transition-all duration-1000" 
                                                style={{ width: `${intensity * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
           </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
