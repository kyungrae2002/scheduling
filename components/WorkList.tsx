
import React from 'react';
import { Task } from '../types';
import { calculatePriorityScore, formatTime, getFormattedDate } from '../utils';
import { Trash2, Pencil, CheckCircle2 } from 'lucide-react';

interface WorkListProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  isHistory?: boolean;
}

export const WorkList: React.FC<WorkListProps> = ({ tasks, onDelete, onEdit, isHistory = false }) => {
  
  // Grouping Logic
  let groupedTasks: Record<string, Task[]> = {};

  if (isHistory) {
      // Group by Date for History
      groupedTasks = tasks
        .filter(t => t.isCompleted)
        .reduce((acc, task) => {
            // Use completedAt if available, otherwise fallback to updatedAt logic or createdAt
            let dateKey = 'Unknown Date';
            if (task.completedAt) {
                dateKey = task.completedAt.split('T')[0];
            } else if (task.workLogs && task.workLogs.length > 0) {
                // Infer from last work log
                const lastLog = task.workLogs[task.workLogs.length - 1];
                dateKey = new Date(lastLog.startedAt).toISOString().split('T')[0];
            } else {
                // Fallback to creation date
                dateKey = task.createdAt.split('T')[0];
            }

            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
      
      // Sort tasks within groups by time (desc)
      Object.keys(groupedTasks).forEach(key => {
          groupedTasks[key].sort((a, b) => {
             const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
             const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime();
             return timeB - timeA;
          });
      });

  } else {
      // Group by Category for Active List
      const uniqueCategories = Array.from(new Set(tasks.map(t => t.category))) as string[];
      groupedTasks = uniqueCategories.reduce((acc, category) => {
        const categoryTasks = tasks
            .filter(t => t.category === category && !t.isCompleted)
            .sort((a, b) => {
                const scoreA = calculatePriorityScore(a.impact, a.urgency, a.effort, a.dueDate, a.isDomino, a.isBlocked);
                const scoreB = calculatePriorityScore(b.impact, b.urgency, b.effort, b.dueDate, b.isDomino, b.isBlocked);
                return scoreB - scoreA;
            });
        if (categoryTasks.length > 0) {
            acc[category] = categoryTasks;
        }
        return acc;
      }, {} as Record<string, Task[]>);
  }

  // Sort Keys (Categories alphabetically or Dates descending)
  const sortedKeys = isHistory 
    ? Object.keys(groupedTasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    : Object.keys(groupedTasks).sort();

  return (
    <div className="h-full flex flex-col min-h-[500px] w-full">
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-4">
        
        {sortedKeys.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 gap-2">
                <span className="text-xl font-bold">{isHistory ? '완료된 작업이 없습니다' : '대기 중인 작업이 없습니다'}</span>
             </div>
        )}

        {sortedKeys.map((groupKey) => {
          const catTasks = groupedTasks[groupKey];
          return (
          <div key={groupKey} className="relative">
            {/* Sticky Header */}
            <div className="flex items-center justify-between gap-3 mb-4 sticky top-0 bg-[#F4F4F5]/90 dark:bg-[#18181B]/90 backdrop-blur-xl py-3 px-5 z-20 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm mx-1">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                        {isHistory ? groupKey : groupKey}
                    </span>
                    <span className="bg-zinc-200 dark:bg-zinc-700 px-2.5 py-0.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400">{catTasks.length}</span>
                </div>
            </div>
            
            <div className="space-y-4 px-1">
              {catTasks.map(task => {
                 const score = calculatePriorityScore(task.impact, task.urgency, task.effort, task.dueDate, task.isDomino, task.isBlocked);
                 return (
                    <div key={task.id} className={`group flex justify-between items-center p-5 md:p-6 bg-white dark:bg-zinc-800 rounded-3xl transition-all border shadow-sm hover:shadow-md cursor-default ${isHistory ? 'opacity-75 border-zinc-100 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700'}`}>
                        <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-3 mb-1">
                                <span className={`text-lg md:text-xl font-bold truncate ${task.isCompleted ? 'text-zinc-400 dark:text-zinc-500 line-through decoration-2 decoration-zinc-300 dark:decoration-zinc-700' : (task.isBlocked ? 'text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-700' : 'text-zinc-900 dark:text-zinc-100')}`}>
                                    {task.title}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {task.isDomino && <span className="text-[10px] bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-extrabold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">My Core</span>}
                                {isHistory ? (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50 flex items-center gap-1">
                                        <CheckCircle2 size={10} />
                                        {task.category}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50">{task.dueDate}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8">
                             {isHistory ? (
                                <div className="text-right shrink-0">
                                    <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider mb-0.5">Total Time</span>
                                    <span className="text-xl font-black text-zinc-700 dark:text-zinc-300 tabular-nums">{formatTime(task.totalTime || 0)}</span>
                                </div>
                             ) : (
                                <div className="text-right shrink-0">
                                    <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider mb-0.5">Score</span>
                                    <span className={`text-2xl font-black leading-none ${score < 0 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-900 dark:text-white'}`}>{score.toFixed(0)}</span>
                                </div>
                             )}
                             
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isHistory && (
                                    <button 
                                        onClick={() => onEdit(task)} 
                                        className="p-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-all shrink-0"
                                        title="수정"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => onDelete(task.id)} 
                                    className="p-3 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shrink-0"
                                    title="삭제"
                                >
                                    <Trash2 size={20} />
                                </button>
                             </div>
                        </div>
                    </div>
                 );
              })}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};
