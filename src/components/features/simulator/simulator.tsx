'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SimulationNodeData, SimulationParams, SimulationResult } from '@/types';
import { PRESETS } from '@/data';
import { COMPONENT_LABELS, COMPONENT_DEFAULTS } from '@/lib/services';

import SimulationControls from '@/components/features/simulator/simulation-controls';
import SimulatorHeader from './simulator-header';
import DiagramCanvas from './diagram-canvas';
import RightSidebar from './right-sidebar';

import { useResizable } from './hooks/useResizable';
import { useSimulatorState } from './hooks/useSimulatorState';
import { useSimulation } from './hooks/useSimulation';
import { useSelection } from './hooks/useSelection';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNodeEvents } from './hooks/useNodeEvents';
import { useDesigns } from '@/hooks/useDesigns';
import SaveModal from './save-modal';
import CanvasTopBar from './canvas-topbar';
import SimulationTopBar from './simulation-topbar';
import TerminalPanel from './terminal-panel';
import { parseAQLCommand } from '@/lib/aql/parser';
import { executeConfigCommand } from '@/lib/aql/handlers';

export default function Simulator() {
  // Local State
  const [rightTab, setRightTab] = useState('components');
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [currentDesignName, setCurrentDesignName] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  

  // Custom Hooks - State Management
  const simulatorState = useSimulatorState();
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    selectedNodes,
    simulationParams,
    reactFlowRef,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
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
    saveToHistory,
  } = simulatorState;

  const {
    saveDesign,
    loadDesign,
    currentDesignId,
    clearCurrentDesign
  } = useDesigns(nodes, edges);

  // Custom Hooks - Simulation Logic
  const simulation = useSimulation(nodes, edges, simulationParams, setNodes);
  const {
    simulationResult,
    setSimulationResult,
    isRunning,
    simProgress,
    liveTimeSeries,
    handleRunSimulation,
    stopSimulation,
    handleReset,
    handleFastForward,
  } = simulation;

  // Switch to report tab when simulation starts
  useEffect(() => {
    if (isRunning) {
      setRightTab('report');
    }
  }, [isRunning, setRightTab]);

  // Monitor UI simulation completion and update AQL simulation state
  useEffect(() => {
    // When simulation stops and we have results, update the AQL simulation state
    if (!isRunning && simulationResult && simulationResult.totalRequests > 0) {
      
      // Update the global simulation state directly
      // This is a temporary solution - in a real implementation, this would be handled through proper state management
      const aqlResults = {
        id: `sim_${Date.now()}`,
        timestamp: new Date(),
        config: {
          duration: simulationParams.simulationDurationSeconds || 300,
          load_per_user: simulationParams.requestsPerSecPerUser || 10,
          clients: simulationParams.concurrentUsers || 100,
          payload_size: simulationParams.payloadSizeMB || 0.001,
          load_profile: simulationParams.loadProfile || 'constant',
          spike_frequency: simulationParams.spikeFrequency || 3,
          spike_intensity: simulationParams.spikeIntensity || 2
        },
        totalRequests: simulationResult.totalRequests,
        successfulRequests: simulationResult.successfulRequests,
        failedRequests: simulationResult.failedRequests,
        averageLatency: simulationResult.avgEndToEndLatencyMs,
        p95Latency: simulationResult.p99EndToEndLatencyMs,
        p99Latency: simulationResult.p99EndToEndLatencyMs,
        throughput: simulationResult.actualThroughputRps,
        errorRate: simulationResult.failedRequests / (simulationResult.totalRequests || 1),
        nodeMetrics: {},
        bottlenecks: simulationResult.bottlenecks || [],
        duration: simulationParams.simulationDurationSeconds || 300
      };
      
      (window as any).simulationState = {
        isRunning: false,
        currentResults: aqlResults,
        resultsHistory: [aqlResults]
      };
    }
  }, [isRunning, simulationResult]);

  // Helper function to find node by label
  const findNodeByLabel = useCallback((label: string) => {
    return nodes.find((n) => n.data.label === label);
  }, [nodes]);

  // Helper function to check if edge already exists
  const edgeExists = useCallback((sourceId: string, targetId: string) => {
    return edges.some((e) => e.source === sourceId && e.target === targetId);
  }, [edges]);

  // AQL Architecture Command Handlers
  const handleAddComponent = useCallback((type: string, nodeId?: string, serviceId?: string, label?: string) => {
    // Validate component type
    const componentType = type as keyof typeof COMPONENT_LABELS;
    if (!COMPONENT_LABELS[componentType]) {
      return {
        success: false,
        message: `Invalid component type: ${type}`,
      };
    }

    if (!label) {
      label = COMPONENT_LABELS[componentType] || type;
    }

    // Validate duplicate label
    const existingNode = findNodeByLabel(label);
    if (existingNode) {
      return {
        success: false,
        message: `Component "${label}" already exists`,
      };
    }

    // Use the provided serviceId or fall back to default
    const finalServiceId = serviceId || COMPONENT_DEFAULTS[componentType];

    // Use label as the node ID
    const newNode: Node<SimulationNodeData> = {
      id: label,
      type: 'infra',
      position: { x: 250 + Math.random() * 200, y: 100 + nodes.length * 120 },
      data: {
        label: label,
        componentType: componentType,
        config: {
          serviceId: finalServiceId,
          cacheHitRate: componentType === 'cache' ? 0.8 : undefined,
          queueProcessingTimeMs: componentType === 'message_queue' ? 100 : undefined,
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setTimeout(() => saveToHistory(), 50);
    return {
      success: true,
      message: `Added ${componentType} as ${label} using ${finalServiceId}`,
    };
  }, [nodes.length, setNodes, saveToHistory, findNodeByLabel]);

  const handleRemoveNode = useCallback((label: string) => {
    const node = findNodeByLabel(label);
    if (!node) {
      return {
        success: false,
        message: `Component "${label}" not found`,
      };
    }
    deleteNode(node.id);
    return {
      success: true,
      message: `Removed ${label}`,
    };
  }, [deleteNode, findNodeByLabel]);

  const handleConnectNodes = useCallback((sourceLabel: string, targetLabel: string, animated?: boolean) => {
    const sourceNode = findNodeByLabel(sourceLabel);
    const targetNode = findNodeByLabel(targetLabel);

    if (!sourceNode) {
      return {
        success: false,
        message: `Component "${sourceLabel}" not found`,
      };
    }

    if (!targetNode) {
      return {
        success: false,
        message: `Component "${targetLabel}" not found`,
      };
    }

    // Check if edge already exists
    if (edgeExists(sourceNode.id, targetNode.id)) {
      return {
        success: false,
        message: `Connection already exists`,
      };
    }

    // Deterministic edge ID based on source and target
    const edgeId = `edge_${sourceNode.id}_${targetNode.id}`;
    const newEdge: Edge = {
      id: edgeId,
      source: sourceNode.id,
      target: targetNode.id,
      animated: animated || false,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    };
    setEdges((eds) => [...eds, newEdge]);
    setTimeout(() => saveToHistory(), 50);
    return {
      success: true,
      message: `Connected ${sourceLabel} to ${targetLabel}${animated ? ' (animated)' : ''}`,
    };
  }, [setEdges, saveToHistory, findNodeByLabel, edgeExists]);

  const handleDisconnectNodes = useCallback((sourceLabel: string, targetLabel: string) => {
    const sourceNode = findNodeByLabel(sourceLabel);
    const targetNode = findNodeByLabel(targetLabel);

    if (!sourceNode) {
      return {
        success: false,
        message: `Component "${sourceLabel}" not found`,
      };
    }

    if (!targetNode) {
      return {
        success: false,
        message: `Component "${targetLabel}" not found`,
      };
    }

    // Check if edge exists
    if (!edgeExists(sourceNode.id, targetNode.id)) {
      return {
        success: false,
        message: `Connection does not exist`,
      };
    }

    setEdges((eds) => eds.filter((e) => !(e.source === sourceNode.id && e.target === targetNode.id)));
    setTimeout(() => saveToHistory(), 50);
    return {
      success: true,
      message: `Disconnected ${sourceLabel} from ${targetLabel}`,
    };
  }, [setEdges, saveToHistory, findNodeByLabel, edgeExists]);

  const handleRenameNode = useCallback((oldLabel: string, newLabel: string) => {
    const node = findNodeByLabel(oldLabel);
    if (!node) {
      return {
        success: false,
        message: `Component "${oldLabel}" not found`,
      };
    }

    // Validate duplicate label
    const existingNode = findNodeByLabel(newLabel);
    if (existingNode) {
      return {
        success: false,
        message: `Component "${newLabel}" already exists`,
      };
    }

    // Update the node ID to match the new label and update the label in data
    setNodes((nds) => nds.map((n) => {
      if (n.id === node.id) {
        return { ...n, id: newLabel, data: { ...n.data, label: newLabel } };
      }
      return n;
    }));
    // Update edges to use the new ID with deterministic edge IDs
    setEdges((eds) => eds.map((e) => {
      if (e.source === node.id) {
        return { ...e, source: newLabel, id: `edge_${newLabel}_${e.target}` };
      }
      if (e.target === node.id) {
        return { ...e, target: newLabel, id: `edge_${e.source}_${newLabel}` };
      }
      return e;
    }));
    setTimeout(() => saveToHistory(), 50);
    return {
      success: true,
      message: `Renamed ${oldLabel} to ${newLabel}`,
    };
  }, [findNodeByLabel, setNodes, setEdges, saveToHistory]);

  const handleShowNodes = useCallback(() => {
    return nodes.map((n) => ({
      label: n.data.label,
      type: n.data.componentType,
    }));
  }, [nodes]);

  const handleShowConnections = useCallback(() => {
    return edges.map((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      const targetNode = nodes.find((n) => n.id === e.target);
      return {
        source: sourceNode?.data.label || e.source,
        target: targetNode?.data.label || e.target,
        animated: e.animated || false,
      };
    });
  }, [edges, nodes]);

  // AQL Configuration Command Handlers
  const handleSetConfig = useCallback(async (command: string) => {
    const parsed = parseAQLCommand(command);
    if (parsed.type === 'unknown') {
      return {
        success: false,
        message: parsed.error || 'Invalid command',
      };
    }

    return executeConfigCommand(parsed, nodes, edges, updateNode);
  }, [nodes, edges, updateNode]);

  const handleMultiConfig = useCallback(async (command: string) => {
    const parsed = parseAQLCommand(command);
    if (parsed.type === 'unknown') {
      return {
        success: false,
        message: parsed.error || 'Invalid command',
      };
    }

    return executeConfigCommand(parsed, nodes, edges, updateNode);
  }, [nodes, edges, updateNode]);

  const handleResetConfig = useCallback(async (command: string) => {
    const parsed = parseAQLCommand(command);
    if (parsed.type === 'unknown') {
      return {
        success: false,
        message: parsed.error || 'Invalid command',
      };
    }

    return executeConfigCommand(parsed, nodes, edges, updateNode);
  }, [nodes, edges, updateNode]);

  // General AQL Command Handler (for simulation commands and others)
  const handleAQLCommand = useCallback(async (command: string) => {
    const parsed = parseAQLCommand(command);
    if (parsed.type === 'unknown') {
      return {
        success: false,
        message: parsed.error || 'Invalid command',
      };
    }

    // Handle canvas resize commands
if (command.trim() === 'zoom_in') {
  reactFlowRef.current?.zoomIn();
  return {
    success: true,
    message: 'Zoomed in',
  };
}

if (command.trim() === 'zoom_out') {
  reactFlowRef.current?.zoomOut();
  return {
    success: true,
    message: 'Zoomed out',
  };
}

if (command.trim() === 'fit_view') {
  reactFlowRef.current?.fitView({ padding: 0.2 });
  return {
    success: true,
    message: 'Canvas fitted to view',
  };
}
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;

    // Create a wrapper function that handles partial updates
    const updateUIParams = (partialParams: Partial<SimulationParams>) => {
      setSimulationParams(prev => ({ ...prev, ...partialParams }));
    };

    // Create simulation completion callback
    const handleSimulationComplete = (results: any) => {
      // This will be called when simulation completes
      console.log('Simulation completion callback received in simulator:', results);
    };

    return executeConfigCommand(
      parsed,
      nodes,
      edges,
      updateNode,
      setNodes,
      setEdges,
      setSimulationParams,
      simulationParams,
      updateUIParams,
      handleRunSimulation,
      stopSimulation,
      handleReset,
      handleSimulationComplete,
      undefined,
      token,
      setCurrentDesignName
    );
  }, [nodes, edges, updateNode, setNodes, setEdges, setSimulationParams, simulationParams, handleRunSimulation, stopSimulation, handleReset, setCurrentDesignName]);

  // Custom Hooks - Selection & Events
  const selection = useSelection(nodes, reactFlowRef);
  const { isSelecting, selectionBox, handleSelectionStart, handleSelectionMove, handleSelectionEnd } = selection;

  const nodeEvents = useNodeEvents({
    selectedNodes,
    setSelectedNode,
    setSelectedNodes,
    setSelectedEdge,
    setRightTab,
    addComponent,
    reactFlowRef,
    setEdges,
    saveToHistory,
  });
  const { onNodeClick, onPaneClick, onEdgeClick, onConnect, onDragOver, onDrop } = nodeEvents;

  // Custom Hooks - Keyboard Shortcuts
  useKeyboardShortcuts({
    selectedNodes,
    selectedNode,
    selectedEdge,
    nodes,
    setNodes,
    setEdges,
    saveToHistory,
    undo,
    redo,
    copy,
    paste,
    setSelectedNode,
    setSelectedNodes,
    setSelectedEdge,
  });

  // Memoized Values
  const selectedNodeForPanel = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find((n) => n.id === selectedNode.id) || null;
  }, [selectedNode, nodes]);

  const memoizedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isMultiSelected: selectedNodes.includes(n.id),
        },
        className: [
          n.id === selectedNode?.id ? 'selected-node' : '',
          selectedNodes.includes(n.id) ? 'multi-selected-node' : '',
        ]
          .filter(Boolean)
          .join(' '),
        selected: selectedNodes.includes(n.id) || n.id === selectedNode?.id,
      })),
    [nodes, selectedNodes, selectedNode]
  );

  const memoizedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: edge.id === selectedEdge?.id,
        style: {
          stroke: '#94a3b8',
          strokeWidth: edge.id === selectedEdge?.id ? 3 : 2,
        },
      })),
    [edges, selectedEdge]
  );

  // Custom Hooks - Resizable Panels
  const leftPanel = useResizable(256, 180, 480, false);
  const rightPanel = useResizable(288, 220, 560, true);
  const terminalPanel = useResizable(288, 200, 600, true, 'vertical');

  // Event Handlers
  const loadPreset = useCallback(
    (presetId: string | null) => {
      if (!presetId) return;
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      setCurrentDesignName(preset.name);

      saveToHistory();

      simulatorState.setNodes(preset.nodes as Node<SimulationNodeData>[]);
      simulatorState.setEdges(
        preset.edges.map((e: Edge) => ({
          ...e,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }))
      );
      setSimulationParams(preset.simulationParams);
      setSimulationResult(null);
      setSelectedNode(null);
      setSelectedNodes([]);

      setTimeout(() => {
        saveToHistory();
      }, 100);

      setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.2 });
      }, 100);
    },
    [simulatorState, saveToHistory, setSimulationParams, setSimulationResult, setSelectedNode, setSelectedNodes, reactFlowRef]
  );

  const handleResetCanvas = useCallback(() => {
    const confirmReset = confirm('Clear entire canvas?');

    if (!confirmReset) return;

    setNodes([]);
    setEdges([]);

    // Clear both UI label and loaded design context
    setCurrentDesignName(null);
    clearCurrentDesign();
  }, [setNodes, setEdges]);

  // Render
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <SimulatorHeader
        selectedNodesCount={selectedNodes.length}
        loadPreset={loadPreset}
        handleLoadDesigns={(design) => {
          loadDesign(design, setNodes, setEdges);
          setCurrentDesignName(design.name);
        }}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Simulation Controls */}
        <div className="border-r bg-white flex flex-col shrink-0" style={{ width: leftPanel.size }}>
          <div className="flex flex-col h-full">

            {/* TOP BAR */}
            <SimulationTopBar
              onRun={handleRunSimulation}
              onStop={stopSimulation}
              onReset={handleReset}
              isRunning={isRunning}
            />

            {/* CONTENT (with padding + scroll) */}
            <div className="p-3 overflow-y-auto flex-1">
              <SimulationControls
                params={simulationParams}
                onParamsChange={setSimulationParams}
                onRun={handleRunSimulation}
                onStop={stopSimulation}
                onReset={handleReset}
                isRunning={isRunning}
                hasResults={!!simulationResult}
                simProgress={simProgress}
                selectedDesignName={currentDesignName}
              />
            </div>
          </div>
        </div>

        {/* Left Resize Handle */}
        <div
          onMouseDown={leftPanel.onMouseDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors relative z-10 group"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-3 bg-white rounded-full" />
            <div className="w-0.5 h-3 bg-white rounded-full" />
          </div>
        </div>

        {/* CENTER AREA */}
        <div className="flex-1 flex flex-col">

          {/* TOP BAR */}
          <CanvasTopBar
            loadPreset={loadPreset}
            onSave={() => setIsSaveModalOpen(true)}
            onReset={handleResetCanvas}
            selectedDesignName={currentDesignName}
            onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
            isTerminalOpen={isTerminalOpen}
            simulationParams={simulationParams}
            nodes={nodes}
          />

          {/* CANVAS */}
          <DiagramCanvas
            nodes={memoizedNodes}
            edges={memoizedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            reactFlowRef={reactFlowRef}
            handleSelectionStart={handleSelectionStart}
            handleSelectionMove={handleSelectionMove}
            handleSelectionEnd={handleSelectionEnd}
            setSelectedNodes={setSelectedNodes}
            isSelecting={isSelecting}
            selectionBox={selectionBox}
            isMinimapCollapsed={isMinimapCollapsed}
            setIsMinimapCollapsed={setIsMinimapCollapsed}
          />
          
          {/* TERMINAL PANEL */}
          {isTerminalOpen && (
            <>
              {/* Terminal Resize Handle */}
              <div
                onMouseDown={terminalPanel.onMouseDown}
                className="h-1.5 shrink-0 cursor-row-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors relative z-10 group"
                style={{ touchAction: 'none' }}
              >
                <div className="absolute inset-x-0 -top-2 -bottom-2" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-0.5 w-3 bg-white rounded-full" />
                  <div className="h-0.5 w-3 bg-white rounded-full" />
                </div>
              </div>
              <TerminalPanel
                onClose={() => setIsTerminalOpen(false)}
                onAddComponent={handleAddComponent}
                onRemoveNode={handleRemoveNode}
                onConnectNodes={handleConnectNodes}
                onDisconnectNodes={handleDisconnectNodes}
                onRenameNode={handleRenameNode}
                onShowNodes={handleShowNodes}
                onShowConnections={handleShowConnections}
                onSetConfig={handleSetConfig}
                onMultiConfig={handleMultiConfig}
                onResetConfig={handleResetConfig}
                onAQLCommand={handleAQLCommand}
                height={terminalPanel.size}
              />
            </>
          )}
        </div>

        {/* Right Resize Handle */}
        <div
          onMouseDown={rightPanel.onMouseDown}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors relative z-10 group"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-3 bg-white rounded-full" />
            <div className="w-0.5 h-3 bg-white rounded-full" />
          </div>
        </div>

        <RightSidebar
          rightTab={rightTab}
          setRightTab={setRightTab}
          rightPanelSize={rightPanel.size}
          addComponent={addComponent}
          selectedNodeForPanel={selectedNodeForPanel}
          updateNode={updateNode}
          deleteNode={deleteNode}
          simulationResult={simulationResult}
          liveTimeSeries={liveTimeSeries}
          isRunning={isRunning}
          handleFastForward={handleFastForward}
        />
      </div>
      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onUpdate={saveDesign}
        onSaveAsNew={() => {
          clearCurrentDesign();
          saveDesign();
        }}
        hasExisting={!!currentDesignId}
      />
    </div>
  );
}
