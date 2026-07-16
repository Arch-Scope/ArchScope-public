import React, { useState } from 'react';
import { Download, FileImage, FileCode, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportToPng, exportToSvg } from '@/lib/utils/export-handlers';
import { SimulationParams, SimulationNodeData } from '@/types';
import { Node } from '@xyflow/react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string | null;
  simulationParams?: SimulationParams | null;
  nodes?: Node<SimulationNodeData>[] | null;
}

export function ExportDialog({ open, onOpenChange, projectName, simulationParams, nodes }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState<'png' | 'svg' | null>(null);

  const handleExport = async (format: 'png' | 'svg') => {
    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (!viewportNode) {
      console.error('Could not find React Flow viewport to export');
      return;
    }

    setIsExporting(format);

    const options = { projectName, simulationParams, nodes };

    try {
      if (format === 'png') {
        await exportToPng(viewportNode, options);
      } else {
        await exportToSvg(viewportNode, options);
      }

      setTimeout(() => onOpenChange(false), 500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const displayName = projectName ?? 'archscope';
  const date = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Export Architecture Diagram
          </DialogTitle>
          <DialogDescription>
            File will be saved as{' '}
            <span className="font-medium text-slate-700">
              {displayName.toLowerCase().replace(/\s+/g, '_')}_{date}
            </span>
            . Metadata overlay (simulation params &amp; components) will be added to PNG export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="outline"
            className="h-16 flex items-center justify-start gap-4 px-6 hover:bg-slate-50 transition-colors"
            onClick={() => handleExport('png')}
            disabled={isExporting !== null}
          >
            {isExporting === 'png' ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            ) : (
              <FileImage className="w-6 h-6 text-blue-500" />
            )}
            <div className="flex flex-col items-start">
              <span className="font-semibold">Export as PNG</span>
              <span className="text-xs text-slate-500 font-normal">
                Includes metadata overlay with simulation info
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-16 flex items-center justify-start gap-4 px-6 hover:bg-slate-50 transition-colors"
            onClick={() => handleExport('svg')}
            disabled={isExporting !== null}
          >
            {isExporting === 'svg' ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            ) : (
              <FileCode className="w-6 h-6 text-purple-500" />
            )}
            <div className="flex flex-col items-start">
              <span className="font-semibold">Export as SVG</span>
              <span className="text-xs text-slate-500 font-normal">
                Scalable vector — best for high-quality printing
              </span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
