import { useCallback } from 'react';
import { Node, Edge, Connection, ReactFlowInstance, addEdge } from '@xyflow/react';
import { SimulationNodeData, ComponentType } from '@/types';

interface UseNodeEventsProps {
  selectedNodes: string[];
  setSelectedNode: (node: Node<SimulationNodeData> | null) => void;
  setSelectedNodes: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedEdge: (edge: Edge | null) => void;
  setRightTab: (tab: string) => void;
  addComponent: (type: ComponentType, position?: { x: number; y: number }) => void;
  reactFlowRef: React.MutableRefObject<ReactFlowInstance<Node<SimulationNodeData>, Edge> | null>;
  setEdges: any;
  saveToHistory: () => void;
}

export function useNodeEvents({
  selectedNodes,
  setSelectedNode,
  setSelectedNodes,
  setSelectedEdge,
  setRightTab,
  addComponent,
  reactFlowRef,
  setEdges,
  saveToHistory,
}: UseNodeEventsProps) {
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();

      if (event.shiftKey && selectedNodes.length > 0) {
        const nodeId = node.id;
        setSelectedNodes((prev) => {
          if (prev.includes(nodeId)) {
            return prev.filter((id) => id !== nodeId);
          } else {
            return [...prev, nodeId];
          }
        });
        setSelectedNode(null);
      } else {
        setSelectedNode(node as Node<SimulationNodeData>);
        setSelectedNodes([]);
        setRightTab('config');
      }
    },
    [selectedNodes.length, setSelectedNode, setSelectedNodes, setRightTab]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setSelectedNodes([]);
  }, [setSelectedNode, setSelectedEdge, setSelectedNodes]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      setSelectedNode(null);
    },
    [setSelectedEdge, setSelectedNode]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds: any) =>
        addEdge(
          {
            ...params,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
          } as any,
          eds
        )
      );
      setTimeout(() => {
        saveToHistory();
      }, 50);
    },
    [setEdges, saveToHistory]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type') as ComponentType;
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position =
        reactFlowRef.current?.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        }) || {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

      addComponent(type, position);
    },
    [addComponent]
  );

  return {
    onNodeClick,
    onPaneClick,
    onEdgeClick,
    onConnect,
    onDragOver,
    onDrop,
  };
}
