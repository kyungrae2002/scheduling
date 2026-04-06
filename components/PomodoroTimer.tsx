import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

// ── 세션 타입 정의 ───────────────────────────────────────────
export type PomodoroSessionType = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSessionResult {
  sessionType: PomodoroSessionType;
  duration: number; // 실제 집중한 초 (work 세션만 의미 있음)
}

// 각 세션의 표시 정보와 기본 시간
const SESSION_CONFIG: Record<
  PomodoroSessionType,
  { label: string; emoji: string; seconds: number; accentColor: string; ringColor: string }
> = {
  work:       { label: '집중',     emoji: '🍅', seconds: 25 * 60, accentColor: 'bg-orange-500 hover:bg-orange-600', ringColor: '#f97316' },
  shortBreak: { label: '짧은 휴식', emoji: '☕', seconds:  5 * 60, accentColor: 'bg-blue-500 hover:bg-blue-600',   ringColor: '#3b82f6' },
  longBreak:  { label: '긴 휴식',   emoji: '🛌', seconds: 15 * 60, accentColor: 'bg-green-500 hover:bg-green-600', ringColor: '#22c55e' },
};

const ROUNDS_PER_CYCLE = 4; // 긴 휴식 전 포모도로 횟수

interface PomodoroTimerProps {
  isTaskActive: boolean;                          // 태스크 ON/OFF 연동
  onSessionComplete: (result: PomodoroSessionResult) => void; // 세션 완료 콜백 (App.tsx로 위임)
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ isTaskActive, onSessionComplete }) => {
  // [Step 1 - UI] 타이머 핵심 상태
  const [sessionType, setSessionType]     = useState<PomodoroSessionType>('work');
  const [timeLeft, setTimeLeft]           = useState(SESSION_CONFIG.work.seconds);
  const [isRunning, setIsRunning]         = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0); // 완료된 work 라운드 수

  const cfg = SESSION_CONFIG[sessionType];
  const totalSeconds = cfg.seconds;

  // [Step 1 - 로직] 다음 세션 자동 전환 (work→휴식→work 사이클)
  const advanceSession = useCallback((finishedType: PomodoroSessionType, elapsed: number) => {
    // 완료 콜백은 App.tsx가 처리 (알림·태스크 업데이트·Firebase 포함)
    onSessionComplete({ sessionType: finishedType, duration: elapsed });

    if (finishedType === 'work') {
      const next = completedRounds + 1;
      setCompletedRounds(next);
      const isLongBreak = next % ROUNDS_PER_CYCLE === 0;
      const nextSession: PomodoroSessionType = isLongBreak ? 'longBreak' : 'shortBreak';
      setSessionType(nextSession);
      setTimeLeft(SESSION_CONFIG[nextSession].seconds);
    } else {
      // 휴식 완료 → 다시 집중 세션
      setSessionType('work');
      setTimeLeft(SESSION_CONFIG.work.seconds);
    }
    setIsRunning(false);
  }, [completedRounds, onSessionComplete]);

  // ref로 최신 값 유지 → interval deps에서 제외하여 재시작 방지
  const advanceSessionRef = useRef(advanceSession);
  advanceSessionRef.current = advanceSession;
  const sessionTypeRef = useRef(sessionType);
  sessionTypeRef.current = sessionType;
  const totalSecondsRef = useRef(totalSeconds);
  totalSecondsRef.current = totalSeconds;

  // [Step 1 - 로직] 1초 카운트다운 인터벌
  // isRunning 변경 시에만 재생성 (advanceSession/sessionType/totalSeconds 변경 시 재시작 없음)
  useEffect(() => {
    if (!isRunning) return;

    const tick = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          advanceSessionRef.current(sessionTypeRef.current, totalSecondsRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // [Step 1 - 로직] 태스크 OFF 시 타이머 자동 일시정지
  useEffect(() => {
    if (!isTaskActive) setIsRunning(false);
  }, [isTaskActive]);

  const handleStartPause = () => {
    if (!isTaskActive) return; // 태스크가 OFF면 동작 안 함
    setIsRunning(r => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(cfg.seconds);
  };

  const handleSkip = () => {
    // 건너뛰기: 실제 경과 시간만큼만 기록
    const elapsed = totalSeconds - timeLeft;
    advanceSession(sessionType, elapsed);
  };

  // MM:SS 포맷
  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const ss = (timeLeft % 60).toString().padStart(2, '0');

  // [Step 1 - UI] SVG 원형 프로그레스 링 계산
  const RADIUS = 34;
  const circumference = 2 * Math.PI * RADIUS;
  const dashOffset = circumference * (1 - timeLeft / totalSeconds);

  // 완료 라운드 도트 (현재 사이클 내 위치)
  const dotsCompleted = completedRounds % ROUNDS_PER_CYCLE;

  return (
    <div className="flex flex-col items-center gap-2 py-1 w-full">

      {/* 세션 타입 라벨 */}
      <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wide">
        {cfg.emoji} {cfg.label}
      </span>

      {/* 원형 타이머 링 */}
      <div className="relative w-[88px] h-[88px] flex items-center justify-center">
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 80 80">
          {/* 배경 원 */}
          <circle cx="40" cy="40" r={RADIUS} fill="none"
            strokeWidth="5" className="stroke-zinc-200 dark:stroke-zinc-700" />
          {/* 진행 원 */}
          <circle cx="40" cy="40" r={RADIUS} fill="none"
            stroke={cfg.ringColor} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        {/* 남은 시간 텍스트 */}
        <span className="font-mono text-lg font-black tabular-nums text-zinc-900 dark:text-white z-10 leading-none">
          {mm}:{ss}
        </span>
      </div>

      {/* 라운드 도트 (●●●○) */}
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: ROUNDS_PER_CYCLE }).map((_, i) => (
          <div key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i < dotsCompleted ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>

      {/* 컨트롤 버튼 (리셋 / 재생·일시정지 / 건너뛰기) */}
      <div className="flex items-center gap-2">
        <button onClick={handleReset}
          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="리셋">
          <RotateCcw size={13} />
        </button>

        <button onClick={handleStartPause} disabled={!isTaskActive}
          className={`p-2 rounded-full text-white shadow transition-all active:scale-95 ${
            isTaskActive ? `${cfg.accentColor}` : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed'
          }`}
          title={isRunning ? '일시정지' : '시작'}>
          {isRunning
            ? <Pause size={15} fill="white" />
            : <Play  size={15} fill="white" />}
        </button>

        <button onClick={handleSkip}
          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="다음 세션으로">
          <SkipForward size={13} />
        </button>
      </div>
    </div>
  );
};
