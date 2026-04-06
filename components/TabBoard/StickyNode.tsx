import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const NOTE_COLORS = [
  { id: 'default', bg: null,      border: null,      dot: '#e4e4e7' },
  { id: 'yellow',  bg: '#fef9c3', border: '#fde68a', dot: '#fde047' },
  { id: 'green',   bg: '#dcfce7', border: '#bbf7d0', dot: '#4ade80' },
  { id: 'blue',    bg: '#dbeafe', border: '#bfdbfe', dot: '#60a5fa' },
  { id: 'pink',    bg: '#fce7f3', border: '#fbcfe8', dot: '#f472b6' },
  { id: 'purple',  bg: '#f3e8ff', border: '#e9d5ff', dot: '#c084fc' },
  { id: 'orange',  bg: '#ffedd5', border: '#fed7aa', dot: '#fb923c' },
];

const LONG_PRESS_DURATION = 600; // ms

export const StickyNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [text, setText] = useState(data.text || '');
  const [color, setColor] = useState(data.color || 'default');
  const [showConfirm, setShowConfirm] = useState(false);

  // Long-press refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => { setText(data.text || ''); }, [data.text]);
  useEffect(() => { setColor(data.color || 'default'); }, [data.color]);

  // Long-press handlers (on the card body area)
  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (text.trim()) {
        setShowConfirm(true);
      }
    }, LONG_PRESS_DURATION);
  }, [text]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Confirm send to dashboard
  const handleConfirmSend = useCallback(() => {
    if (data.onSendToDashboard && text.trim()) {
      data.onSendToDashboard(text.trim());
    }
    setShowConfirm(false);
  }, [data, text]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = evt.target.value;
    setText(newText);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
      )
    );
  };

  const onColorChange = (colorId: string) => {
    setColor(colorId);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, color: colorId } } : node
      )
    );
  };

  const deleteNode = () => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  };

  const activeColor = NOTE_COLORS.find((c) => c.id === color) ?? NOTE_COLORS[0];
  const hasColor = !!activeColor.bg;

  return (
    <div className="relative group p-4 -m-4">
      {/* Card */}
      <div
        className={`rounded-2xl shadow-xl w-64 flex flex-col transition-shadow hover:shadow-2xl overflow-hidden border ${
          hasColor
            ? ''
            : 'bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-zinc-200 dark:border-zinc-700'
        }`}
        style={hasColor ? { backgroundColor: activeColor.bg!, borderColor: activeColor.border! } : {}}
      >
        {/* Header / Drag Handle */}
        <div
          className={`h-8 border-b flex justify-between items-center px-2 cursor-grab active:cursor-grabbing ${
            hasColor ? '' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
          }`}
          style={hasColor ? { backgroundColor: `${activeColor.border}cc`, borderColor: activeColor.border! } : {}}
        >
          {/* Color swatches */}
          <div className="flex items-center gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => onColorChange(c.id)}
                className="nodrag w-3 h-3 rounded-full transition-transform hover:scale-125 focus:outline-none"
                style={{
                  backgroundColor: c.dot,
                  boxShadow: color === c.id ? `0 0 0 2px white, 0 0 0 3px ${c.dot}` : 'none',
                }}
                title={c.id}
              />
            ))}
          </div>

          <button
            onClick={deleteNode}
            className="nodrag w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-black/10 transition-colors"
            title="삭제"
          >
            &times;
          </button>
        </div>

        {/* Body — long press triggers send-to-dashboard */}
        <div
          className="p-3 flex-1"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          <textarea
            className={`nodrag w-full bg-transparent border-none outline-none resize-none font-medium placeholder-zinc-400 text-sm ${
              hasColor ? 'text-zinc-800' : 'text-zinc-900 dark:text-zinc-100'
            }`}
            value={text}
            onChange={onChange}
            placeholder="여기에 아이디어를 적으세요..."
            rows={5}
          />
        </div>
      </div>

      {/* Send-to-Dashboard Confirmation Modal */}
      {showConfirm && (
        <div className="nodrag nowheel absolute inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 rounded-2xl backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          {/* Dialog */}
          <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-2xl p-5 mx-3 border border-zinc-200 dark:border-zinc-700 max-w-[240px] w-full">
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                이 아이디어를 대시보드로<br />보내시겠습니까?
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
                "{text.length > 30 ? text.slice(0, 30) + '…' : text}"
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Top}    className="!w-6 !h-6 !-top-0.5   bg-blue-500   border-[4px] border-white dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-400   hover:!scale-125 cursor-crosshair z-50 rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !-bottom-0.5 bg-blue-500   border-[4px] border-white dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-400   hover:!scale-125 cursor-crosshair z-50 rounded-full" />
      <Handle type="source" position={Position.Right}  id="right" className="!w-6 !h-6 !-right-0.5  bg-orange-500 border-[4px] border-white dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-400 hover:!scale-125 cursor-crosshair z-50 rounded-full" />
      <Handle type="target" position={Position.Left}   id="left"  className="!w-6 !h-6 !-left-0.5   bg-orange-500 border-[4px] border-white dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-400 hover:!scale-125 cursor-crosshair z-50 rounded-full" />
    </div>
  );
};
