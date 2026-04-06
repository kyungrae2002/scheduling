import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { Timeline } from './Timeline';
import { WorkList } from './WorkList';
import { Calendar, ListTodo, Archive } from 'lucide-react';

interface TaskDashboardProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

type TabMode = 'plan' | 'list' | 'history';

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ tasks, onDelete, onEdit }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('plan');

  return (
    <div className="bg-white/60 dark:bg-zinc-800/40 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 dark:border-zinc-700/50 p-6 md:p-10 flex flex-col h-[650px] max-h-[650px] relative overflow-hidden">
      
      {/* Header & Toggle Switch */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6">
          <h3 className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight self-start xl:self-auto">
             Dashboard
          </h3>

          {/* Tactile Tab Switcher (Grid Based for Fixed Equal Widths) */}
          <div className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-full relative shadow-inner w-full xl:w-[360px] grid grid-cols-3 gap-0">
             {/* Sliding Background */}
             <motion.div 
                className="absolute top-1 bottom-1 bg-white dark:bg-zinc-700 rounded-full shadow-md z-0"
                layoutId="activeTabBackground"
                initial={false}
                // Width calculation: (100% - padding*2) / 3. 
                // Since parent padding is 1 (4px), total horizontal padding is 8px.
                // We just set width to 'calc((100% - 8px) / 3)' and animate left position.
                // Or easier: Animate 'x' percentage.
                style={{ 
                    width: 'calc((100% - 8px) / 3)',
                    left: '4px' 
                }}
                animate={{ 
                    x: activeTab === 'plan' ? '0%' : activeTab === 'list' ? '100%' : '200%',
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
             />

             <button
                onClick={() => setActiveTab('plan')}
                className={`
                    relative z-10 py-2.5 rounded-full text-sm font-black flex items-center justify-center gap-2 transition-colors duration-200 whitespace-nowrap
                    ${activeTab === 'plan' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}
                `}
             >
                <Calendar size={16} strokeWidth={3} />
                Plan
             </button>

             <button
                onClick={() => setActiveTab('list')}
                className={`
                    relative z-10 py-2.5 rounded-full text-sm font-black flex items-center justify-center gap-2 transition-colors duration-200 whitespace-nowrap
                    ${activeTab === 'list' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}
                `}
             >
                <ListTodo size={16} strokeWidth={3} />
                List
             </button>

             <button
                onClick={() => setActiveTab('history')}
                className={`
                    relative z-10 py-2.5 rounded-full text-sm font-black flex items-center justify-center gap-2 transition-colors duration-200 whitespace-nowrap
                    ${activeTab === 'history' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}
                `}
             >
                <Archive size={16} strokeWidth={3} />
                History
             </button>
          </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-y-auto no-scrollbar">
         <AnimatePresence mode="wait">
            {activeTab === 'plan' ? (
                <motion.div
                    key="plan"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    <Timeline tasks={tasks} />
                </motion.div>
            ) : activeTab === 'list' ? (
                <motion.div
                    key="list"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    <WorkList tasks={tasks} onDelete={onDelete} onEdit={onEdit} />
                </motion.div>
            ) : (
                <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                >
                    <WorkList tasks={tasks} onDelete={onDelete} onEdit={onEdit} isHistory />
                </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};