import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';

type StickyNodeData = {
  text: string;
  onSendToDashboard?: (text: string) => void;
  [key: string]: unknown;
};
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { StickyNode } from './StickyNode';

const nodeTypes = {
  sticky: StickyNode,
};

const STORAGE_KEY = 'core_tab_board_v1';

const defaultEdgeOptions = {
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
};

const connectionLineStyle = { stroke: '#94a3b8', strokeWidth: 2 };

interface TabBoardProps {
  onSendToDashboard?: (text: string) => void;
}

export const TabBoard = ({ onSendToDashboard }: TabBoardProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StickyNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<any>(null);

  // Inject onSendToDashboard callback into all node data whenever it changes
  const onSendRef = React.useRef(onSendToDashboard);
  onSendRef.current = onSendToDashboard;

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, onSendToDashboard: onSendRef.current },
      }))
    );
  }, [onSendToDashboard, setNodes]);

  // Load from LocalStorage
  useEffect(() => {
    const restoreFlow = async () => {
      try {
        const flow = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (flow) {
          const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
          setNodes((flow.nodes || []).map((n: any) => ({
            ...n,
            data: { ...n.data, onSendToDashboard: onSendRef.current },
          })));
          setEdges(flow.edges || []);
          if (rfInstance) {
            rfInstance.setViewport({ x, y, zoom });
          }
        } else {
          // 기본 튜토리얼 노드 제공
          setNodes([
            {
              id: '1',
              type: 'sticky',
              data: { text: '💡 빈 공간을 우클릭하여 새 메모를 추가해보세요!', onSendToDashboard: onSendRef.current },
              position: { x: 250, y: 150 },
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to restore tab board state:', err);
      }
    };
    restoreFlow();
  }, [setNodes, setEdges, rfInstance]);

  // Save to LocalStorage (1초 디바운스 - 키 입력마다 저장하지 않음)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!rfInstance) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const flow = rfInstance.toObject();
      const cleanFlow = {
        ...flow,
        nodes: flow.nodes.map((n: any) => {
          const { onSendToDashboard, ...rest } = n.data || {};
          return { ...n, data: rest };
        }),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanFlow));
    }, 1000);
  }, [nodes, edges, rfInstance]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    } as Edge, eds)),
    [setEdges]
  );

  const addNewNode = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: uuidv4(),
        type: 'sticky',
        position,
        data: { text: '', onSendToDashboard: onSendRef.current },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes]
  );

  return (
    <div className="w-full h-full relative" onContextMenu={addNewNode}>
      <style>{`
        .dark .react-flow__controls {
          background: #27272a;
          border-color: #3f3f46;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .dark .react-flow__controls-button {
          background: #27272a;
          border-color: #3f3f46;
          color: #a1a1aa;
          fill: #a1a1aa;
        }
        .dark .react-flow__controls-button:hover {
          background: #3f3f46;
          color: #ffffff;
          fill: #ffffff;
        }
        .dark .react-flow__controls-button svg {
          fill: #a1a1aa;
        }
        .dark .react-flow__controls-button:hover svg {
          fill: #ffffff;
        }
        .dark .react-flow__minimap {
          background: #18181b;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        className="bg-[#F4F4F5] dark:bg-[#18181B]"
      >
        <Controls className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-xl" />
        <MiniMap
          zoomable
          pannable
          nodeColor={() => '#f97316'}
          className="bg-zinc-50 dark:bg-zinc-900 shadow-xl rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
        />
        <Background gap={24} size={2} color="rgba(150, 150, 150, 0.2)" />
      </ReactFlow>
    </div>
  );
};
