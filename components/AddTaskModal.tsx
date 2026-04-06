
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Settings, Trash2, Check } from 'lucide-react';
import { TaskFormData, Task } from '../types';
import { calculatePriorityScore, getFormattedDate } from '../utils';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: TaskFormData) => void;
  onUpdate?: (data: TaskFormData) => void;
  taskToEdit?: Task | null;
  categories: string[];
  onAddCategory: (newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
}

const INITIAL_DATA: TaskFormData = {
  title: '',
  category: '', 
  dueDate: getFormattedDate(new Date()),
  impact: 5,
  urgency: 5,
  effort: 5,
  isDomino: false,
  isBlocked: false,
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
    isOpen, 
    onClose, 
    onAdd, 
    onUpdate,
    taskToEdit,
    categories, 
    onAddCategory, 
    onDeleteCategory 
}) => {
  const [formData, setFormData] = useState<TaskFormData>(INITIAL_DATA);
  const [previewScore, setPreviewScore] = useState(0);
  
  // "Manage Categories" mode state
  const [isManagingCategory, setIsManagingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (taskToEdit) {
            // Edit Mode
            setFormData({
                title: taskToEdit.title,
                category: taskToEdit.category,
                dueDate: taskToEdit.dueDate,
                impact: taskToEdit.impact,
                urgency: taskToEdit.urgency,
                effort: taskToEdit.effort,
                isDomino: taskToEdit.isDomino,
                isBlocked: taskToEdit.isBlocked,
            });
        } else {
            // Add Mode
            setFormData({ ...INITIAL_DATA, category: categories[0] || '업무' });
        }
        setIsManagingCategory(false);
        setNewCategoryName('');
    }
  }, [isOpen, taskToEdit, categories]);

  useEffect(() => {
    setPreviewScore(
      calculatePriorityScore(
        formData.impact,
        formData.urgency,
        formData.effort,
        formData.dueDate,
        formData.isDomino,
        formData.isBlocked
      )
    );
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    if (taskToEdit && onUpdate) {
        onUpdate(formData);
    } else {
        onAdd(formData);
    }
    onClose();
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof TaskFormData) => {
      setFormData(prev => ({ ...prev, [field]: Number(e.target.value) }));
  };

  if (!isOpen) return null;

  const isEditMode = !!taskToEdit;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md dark:bg-black/60"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#F4F4F5] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-[500px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-8 pb-4">
              <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isEditMode ? '탭 수정' : '탭 추가'}
              </h2>
              <button onClick={onClose} className="p-3 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X size={28} />
              </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 px-8 pb-8 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* Title Input */}
            <div>
              <label className="block text-base font-extrabold text-zinc-800 dark:text-zinc-300 mb-2">작업 제목</label>
              <input
                type="text"
                placeholder="할 일을 입력하세요"
                className="w-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 text-zinc-900 dark:text-white text-xl font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                autoFocus={!isManagingCategory && !isEditMode}
              />
            </div>

            {/* Row: Category & Due Date */}
            <div className="flex flex-col gap-5">
                {/* Category Section with Manage Mode */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-base font-extrabold text-zinc-800 dark:text-zinc-300">카테고리</label>
                        <button 
                            type="button" 
                            onClick={() => setIsManagingCategory(!isManagingCategory)}
                            className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-colors ${isManagingCategory ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
                        >
                            {isManagingCategory ? <Check size={14} /> : <Settings size={14} />}
                            {isManagingCategory ? '완료' : '관리'}
                        </button>
                    </div>

                    {!isManagingCategory ? (
                        // Select Mode
                        <div className="relative">
                           <select
                              className="w-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-lg text-zinc-900 dark:text-white font-bold appearance-none focus:outline-none focus:border-zinc-400"
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value})}
                          >
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-zinc-500 dark:text-zinc-400">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </div>
                        </div>
                    ) : (
                        // Manage Mode
                        <div className="bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg group border border-zinc-200 dark:border-zinc-600">
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{cat}</span>
                                        <button 
                                            type="button"
                                            onClick={() => onDeleteCategory(cat)}
                                            className="text-zinc-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="새 카테고리..." 
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-orange-500 dark:text-white"
                                />
                                <button 
                                    type="button" 
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl px-4 py-2 disabled:opacity-50"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                  <label className="block text-base font-extrabold text-zinc-800 dark:text-zinc-300 mb-2">마감일</label>
                  <input
                      type="date"
                      className="w-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-lg text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-zinc-400 invert-calendar-icon"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
            </div>

            {/* Sliders Section */}
            <div className="space-y-6 bg-white dark:bg-zinc-800 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              
              {/* Impact */}
              <div>
                  <div className="flex justify-between mb-3 items-end">
                      <label className="text-lg font-extrabold text-zinc-800 dark:text-zinc-300">영향력</label>
                      <span className="text-base font-black text-orange-500">{formData.impact}/10</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={formData.impact} 
                    onChange={e => handleSliderChange(e, 'impact')} 
                    className="w-full h-3 bg-zinc-200 dark:bg-zinc-600 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
              </div>

              {/* Urgency */}
              <div>
                  <div className="flex justify-between mb-3 items-end">
                      <label className="text-lg font-extrabold text-zinc-800 dark:text-zinc-300">긴급도</label>
                      <span className="text-base font-black text-orange-500">{formData.urgency}/10</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={formData.urgency} 
                    onChange={e => handleSliderChange(e, 'urgency')} 
                    className="w-full h-3 bg-zinc-200 dark:bg-zinc-600 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
              </div>

              {/* Effort */}
              <div>
                  <div className="flex justify-between mb-3 items-end">
                      <label className="text-lg font-extrabold text-zinc-800 dark:text-zinc-300">노력/소요</label>
                      <span className="text-base font-black text-zinc-500 dark:text-zinc-400">{formData.effort}/10</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={formData.effort} 
                    onChange={e => handleSliderChange(e, 'effort')} 
                    className="w-full h-3 bg-zinc-200 dark:bg-zinc-600 rounded-full appearance-none cursor-pointer accent-zinc-500"
                  />
              </div>
            </div>

            {/* Core Toggle */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm cursor-pointer" onClick={() => setFormData({...formData, isDomino: !formData.isDomino})}>
                <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-300">핵심 과제 여부</span>
                <button
                    type="button"
                    className={`relative w-16 h-9 rounded-full transition-colors duration-200 ease-in-out ${formData.isDomino ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                >
                    <span 
                        className={`absolute top-1 left-1 bg-white w-7 h-7 rounded-full shadow-sm transform transition-transform duration-200 ${formData.isDomino ? 'translate-x-7' : 'translate-x-0'}`}
                    />
                </button>
            </div>

            {/* Footer / Score & Save */}
            <div className="mt-auto grid grid-cols-2 gap-4 items-stretch pt-2">
                <button 
                    type="button"
                    onClick={onClose}
                    className="py-5 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xl"
                >
                    취소
                </button>
                <div className="relative">
                    <button
                        onClick={handleSubmit}
                        className="w-full h-full py-5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xl flex flex-col items-center justify-center gap-1 active:scale-95 transform duration-100"
                    >
                        <span className="text-xl">{isEditMode ? '수정 완료' : '추가'}</span>
                        <div className="text-xs opacity-80 font-medium">
                            예상 점수 <span className="text-orange-400 dark:text-orange-600 font-black text-sm ml-1">{previewScore.toFixed(0)}점</span>
                        </div>
                    </button>
                </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
