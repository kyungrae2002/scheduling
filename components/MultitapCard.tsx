
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../types';
import { Zap, Clock, CheckCircle2, Plus, Pencil } from 'lucide-react';
import { calculatePriorityScore } from '../utils';
import { Timer } from './Timer';
import { PomodoroTimer, PomodoroSessionResult } from './PomodoroTimer';

interface MultitapCardProps {
  task?: Task;
  onToggle?: (id: string) => void;
  onComplete?: (id: string) => void;
  onAdd?: () => void;
  onEdit?: (task: Task) => void;
  onPomodoroSessionComplete?: (result: PomodoroSessionResult) => void;
  isActive?: boolean;
  disabled?: boolean;
  isDimmed?: boolean;
}

export const MultitapCard: React.FC<MultitapCardProps> = ({ task, onToggle, onComplete, onAdd, onEdit, onPomodoroSessionComplete, isActive = false, disabled, isDimmed = false }) => {
  const isEmpty = !task;
  // [Step 1 - UI] 포모도로 모드 토글 (카드 단위 로컬 상태)
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  // 우선순위 점수 메모이제이션 (렌더마다 재계산 방지)
  const score = useMemo(() =>
    task ? calculatePriorityScore(task.impact, task.urgency, task.effort, task.dueDate, task.isDomino, task.isBlocked) : 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task?.impact, task?.urgency, task?.effort, task?.dueDate, task?.isDomino, task?.isBlocked]
  );
  


  return (
    <motion.div 
        animate={{ 
            opacity: isDimmed ? 0.35 : 1,
            scale: isDimmed ? 0.95 : 1,
            filter: isDimmed ? 'grayscale(100%)' : 'grayscale(0%)',
        }}
        transition={{ duration: 0.4 }}
        className="relative flex flex-col h-auto flex-1 min-w-0 items-center justify-end"
    >
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative flex flex-col w-full h-full rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-6 pb-4 md:pb-8 transition-all duration-500 z-20 mb-[-10px]
                ${isActive 
                    ? 'bg-white dark:bg-zinc-800 shadow-[0_10px_25px_-8px_rgba(255,150,50,0.5)] dark:shadow-[0_20px_40px_-12px_rgba(246,113,33,0.15)] border-[3px] border-orange-500 transform -translate-y-1 md:-translate-y-2' 
                    : 'bg-zinc-100 dark:bg-zinc-900 shadow-xl dark:shadow-black border-2 border-zinc-200 dark:border-zinc-800'
                }
            `}
        >
            <div className="relative z-10 flex-1 flex flex-col items-center text-center px-0.5 md:px-1 pt-1">
                {isEmpty ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-2 md:space-y-4 opacity-60 py-8 md:py-16">
                         <span className="text-zinc-500 dark:text-zinc-600 font-black tracking-[0.1em] text-[10px] md:text-base uppercase whitespace-nowrap">Empty Socket</span>
                         <p className="hidden md:block text-sm font-bold text-zinc-400 dark:text-zinc-600 px-4">탭을 추가하여 전원을 연결하세요</p>
                    </div>
                ) : (
                    <>
                        {/* Edit Button - Absolute Top Right */}
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(task);
                                }}
                                className="absolute top-0 right-0 md:top-2 md:right-2 p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 dark:hover:text-zinc-200 dark:hover:bg-zinc-700/50 transition-all z-30"
                                aria-label="Edit Task"
                            >
                                <Pencil size={14} className="md:w-5 md:h-5" />
                            </button>
                        )}

                        {/* Header Badges: Compact on Mobile */}
                        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 mb-2 md:mb-4 w-full justify-center">
                            <span className="px-1.5 py-0.5 md:px-3 md:py-1.5 rounded md:rounded-lg bg-zinc-200 dark:bg-zinc-700 text-[8px] md:text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider truncate max-w-full">
                                {task.category}
                            </span>
                            <span className="px-1.5 py-0.5 md:px-3 md:py-1.5 rounded md:rounded-lg bg-orange-100 dark:bg-orange-900/40 text-[8px] md:text-xs font-black text-orange-600 dark:text-orange-400 whitespace-nowrap">
                                S. {score.toFixed(0)}
                            </span>
                        </div>

                        {/* Title: Scaled Down */}
                        <h3 className={`text-sm md:text-3xl font-black leading-tight mb-2 md:mb-4 line-clamp-2 w-full break-words transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-800 dark:text-zinc-400'}`}>
                            {task.title}
                        </h3>

                        {/* 타이머 영역: 일반 타이머 ↔ 포모도로 전환 */}
                        <div className="mb-3 md:mb-6 flex flex-col items-center mt-auto w-full relative">
                          {/* 포모도로 모드 토글 버튼 (isActive일 때만 표시) */}
                          {isActive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsPomodoroMode(m => !m); }}
                              className={`absolute -top-1 left-0 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                                isPomodoroMode
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title="포모도로 타이머 전환"
                            >
                              🍅 {isPomodoroMode ? 'ON' : ''}
                            </button>
                          )}

                          {/* 포모도로 모드: PomodoroTimer / 일반 모드: 기존 Timer */}
                          {isPomodoroMode && isActive ? (
                            <PomodoroTimer
                              isTaskActive={isActive}
                              onSessionComplete={(result) => onPomodoroSessionComplete?.(result)}
                            />
                          ) : (
                            <Timer task={task} isActive={isActive} />
                          )}
                        </div>

                        {/* Metadata Tags: Compact Vertical Stack or Wrap */}
                        <div className="flex flex-wrap gap-1 md:gap-2 mb-3 md:mb-4 justify-center w-full">
                            {task.isDomino && (
                                <div className="flex items-center gap-1 text-[8px] md:text-xs font-extrabold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-full border border-orange-200 dark:border-orange-800">
                                    <Zap size={10} className="md:w-3.5 md:h-3.5" fill="currentColor" /> 
                                    <span className="hidden md:inline">Core</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 text-[8px] md:text-xs font-extrabold text-zinc-600 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                                <Clock size={10} className="md:w-3.5 md:h-3.5" /> 
                                {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                            </div>
                        </div>

                        {/* Switch Button (Updated Skeuomorphic Design & Centered Compact Size) */}
                        <div className="w-full mt-auto pt-2 flex justify-center">
                             <div
                                role="switch"
                                aria-checked={isActive}
                                onClick={(e) => { e.stopPropagation(); !disabled && onToggle && onToggle(task.id); }}
                                className={`
                                    relative w-24 md:w-36 h-8 md:h-12 rounded-full transition-all duration-300 cursor-pointer
                                    p-[3px] md:p-[4px] box-border
                                    bg-[#e4e4e7] dark:bg-[#27272a]
                                    shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
                                `}
                            >
                                {/* Track Background */}
                                <div className={`
                                    relative w-full h-full rounded-full overflow-hidden transition-colors duration-500
                                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] dark:shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-400' 
                                        : 'bg-[#3f3f46] dark:bg-[#18181b]'
                                    }
                                `}>
                                    {/* Labels */}
                                    <div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 pointer-events-none z-0">
                                        {/* ON Label (Left side - visible when Active) */}
                                        <span className={`text-[9px] md:text-xs font-black tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100 text-orange-100 drop-shadow-sm' : 'opacity-0'}`}>
                                            ON
                                        </span>
                                        {/* OFF Label (Right side - visible when Inactive) */}
                                        <span className={`text-[9px] md:text-xs font-black tracking-widest transition-opacity duration-300 ${!isActive ? 'opacity-100 text-zinc-500 drop-shadow-[0_1px_0_rgba(255,255,255,0.1)]' : 'opacity-0'}`}>
                                            OFF
                                        </span>
                                    </div>

                                    {/* Knob Container */}
                                    <div className={`w-full h-full flex items-center px-0.5 relative z-10 ${isActive ? 'justify-end' : 'justify-start'}`}>
                                         <motion.div
                                            layout
                                            transition={{ type: "spring", stiffness: 600, damping: 35 }}
                                            className="h-full aspect-square rounded-full bg-gradient-to-b from-zinc-50 to-zinc-200 shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] relative"
                                         >
                                            {/* Decorative dimple */}
                                            <div className="absolute inset-0 m-auto w-2/3 h-2/3 rounded-full bg-gradient-to-tr from-zinc-100 to-zinc-50 opacity-40" />
                                         </motion.div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {!isEmpty && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 md:w-12 h-2 md:h-3 bg-zinc-300 dark:bg-zinc-700 rounded-b-lg" />}
        </motion.div>

        {/* Cable / Add Button Area */}
        <div className="relative z-10 flex flex-col items-center w-full mt-[-5px]">
            <div className="relative w-full h-4 md:h-10 flex justify-center z-0">
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: '100%', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="w-2 md:w-4 bg-zinc-800 dark:bg-zinc-950 rounded-full absolute bottom-0"
                        />
                    )}
                </AnimatePresence>
            </div>
            <div 
                onClick={() => isEmpty ? onAdd && onAdd() : undefined}
                className={`
                    relative w-14 h-14 md:w-36 md:h-36 rounded-2xl md:rounded-[2.5rem] transition-all duration-300 flex items-center justify-center
                    bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 shadow-lg dark:shadow-black
                    ${isEmpty ? 'cursor-pointer active:scale-95 text-zinc-300' : 'text-transparent'}
                `}
            >
                 {isEmpty ? <Plus size={24} className="md:w-12 md:h-12" strokeWidth={3} /> : (
                    <div className="w-10 h-10 md:w-24 md:h-24 rounded-full bg-zinc-200 dark:bg-zinc-900 shadow-inner flex flex-col items-center justify-center relative overflow-visible">
                        <div className="absolute inset-1 md:inset-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <div className="flex gap-1 md:gap-4 opacity-40">
                                <div className="w-1.5 h-1.5 md:w-4 md:h-4 rounded-full bg-zinc-800 dark:bg-zinc-300" />
                                <div className="w-1.5 h-1.5 md:w-4 md:h-4 rounded-full bg-zinc-800 dark:bg-zinc-300" />
                            </div>
                        </div>
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ y: 15, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 15, opacity: 0 }}
                                    className="absolute z-20 w-6 h-6 md:w-16 md:h-16 rounded-full bg-zinc-800 dark:bg-black shadow-xl"
                                />
                            )}
                        </AnimatePresence>
                    </div>
                 )}
            </div>
            {!isEmpty && (
                <div className="mt-2 md:mt-4 w-full flex justify-center">
                     <button
                        onClick={(e) => { e.stopPropagation(); onComplete && onComplete(task.id); }}
                        className="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px] md:text-xs font-bold shadow-sm active:scale-95 whitespace-nowrap hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <CheckCircle2 size={12} className="md:w-4 md:h-4" />
                        <span>완료</span>
                    </button>
                </div>
            )}
             {isEmpty && <div className="h-6 md:h-10" />}
        </div>
    </motion.div>
  );
};
