
import React from 'react';
import { Task } from '../types';
import { addDays, parseLocalDate } from '../utils';
import { motion } from 'framer-motion';

interface TimelineProps {
  tasks: Task[];
}

export const Timeline: React.FC<TimelineProps> = ({ tasks }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const TOTAL_DAYS = 14;

  const relevantTasks = tasks
    .filter(t => !t.isBlocked && !t.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 7);

  return (
    <div className="h-full flex flex-col min-h-[500px] w-full">
      
      {relevantTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2 md:gap-4 min-h-[200px]">
             <span className="text-xl md:text-2xl font-bold text-zinc-400 dark:text-zinc-600">일정이 없습니다</span>
        </div>
      ) : (
        <div className="flex-1 flex gap-2 md:gap-4 overflow-hidden relative">
            {/* Task Titles Column */}
            <div className="w-[80px] md:w-[120px] pt-[88px] md:pt-[104px] space-y-8 md:space-y-10 flex-shrink-0 border-r border-zinc-300/50 dark:border-zinc-700/50 pr-2 md:pr-4 bg-transparent z-10">
                {relevantTasks.map(task => (
                    <div key={`title-${task.id}`} className="h-10 md:h-12 flex items-center justify-end">
                        <span className="text-xs md:text-sm font-bold text-zinc-600 dark:text-zinc-400 truncate text-right w-full block" title={task.title}>
                            {task.title}
                        </span>
                    </div>
                ))}
            </div>

            {/* Scrollable Timeline Area */}
            <div className="flex-1 overflow-x-auto relative w-full pb-2">
                <div className="min-w-[700px] md:min-w-[900px] h-full relative flex flex-col">
                    
                    {/* 1. Date Header */}
                    <div 
                        className="grid w-full pb-4 mb-4 md:mb-6 shrink-0"
                        style={{ gridTemplateColumns: `repeat(${TOTAL_DAYS}, 1fr)` }}
                    >
                        {days.map((date, i) => (
                            <div key={i} className="flex flex-col items-center relative group">
                                <span className={`text-[10px] md:text-xs font-extrabold mb-1 uppercase tracking-wider ${i === 0 ? 'text-orange-600' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}>
                                    {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                                </span>
                                <div className={`
                                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg font-black transition-colors z-20
                                    ${i === 0 ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-500 bg-transparent group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800'}
                                `}>
                                    {date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content Layer: Grid Lines + Tasks */}
                    <div className="relative flex-1">
                        {/* 2. Grid Lines Background */}
                        <div 
                            className="absolute inset-0 grid pointer-events-none z-0"
                            style={{ gridTemplateColumns: `repeat(${TOTAL_DAYS}, 1fr)` }}
                        >
                             {days.map((_, i) => (
                                <div key={i} className="relative w-full h-full flex justify-center">
                                    {/* Line centered by flexbox */}
                                    <div className="w-px h-full border-l border-dashed border-zinc-300/40 dark:border-zinc-700/40" />
                                </div>
                            ))}
                        </div>

                        {/* 3. Task Rows (Using Grid for Perfect Alignment) */}
                        <div className="relative z-10 space-y-8 md:space-y-10 py-2">
                            {relevantTasks.map((task) => {
                                const taskDue = parseLocalDate(task.dueDate);
                                
                                const timeDiff = taskDue.getTime() - today.getTime();
                                const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                                
                                if (dayDiff < 0) return null; 
                                
                                const startIdx = 0; 
                                const endIdx = Math.min(TOTAL_DAYS - 1, dayDiff);
                                const isSameDay = startIdx === endIdx;

                                return (
                                <div 
                                    key={task.id} 
                                    className="relative h-10 md:h-12 w-full grid items-center group"
                                    style={{ gridTemplateColumns: `repeat(${TOTAL_DAYS}, 1fr)` }}
                                >
                                    
                                    {/* Connecting Line (Absolute within Grid Row) */}
                                    {!isSameDay && (
                                        <motion.div 
                                            initial={{ opacity: 0, scaleX: 0 }}
                                            animate={{ opacity: 1, scaleX: 1 }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            className="absolute h-[3px] top-1/2 -translate-y-1/2 origin-left bg-zinc-300 dark:bg-zinc-700 z-0 rounded-full"
                                            style={{
                                                left: `${((startIdx + 0.5) / TOTAL_DAYS) * 100}%`, 
                                                width: `${((endIdx - startIdx) / TOTAL_DAYS) * 100}%`,
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-orange-400 dark:bg-orange-500 shadow-[0_0_10px_rgba(251,146,60,0.4)] rounded-full" />
                                        </motion.div>
                                    )}

                                    {/* Start Dot (Placed via Grid Column) */}
                                    <div 
                                        className="relative flex items-center justify-center z-10 pointer-events-none"
                                        style={{ gridColumn: `${startIdx + 1} / span 1`, gridRow: 1 }}
                                    >
                                         <div className="w-2.5 h-2.5 rounded-full bg-orange-500 dark:bg-orange-400 shadow-sm ring-4 ring-white dark:ring-zinc-900 pointer-events-auto" />
                                    </div>

                                    {/* End Circle (Placed via Grid Column) */}
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
                                        className="relative flex items-center justify-center z-20 pointer-events-none"
                                        style={{ gridColumn: `${endIdx + 1} / span 1`, gridRow: 1 }}
                                    >
                                        <div className="relative flex items-center justify-center pointer-events-auto">
                                            {/* Target Circle */}
                                            <div className={`
                                                w-5 h-5 md:w-6 md:h-6 rounded-full border-[3px] border-orange-500 shadow-md flex items-center justify-center box-border
                                                ${isSameDay ? 'bg-transparent' : 'bg-white dark:bg-zinc-900'}
                                            `}>
                                                 {/* Core Marker (Only if not same day) */}
                                                 {task.isDomino && !isSameDay && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                            </div>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-30">
                                                {isSameDay ? 'Today' : `D-${dayDiff}`}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
