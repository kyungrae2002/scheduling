import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Task } from '../types';
import { formatTime } from '../utils';

interface TimerProps {
  task: Task;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ task, isActive }) => {
  const [displayTime, setDisplayTime] = useState(task.totalTime || 0);
  // ref로 최신 task 값 유지 → interval deps에서 제외하여 재시작 방지
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    const calculateCurrentTime = () => {
        const t = taskRef.current;
        if (isActive && t.lastStartTime) {
            const currentSession = (Date.now() - t.lastStartTime) / 1000;
            return (t.totalTime || 0) + currentSession;
        }
        return t.totalTime || 0;
    };

    // 즉시 동기화
    setDisplayTime(calculateCurrentTime());

    if (!isActive) return;

    // isActive가 바뀔 때만 interval 재생성 (task 변경 시 재시작 없음)
    const intervalId = setInterval(() => {
        setDisplayTime(calculateCurrentTime());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <span className={`font-mono text-xl md:text-6xl font-black tracking-tighter tabular-nums ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-300 dark:text-zinc-700'}`}>
          {formatTime(displayTime)}
      </span>
      {isActive && (
          <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute -top-1 -right-1 md:-top-1 md:-right-2 w-1.5 h-1.5 md:w-3 md:h-3 rounded-full bg-red-500"
          />
      )}
    </div>
  );
};
