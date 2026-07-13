import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from '@xyflow/react';
import { SimulationNodeData, SimulationParams, ComponentType } from '@/types';
import { COMPONENT_LABELS, COMPONENT_DEFAULTS } from '@/lib/services';
import { SimpleUndoRedo } from '@/components/common/simple-undo-redo';
import { loadFromStorage, saveToStorage, DEFAULT_PARAMS } from '../utils/storage';

let nodeIdCounter = 0;

export function useSimulatorState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<SimulationNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<SimulationNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<{ nodes: Node<SimulationNodeData>[]; edges: Edge[] } | null>(null);
  const undoRedoRef = useRef<SimpleUndoRedo>(new SimpleUndoRedo());
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [hydrated, setHydrated] = useState(false);
  const reactFlowRef = useRef<ReactFlowInstance<Node<SimulationNodeData>, Edge> | null>(null);

  // Restore from localStorage after first client-side mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setNodes(saved.nodes.map((n: Node<SimulationNodeData>) => ({ ...n, data: { ...n.data, metrics: undefined } })));
      setEdges(saved.edges);
      setSimulationParams(saved.params);
    }
    setHydrated(true);
  }, []);

  // Keep refs in sync with current state for saveToHistory
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Save to localStorage
  useEffect(() => {
    if (hydrated) {
      saveToStorage(nodes, edges, simulationParams);
    }
  }, [nodes, edges, simulationParams, hydrated]);

  // Sync simulationParams with AQL terminal's window state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentState = (window as any).simulationState || { config: {} };
      (window as any).simulationState = {
        ...currentState,
        config: {
          ...currentState.config,
          duration: simulationParams.simulationDurationSeconds,
          load_per_user: simulationParams.requestsPerSecPerUser,
          clients: simulationParams.concurrentUsers,
          payload_size: simulationParams.payloadSizeMB,
          load_profile: simulationParams.loadProfile,
          spike_frequency: simulationParams.spikeFrequency,
          spike_intensity: simulationParams.spikeIntensity
        }
      };
    }
  }, [simulationParams]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    undoRedoRef.current.saveState(nodesRef.current, edgesRef.current);
  }, []);

  // Initialize history system when hydrated
  useEffect(() => {
    if (hydrated) {
      saveToHistory();
    }
  }, [hydrated, saveToHistory]);

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

  const addComponent = useCallback(
    (type: ComponentType, position?: { x: number; y: number }) => {
      const id = `node_${++nodeIdCounter}_${Date.now()}`;

      let resolvedPosition = position;
      if (!resolvedPosition && reactFlowRef.current) {
        const rect = document.querySelector('.react-flow__renderer')?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        resolvedPosition = reactFlowRef.current.screenToFlowPosition({
          x: cx + (Math.random() - 0.5) * 80,
          y: cy + (nodes.length % 5) * 20,
        });
      }

      const newNode: Node<SimulationNodeData> = {
        id,
        type: 'infra',
        position: resolvedPosition ?? { x: 250 + Math.random() * 200, y: 100 + nodes.length * 120 },
        data: {
          label: COMPONENT_LABELS[type],
          componentType: type,
          config: {
            serviceId: COMPONENT_DEFAULTS[type],
            cacheHitRate: type === 'cache' ? 0.8 : undefined,
            queueProcessingTimeMs: type === 'message_queue' ? 100 : undefined,
          },
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setTimeout(() => {
        saveToHistory();
      }, 50);
    },
    [nodes.length, setNodes, saveToHistory]
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<SimulationNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const newData = { ...n.data };
            if (updates.label !== undefined) newData.label = updates.label;
            if (updates.config !== undefined) newData.config = { ...newData.config, ...updates.config };
            if (updates.metrics !== undefined) newData.metrics = updates.metrics;
            return { ...n, data: newData };
          }
          return n;
        })
      );
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => {
          if (!prev) return prev;
          const newData = { ...prev.data };
          if (updates.label !== undefined) newData.label = updates.label;
          if (updates.config !== undefined) newData.config = { ...newData.config, ...updates.config };
          if (updates.metrics !== undefined) newData.metrics = updates.metrics;
          return { ...prev, data: newData };
        });
      }
    },
    [setNodes, selectedNode]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
      setSelectedNodes((prev) => prev.filter((id) => id !== nodeId));
    },
    [setNodes, setEdges, selectedNode]
  );

  const undo = useCallback(() => {
    const prevState = undoRedoRef.current.undo();
    if (prevState) {
      setSelectedNode(null);
      setSelectedNodes([]);
      setSelectedEdge(null);
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
    }
  }, []);

  const redo = useCallback(() => {
    const nextState = undoRedoRef.current.redo();
    if (nextState) {
      setSelectedNode(null);
      setSelectedNodes([]);
      setSelectedEdge(null);
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }
  }, []);

  const copy = useCallback(() => {
    // Handle single node select
    if (selectedNode && selectedNodes.length === 0) {
      const nodesToCopy = nodes.filter((node) => node.id === selectedNode.id);
      const edgesToCopy = edges.filter((edge) =>
        edge.source === selectedNode.id || edge.target === selectedNode.id
      );
      setClipboard({ nodes: nodesToCopy, edges: edgesToCopy });
      return;
    }

    // Handle multi-select
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes);
    const nodesToCopy = nodes.filter((node) => selectedNodeIds.has(node.id));
    const edgesToCopy = edges.filter((edge) =>
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    setClipboard({ nodes: nodesToCopy, edges: edgesToCopy });
  }, [selectedNodes, selectedNode, nodes, edges]);

  const paste = useCallback(() => {
    if (!clipboard) return;

    const idMap: Record<string, string> = {};
    const offsetX = 50;
    const offsetY = 50;

    const newNodes = clipboard.nodes.map((node) => {
      const newId = `node_${++nodeIdCounter}_${Date.now()}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      };
    });

    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `edge_${Date.now()}_${Math.random()}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

    saveToHistory();
    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);

    const pastedNodeIds = newNodes.map((node) => node.id);
    setSelectedNodes(pastedNodeIds);
  }, [clipboard, saveToHistory]);

  const cut = useCallback(() => {
    // Handle single node select
    if (selectedNode && selectedNodes.length === 0) {
      copy();
      saveToHistory();
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setSelectedNodes([]);
      setSelectedEdge(null);
      return;
    }

    // Handle multi-select
    if (selectedNodes.length > 0) {
      copy();
      saveToHistory();
      setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
      setEdges((eds) => eds.filter((e) => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)));
      setSelectedNode(null);
      setSelectedNodes([]);
      setSelectedEdge(null);
    }
  }, [selectedNodes, selectedNode, copy, saveToHistory]);

  const duplicate = useCallback(() => {
    let nodesToDuplicate: Node<SimulationNodeData>[] = [];
    let edgesToDuplicate: Edge[] = [];

    if (selectedNodes.length > 0) {
      const selectedNodeIds = new Set(selectedNodes);
      nodesToDuplicate = nodes.filter((node) => selectedNodeIds.has(node.id));
      edgesToDuplicate = edges.filter((edge) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      );
    } else if (selectedNode) {
      nodesToDuplicate = [selectedNode];
    }

    if (nodesToDuplicate.length === 0) return;

    const idMap: Record<string, string> = {};
    const offsetX = 100;
    const offsetY = 50;

    const newNodes = nodesToDuplicate.map((node) => {
      const newId = `node_${++nodeIdCounter}_${Date.now()}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        selected: true,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
      };
    });

    const newEdges = edgesToDuplicate.map((edge) => ({
      ...edge,
      id: `edge_${Date.now()}_${Math.random()}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

    saveToHistory();
    setNodes((prev) => {
      const unselectedPrev = prev.map((n) => ({
        ...n,
        selected: false,
      }));
      return [...unselectedPrev, ...newNodes];
    });
    setEdges((prev) => [...prev, ...newEdges]);

    const newIds = newNodes.map((n) => n.id);
    if (newIds.length === 1) {
      setSelectedNode(newNodes[0]);
      setSelectedNodes([]);
    } else {
      setSelectedNode(null);
      setSelectedNodes(newIds);
    }
  }, [selectedNodes, selectedNode, nodes, edges, saveToHistory, setNodes, setEdges, setSelectedNode, setSelectedNodes]);

  return {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    selectedNodes,
    clipboard,
    simulationParams,
    hydrated,
    reactFlowRef,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    onConnect,
    addComponent,
    updateNode,
    deleteNode,
    setSelectedNode,
    setSelectedEdge,
    setSelectedNodes,
    setSimulationParams,
    undo,
    redo,
    copy,
    paste,
    cut,
    duplicate,
    saveToHistory,
  };
}
