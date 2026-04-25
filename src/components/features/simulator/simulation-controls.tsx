'use client';

import React, { useMemo } from 'react';
import { SimulationParams, LoadProfile } from '@/types';
import { getLoadMultiplier } from '@/lib/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Square } from 'lucide-react';

interface SimulationControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  isRunning: boolean;
  hasResults: boolean;
  simProgress: { elapsed: number; total: number } | null;
}

function LoadPreviewChart({ params, totalRps }: { params: SimulationParams; totalRps: number }) {
  const W = 220, H = 60;
  const PAD = { top: 4, right: 4, bottom: 14, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const dur = params.simulationDurationSeconds;
  const steps = Math.min(dur, 120); // sample up to 120 points

  const points = useMemo(() => {
    return Array.from({ length: steps }, (_, i) => {
      const sec = (i / (steps - 1)) * dur;
      const m = getLoadMultiplier(
        params.loadProfile, sec, dur,
        params.spikeFrequency, params.spikeIntensity,
      );
      return { sec, rps: Math.round(totalRps * m) };
    });
  }, [params.loadProfile, dur, steps, totalRps, params.spikeFrequency, params.spikeIntensity]);

  const maxRps = Math.max(1, ...points.map((p) => p.rps));
  const scaleX = (sec: number) => (sec / dur) * innerW;
  const scaleY = (rps: number) => innerH - (rps / maxRps) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.sec).toFixed(1)},${scaleY(p.rps).toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L${innerW},${innerH} L0,${innerH} Z`;

  const yTicks = [0, Math.round(maxRps / 2), maxRps];
  const xTicks = [0, Math.round(dur / 2), dur];

  return (
    <div className="bg-gray-50 rounded-lg p-1.5 mt-1">
      <p className="text-[9px] text-gray-400 mb-0.5 uppercase tracking-wider">Load Preview (RPS)</p>
      <svg viewBox="0 0 220 60" className="w-full h-15 overflow-visible">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={scaleY(t)} y2={scaleY(t)} stroke="#e5e7eb" strokeWidth={0.5} />
              <text x={-3} y={scaleY(t) + 3} textAnchor="end" fontSize={7} fill="#9ca3af">
                {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
              </text>
            </g>
          ))}
          <path d={areaD} fill="#3b82f6" fillOpacity={0.1} stroke="none" />
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
          {xTicks.map((t) => (
            <text key={t} x={scaleX(t)} y={innerH + 10} textAnchor="middle" fontSize={7} fill="#9ca3af">
              {t}s
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function SimulationControls({
  params,
  onParamsChange,
  onRun,
  onStop,
  onReset,
  isRunning,
  hasResults,
  simProgress,
}: SimulationControlsProps) {
  const totalRps = Math.round(
    params.concurrentUsers * params.requestsPerSecPerUser
  );

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-2 px-1">
        <div className="w-0.5 h-5 rounded-full bg-linear-to-b from-teal-500 to-cyan-500" />
        <h3 className="text-base font-semibold bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Simulation Parameters
        </h3>
      </div>

      <div className="space-y-3">
        {/* Concurrent Users */}
        <div className="space-y-1.5 bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex justify-between">
            <Label className="text-xs">Concurrent Users</Label>
            <span className="text-xs font-mono text-gray-500">
              {params.concurrentUsers.toLocaleString()}
            </span>
          </div>
          <Slider
            value={[params.concurrentUsers]}
            min={1}
            max={100000}
            step={params.concurrentUsers < 100 ? 1 : params.concurrentUsers < 1000 ? 10 : 100}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              onParamsChange({ ...params, concurrentUsers: val as number });
            }}
          />
          <Input
            type="number"
            min={1}
            max={1000000}
            value={params.concurrentUsers}
            onChange={(e) =>
              onParamsChange({
                ...params,
                concurrentUsers: parseInt(e.target.value) || 1,
              })
            }
            className="h-7 text-xs"
          />
        </div>

        {/* Requests per second per user */}
        <div className="space-y-1.5 bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex justify-between">
            <Label className="text-xs">Requests/sec/user</Label>
            <span className="text-xs font-mono text-gray-500">
              {params.requestsPerSecPerUser}
            </span>
          </div>
          <Slider
            value={[params.requestsPerSecPerUser]}
            min={0.1}
            max={100}
            step={0.1}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              onParamsChange({ ...params, requestsPerSecPerUser: val as number });
            }}
          />
          <Input
            type="number"
            min={0.1}
            max={1000}
            step={0.1}
            value={params.requestsPerSecPerUser}
            onChange={(e) =>
              onParamsChange({
                ...params,
                requestsPerSecPerUser: parseFloat(e.target.value) || 0.1,
              })
            }
            className="h-7 text-xs"
          />
        </div>

        {/* Payload Size */}
        <div className="space-y-1.5 bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex justify-between">
            <Label className="text-xs">Payload Size (MB)</Label>
            <span className="text-xs font-mono text-gray-500">
              {params.payloadSizeMB}
            </span>
          </div>
          <Input
            type="number"
            min={0.001}
            max={5000}
            step={0.1}
            value={params.payloadSizeMB}
            onChange={(e) =>
              onParamsChange({
                ...params,
                payloadSizeMB: parseFloat(e.target.value) || 0.001,
              })
            }
            className="h-7 text-xs"
          />
        </div>

        {/* Load Profile */}
        <div className="space-y-1.5 bg-white border rounded-lg p-3 shadow-sm">
          <Label className="text-xs">Load Profile</Label>
          <div className="grid grid-cols-3 gap-1">
            {(['constant', 'sine', 'repeating_spike'] as LoadProfile[]).map((p) => (
              <button
                key={p}
                onClick={() => onParamsChange({ ...params, loadProfile: p })}
                className={`text-[10px] px-2 py-1.5 rounded-md border transition-all duration-200 font-medium text-center leading-tight wrap-break-word 
                style={{ wordBreak: 'break-word' }} ${
                  params.loadProfile === p
                    ? 'bg-blue-500/20 text-blue-800 border-blue-400 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {p === 'constant' ? 'Constant' : p === 'sine' ? 'Sine Wave' : 'Repeating Spike'}
              </button>
            ))}
          </div>

          {/* Spike controls */}
          {params.loadProfile === 'repeating_spike' && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px] text-gray-500">Spike Frequency</Label>
                  <span className="text-[10px] font-mono text-gray-500">{params.spikeFrequency}× per sim</span>
                </div>
                <Slider
                  value={[params.spikeFrequency]}
                  min={1} max={10} step={1}
                  onValueChange={(v) => onParamsChange({ ...params, spikeFrequency: Array.isArray(v) ? v[0] : v })}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px] text-gray-500">Spike Intensity</Label>
                  <span className="text-[10px] font-mono text-gray-500">{params.spikeIntensity}× peak</span>
                </div>
                <Slider
                  value={[params.spikeIntensity]}
                  min={1.5} max={10} step={0.5}
                  onValueChange={(v) => onParamsChange({ ...params, spikeIntensity: Array.isArray(v) ? v[0] : v })}
                />
              </div>
            </div>
          )}

          {/* Load preview chart */}
          <LoadPreviewChart params={params} totalRps={totalRps} />
        </div>

        {/* Duration */}
        <div className="space-y-1.5 bg-white border rounded-lg p-3 shadow-sm">
          <div className="flex justify-between">
            <Label className="text-xs">Duration (seconds)</Label>
            <span className="text-xs font-mono text-gray-500">
              {params.simulationDurationSeconds}s
            </span>
          </div>
          <Slider
            value={[params.simulationDurationSeconds]}
            min={10}
            max={3600}
            step={10}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              onParamsChange({ ...params, simulationDurationSeconds: val as number });
            }}
          />
          <Input
            type="number"
            min={10}
            max={86400}
            step={10}
            value={params.simulationDurationSeconds}
            onChange={(e) =>
              onParamsChange({
                ...params,
                simulationDurationSeconds: parseInt(e.target.value) || 10,
              })
            }
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg p-3 border space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total RPS</span>
          <span className="font-mono font-semibold text-blue-600">{totalRps.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Requests</span>
          <span className="font-mono font-semibold text-blue-600">
            {(totalRps * params.simulationDurationSeconds).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Data Transfer</span>
          <span className="font-mono font-semibold text-blue-600">
            {(totalRps * params.payloadSizeMB).toFixed(1)} MB/s
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {simProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Running simulation…</span>
            <span className="font-mono">{simProgress.elapsed}s / {simProgress.total}s</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(simProgress.elapsed / simProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            onClick={onRun}
            className="flex-1 gap-2 
            bg-green-500/20 text-green-800 border border-green-200
            hover:bg-green-500/10 hover:border-green-400
            transition-all duration-200"
            size="sm"
          >
            <Play className="w-3 h-3" />
            Run Simulation
          </Button>
        ) : (
          <Button
            onClick={onStop}
            className="flex-1 gap-2 
            bg-red-500/20 text-red-800 border border-red-200
            hover:bg-red-500/10 hover:border-red-400
            transition-all duration-200"
            size="sm"
          >
            <Square className="w-3 h-3" />
            Stop
          </Button>
        )}
        <Button
          size="sm"
          onClick={onReset}
          className="gap-2 
          bg-yellow-500/20 text-yellow-500 border border-yellow-200
          hover:bg-yellow-500/10 hover:border-yellow-400
          transition-all duration-200"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
