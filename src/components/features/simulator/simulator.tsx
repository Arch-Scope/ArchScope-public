'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SimulationNodeData } from '@/types';
import { PRESETS } from '@/data';

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

export default function Simulator() {
  // Local State
  const [rightTab, setRightTab] = useState('components');
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

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

  // Event Handlers
  const loadPreset = useCallback(
    (presetId: string | null) => {
      if (!presetId) return;
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

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
  }, [setNodes, setEdges]);

  // Render
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <SimulatorHeader
        selectedNodesCount={selectedNodes.length}
        loadPreset={loadPreset}
        handleLoadDesigns={(design) => loadDesign(design, setNodes, setEdges)}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Simulation Controls */}
        <div className="border-r bg-white flex flex-col shrink-0" style={{ width: leftPanel.size }}>
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
            />
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
