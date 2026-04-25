'use client';

import React from 'react';
import { Node } from '@xyflow/react';
import { SimulationNodeData } from '@/types';

import ComponentPalette from '@/components/features/architecture/component-palette';
import ConfigPanel from './config-panel';
import ReportPanel from '@/components/features/analytics/report-panel';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutGrid, Settings2, BarChart3 } from 'lucide-react';

interface RightSidebarProps {
  rightTab: string;
  setRightTab: (tab: string) => void;
  rightPanelSize: number | string;
  addComponent: (component: any) => void;
  selectedNodeForPanel: Node<SimulationNodeData> | null;
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  simulationResult: any;
  liveTimeSeries: any;
  isRunning: boolean;
  handleFastForward: () => void;
}

export default function RightSidebar({
  rightTab,
  setRightTab,
  rightPanelSize,
  addComponent,
  selectedNodeForPanel,
  updateNode,
  deleteNode,
  simulationResult,
  liveTimeSeries,
  isRunning,
  handleFastForward,
}: RightSidebarProps) {
  return (
    <div className="border-l bg-white flex flex-col flex-shrink-0" style={{ width: rightPanelSize }}>
      <Tabs value={rightTab} onValueChange={(val) => setRightTab(val as string)} className="flex flex-col h-full">
        <TabsList className="flex-shrink-0 m-2 grid grid-cols-3 w-full">
          <TabsTrigger value="components" className="text-xs gap-1">
            <LayoutGrid className="w-3 h-3" />
            Add
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1">
            <Settings2 className="w-3 h-3" />
            Config
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" />
            Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="flex-1 min-h-0 m-0 bg-gray-50">
          <div className="h-full overflow-y-auto">
            <ComponentPalette onAddComponent={addComponent} />
          </div>
        </TabsContent>

        <TabsContent value="config" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <ConfigPanel
              node={selectedNodeForPanel}
              onUpdate={updateNode}
              onDelete={deleteNode}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="report" className="flex-1 overflow-hidden m-0">
          <ReportPanel result={simulationResult} liveTimeSeries={liveTimeSeries} isRunning={isRunning} handleFastForward={handleFastForward} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
