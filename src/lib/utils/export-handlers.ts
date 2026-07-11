import { toPng, toSvg } from 'html-to-image';
import { SimulationParams } from '@/types';
import { Node } from '@xyflow/react';
import { SimulationNodeData } from '@/types';

export function downloadImage(dataUrl: string, extension: string, projectName?: string | null) {
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0]; // e.g. 2025-07-09
  const safeName = projectName
    ? projectName.toLowerCase().replace(/\s+/g, '_')
    : 'archscope';
  a.setAttribute('download', `${safeName}_${date}.${extension}`);
  a.setAttribute('href', dataUrl);
  a.click();
}

/**
 * Draws a metadata overlay panel on top of the captured diagram image.
 * Returns a new data URL with the overlay applied.
 */
function applyMetadataOverlay(
  originalDataUrl: string,
  simulationParams?: SimulationParams | null,
  nodes?: Node<SimulationNodeData>[] | null,
  projectName?: string | null
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw the original diagram
      ctx.drawImage(img, 0, 0);

      // --- Build metadata lines ---
      const lines: string[] = [];

      if (projectName) {
        lines.push(`Project: ${projectName}`);
        lines.push(`Exported: ${new Date().toLocaleString()}`);
        lines.push('');
      }

      if (simulationParams) {
        lines.push('── Simulation Parameters ──');
        lines.push(`Duration: ${simulationParams.simulationDurationSeconds}s`);
        lines.push(`Concurrent Users: ${simulationParams.concurrentUsers}`);
        lines.push(`RPS / User: ${simulationParams.requestsPerSecPerUser}`);
        lines.push(`Payload Size: ${simulationParams.payloadSizeMB} MB`);
        lines.push(`Load Profile: ${simulationParams.loadProfile}`);
        if (simulationParams.loadProfile === 'repeating_spike') {
          lines.push(`Spike Frequency: ${simulationParams.spikeFrequency}`);
          lines.push(`Spike Intensity: ${simulationParams.spikeIntensity}x`);
        }
        lines.push('');
      }

      if (nodes && nodes.length > 0) {
        lines.push('── Components ──');
        nodes.forEach((node) => {
          const label = node.data?.label ?? node.id;
          const type = node.data?.componentType ?? 'unknown';
          lines.push(`• ${label} (${type})`);
        });
      }

      if (lines.length === 0) {
        resolve(originalDataUrl);
        return;
      }

      // --- Overlay sizing ---
      const padding = 16;
      const lineHeight = 18;
      const fontSize = 13;
      const panelWidth = 260;
      const panelHeight = lines.length * lineHeight + padding * 2;
      const panelX = canvas.width - panelWidth - padding;
      const panelY = padding;

      // Background panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'; // dark-slate with transparency
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
      ctx.fill();

      // Text rendering
      ctx.font = `${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        const y = panelY + padding + i * lineHeight;
        const x = panelX + padding;

        if (line.startsWith('──')) {
          // Section header
          ctx.fillStyle = '#7dd3fc'; // sky-300
          ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
          ctx.fillText(line, x, y);
          ctx.font = `${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
        } else if (line === '') {
          // blank line — skip
        } else {
          ctx.fillStyle = '#e2e8f0'; // slate-200
          ctx.fillText(line, x, y);
        }
      });

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = originalDataUrl;
  });
}

export interface ExportOptions {
  projectName?: string | null;
  simulationParams?: SimulationParams | null;
  nodes?: Node<SimulationNodeData>[] | null;
}

export async function exportToPng(element: HTMLElement, options: ExportOptions = {}) {
  try {
    const rawDataUrl = await toPng(element, {
      backgroundColor: '#f9fafb',
      pixelRatio: 2,
      filter: (node: HTMLElement) => {
        if (
          node?.classList?.contains('react-flow__minimap') ||
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__panel')
        ) {
          return false;
        }
        return true;
      },
    });

    const finalDataUrl = await applyMetadataOverlay(
      rawDataUrl,
      options.simulationParams,
      options.nodes,
      options.projectName
    );

    downloadImage(finalDataUrl, 'png', options.projectName);
    return { success: true };
  } catch (err) {
    console.error('Failed to export PNG', err);
    return { success: false, error: err };
  }
}

export async function exportToSvg(element: HTMLElement, options: ExportOptions = {}) {
  try {
    const dataUrl = await toSvg(element, {
      backgroundColor: '#f9fafb',
      filter: (node: HTMLElement) => {
        if (
          node?.classList?.contains('react-flow__minimap') ||
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__panel')
        ) {
          return false;
        }
        return true;
      },
    });
    // SVG export: metadata overlay not applied (SVG format; use PNG for overlay)
    downloadImage(dataUrl, 'svg', options.projectName);
    return { success: true };
  } catch (err) {
    console.error('Failed to export SVG', err);
    return { success: false, error: err };
  }
}

