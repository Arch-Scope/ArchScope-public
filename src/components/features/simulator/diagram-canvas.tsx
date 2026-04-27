'use client';

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Panel,
  ReactFlowInstance,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SimulationNodeData } from '@/types';
import { COMPONENT_COLORS } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Boxes, Minus, Map } from 'lucide-react';
import SelectionBox from '@/components/features/architecture/selection-box';
import { nodeTypes } from './constants';
import { PRESETS } from '@/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiagramCanvasProps {
  nodes: Node<SimulationNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  onNodeClick: (event: React.MouseEvent, node: Node<SimulationNodeData>) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  reactFlowRef: React.MutableRefObject<ReactFlowInstance<Node<SimulationNodeData>, Edge> | null>;
  handleSelectionStart: (e: React.MouseEvent) => void;
  handleSelectionMove: (e: React.MouseEvent) => void;
  handleSelectionEnd: (e: React.MouseEvent, setSelectedNodes: (ids: string[]) => void) => void;
  setSelectedNodes: (ids: string[]) => void;
  isSelecting: boolean;
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null;
  isMinimapCollapsed: boolean;
  setIsMinimapCollapsed: (collapsed: boolean) => void;
  handleSaveDesign: () => void;
  handleResetCanvas: () => void;
  loadPreset: (presetId: string | null) => void;
}

export default function DiagramCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onDragOver,
  onDrop,
  reactFlowRef,
  handleSelectionStart,
  handleSelectionMove,
  handleSelectionEnd,
  setSelectedNodes,
  isSelecting,
  selectionBox,
  isMinimapCollapsed,
  setIsMinimapCollapsed,
  handleSaveDesign,
  handleResetCanvas,
  loadPreset
}: DiagramCanvasProps) {
  const [selectedPresetName, setSelectedPresetName] = React.useState<string | null>(null);
  return (
    <div className="flex-1 relative z-0">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          size="sm"
          onClick={handleSaveDesign}
          className="bg-green-500/20 text-green-700 border border-green-200 
          hover:bg-green-500/30 hover:border-green-400
          font-medium transition-all duration-200"
        >
          Save Design
        </Button>

        <Button
          size="sm"
          onClick={handleResetCanvas}
          className="bg-yellow-500/20 text-yellow-800 border border-yellow-200 
          hover:bg-yellow-500/30 hover:border-yellow-400
          font-medium transition-all duration-200"
        >
          Reset
        </Button>
      </div>
      {!isMinimapCollapsed && (
        <div
          onClick={() => setIsMinimapCollapsed(true)}
          className="w-4 h-4 bg-white border-2 border-gray-300 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
          style={{ position: 'absolute', bottom: '172px', right: '25px', zIndex: 9999 }}
          title="Collapse minimap"
        >
          <Minus className="w-2 h-2 text-gray-700" />
        </div>
      )}
      <ReactFlow 
        style={{ zIndex: 0 }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        onMouseDown={handleSelectionStart}
        onMouseMove={handleSelectionMove}
        onMouseUp={(e) => handleSelectionEnd(e, setSelectedNodes)}
        onInit={(instance) => { reactFlowRef.current = instance as unknown as ReactFlowInstance<Node<SimulationNodeData>, Edge>; }}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2, zIndex: 0 },
        }}
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
        <Controls className="!bg-white !border !shadow-md !rounded-lg" />
        {!isMinimapCollapsed && (
          <Panel position="bottom-right" className="!p-0">
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as SimulationNodeData;
                return COMPONENT_COLORS[data.componentType] || '#6366f1';
              }}
              className="!bg-white !border !shadow-md !rounded-lg"
            />
          </Panel>
        )}
        {isMinimapCollapsed && (
          <Panel position="bottom-right" className="!p-0">
            <button
              onClick={() => setIsMinimapCollapsed(false)}
              className="w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Map className="w-5 h-5 text-gray-600" />
            </button>
          </Panel>
        )}
        <Panel position="top-left">
          {/* <Select onValueChange={loadPreset}> */}
          <Select
            onValueChange={(id: string | null) => {
              const preset = PRESETS.find((p) => p.id === id);
              setSelectedPresetName(preset?.name || null);
              loadPreset(id);
            }}
          >
            {/* <SelectTrigger
              className="h-8 text-xs
              bg-indigo-500/20 text-indigo-900 border border-indigo-200
              hover:bg-indigo-500/10 hover:border-indigo-400
              transition-all duration-200"
            > */}
            <SelectTrigger
              className="h-8 text-xs px-3
              bg-pink-500/20 text-pink-800 border border-pink-200
              hover:bg-pink-500/30 hover:border-pink-400
              font-medium transition-all duration-200"
            >
              {/* <SelectValue placeholder="Presets" /> */}
              <span className="flex items-center gap-1">
                <span className="font-medium">Presets</span>
                {selectedPresetName && (
                  <span className="text-indigo-700/60 truncate max-w-25">
                    – {selectedPresetName}
                  </span>
                )}
              </span>
            </SelectTrigger>

            <SelectContent 
              side="bottom"
              align="start"
              sideOffset={8}
              alignItemWithTrigger={false}
              className="
              w-(--radix-select-trigger-width)
              max-h-35
              overflow-y-auto
              bg-white border border-indigo-100 shadow-xl rounded-lg p-1"
            >
              {PRESETS.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="
                    scrollbar-thin scrollbar-thumb-gray-300
                    px-2 py-1.5 rounded-md text-sm cursor-pointer
                    focus:bg-indigo-50 data-[state=checked]:bg-indigo-100
                  "
                >
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-gray-800 text-xs">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                      {p.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>
        <Panel position="top-center">
          {nodes.length === 0 && (
            <div className="bg-white/90 backdrop-blur-sm border rounded-xl px-6 py-4 shadow-lg text-center">
              <Boxes className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                Design your system architecture
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Drag components from the right panel, or load a preset from the top bar
              </p>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                💡 Tip: Hold Shift and drag on empty space to select multiple components
              </p>
            </div>
          )}
        </Panel>
        <SelectionBox
          startX={selectionBox?.startX || 0}
          startY={selectionBox?.startY || 0}
          endX={selectionBox?.endX || 0}
          endY={selectionBox?.endY || 0}
          isActive={isSelecting && !!selectionBox}
        />
      </ReactFlow>
    </div>
  );
}
