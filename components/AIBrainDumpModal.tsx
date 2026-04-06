import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { TaskFormData } from '../types';
import { parseTasksWithAI } from '../ai';

interface AIBrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksGenerated: (tasks: TaskFormData[]) => void;
  categories: string[];
}

export const AIBrainDumpModal: React.FC<AIBrainDumpModalProps> = ({ 
  isOpen, 
  onClose, 
  onTasksGenerated,
  categories
}) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const generatedTasks = await parseTasksWithAI(text, categories);
      onTasksGenerated(generatedTasks);
      setText('');
      onClose();
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#18181B] w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-blue-500" />
              AI 브레인덤프 비서
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
              머릿속에 맴도는 할 일들을 생각나는 대로 편하게 전부 적어주세요.<br/>AI가 중요도를 판단해 항목들로 분류해 드립니다.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <textarea
             value={text}
             onChange={(e) => setText(e.target.value)}
             placeholder="예: 내일 오전까지 제안서 초안 작성해야 하고, 집에 가는 길에 우유 사고 세탁소 들러야 됨. 아 그리고 다음주에 있을 미팅 준비도 슬슬 해야하는데 이거 좀 중요함. 또 운동도 하루에 30분씩은 꼭 하려고 마음먹음."
             className="w-full h-48 md:h-64 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none resize-none text-zinc-900 dark:text-white transition-colors"
             disabled={isLoading}
          />
          
          {error && (
            <p className="text-red-500 text-sm font-semibold">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
               onClick={onClose}
               className="px-6 py-3 rounded-xl font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
               disabled={isLoading}
            >
              취소
            </button>
            <button
               onClick={handleSubmit}
               disabled={isLoading || !text.trim()}
               className="flex items-center gap-2 px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  분석 매직 시작
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
