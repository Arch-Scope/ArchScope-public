'use client';

import React from 'react';
import { SimulationResult, TimeSeriesDataPoint } from '@/types';
import { COMPONENT_COLORS } from '@/lib/services';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
  Zap,
  XCircle,
  ShieldAlert,
  FastForward,
} from 'lucide-react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface ReportPanelProps {
  result: SimulationResult | null;
  liveTimeSeries?: TimeSeriesDataPoint[];
  isRunning?: boolean;
  handleFastForward?: () => void;
}

function SimulationHeader({ status, handleFastForward }: { status: string; handleFastForward?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-blue-600">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider">{status}</span>
      </div>
      {handleFastForward && (
        <Button
          onClick={handleFastForward}
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
        >
          <FastForward className="w-3 h-3" />
          Fast Forward
        </Button>
      )}
    </div>
  );
}

export default function ReportPanel({ result, liveTimeSeries = [], isRunning = false, handleFastForward }: ReportPanelProps) {
  // While running but no final result yet — show live chart
  if (!result) {
    if (isRunning) {
      const totalSoFar = liveTimeSeries.reduce((s, p) => s + p.successful + p.failed + p.rateLimited + p.queued, 0);
      const successSoFar = liveTimeSeries.reduce((s, p) => s + p.successful, 0);
      const rlSoFar = liveTimeSeries.reduce((s, p) => s + p.rateLimited, 0);
      const queuedSoFar = liveTimeSeries.reduce((s, p) => s + p.queued, 0);
      const hasRL = rlSoFar > 0;
      const hasQueued = queuedSoFar > 0;
      const isStarting = liveTimeSeries.length === 0;

      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <SimulationHeader
              status={isStarting ? "Starting Simulation…" : "Simulation Running…"}
              handleFastForward={handleFastForward}
            />
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<Activity className="w-4 h-4 text-blue-500" />}
                label="Requests"
                value={isStarting ? "0" : totalSoFar.toLocaleString()}
                subValue={isStarting ? "initializing" : "so far"}
              />
              <MetricCard
                icon={<Zap className="w-4 h-4 text-green-500" />}
                label="Successful"
                value={isStarting ? "0" : successSoFar.toLocaleString()}
                subValue={isStarting ? "0%" : `${totalSoFar > 0 ? ((successSoFar / totalSoFar) * 100).toFixed(1) : 0}%`}
              />
              {!isStarting && hasRL && (
                <MetricCard
                  icon={<ShieldAlert className="w-4 h-4 text-orange-500" />}
                  label="Rate Limited"
                  value={rlSoFar.toLocaleString()}
                  subValue={`${totalSoFar > 0 ? ((rlSoFar / totalSoFar) * 100).toFixed(1) : 0}%`}
                  alert
                />
              )}
              {!isStarting && hasQueued && (
                <MetricCard
                  icon={<ShieldAlert className="w-4 h-4 text-purple-500" />}
                  label="Queued"
                  value={queuedSoFar.toLocaleString()}
                  subValue="buffered in queue"
                />
              )}
            </div>
            {!isStarting && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Requests Over Time (Live)</h3>
                <TimeSeriesChart data={liveTimeSeries} />
                <div className="flex gap-3 mt-2 flex-wrap">
                  <LegendDot color="#22c55e" label="Successful" />
                  <LegendDot color="#ef4444" label="Failed" />
                  {hasRL && <LegendDot color="#f97316" label="Rate Limited" />}
                  {hasQueued && <LegendDot color="#a855f7" label="Queued" />}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8 text-center">
        <div>
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Run a simulation to see results</p>
          <p className="text-xs mt-1">Configure your architecture and hit &quot;Run Simulation&quot;</p>
        </div>
      </div>
    );
  }

  const hasBottlenecks = result.bottlenecks.length > 0;
  const allSubmitted = result.successfulRequests + result.failedRequests + result.queuedRequests;
  const successRate = allSubmitted > 0
    ? ((result.successfulRequests / allSubmitted) * 100).toFixed(2)
    : '0';

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">
        {/* Overall Status */}
        <div className={`rounded-xl p-4 ${hasBottlenecks ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {hasBottlenecks ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            <h3 className={`font-semibold ${hasBottlenecks ? 'text-amber-800' : 'text-green-800'}`}>
              {hasBottlenecks
                ? `${result.bottlenecks.length} Bottleneck${result.bottlenecks.length > 1 ? 's' : ''} Detected`
                : 'System Healthy'}
            </h3>
          </div>
          <p className={`text-sm ${hasBottlenecks ? 'text-amber-700' : 'text-green-700'}`}>
            {hasBottlenecks
              ? 'Some components are under heavy load. Review suggestions below.'
              : 'All components are operating within healthy utilization thresholds.'}
          </p>
        </div>

        {/* Key Metrics */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Key Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={<Clock className="w-4 h-4 text-blue-500" />}
              label="Avg Latency"
              value={formatLatency(result.avgEndToEndLatencyMs)}
              subValue={`P99: ${formatLatency(result.p99EndToEndLatencyMs)}`}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
              label="Throughput"
              value={`${result.actualThroughputRps.toLocaleString()} rps`}
              subValue={`Max: ${result.maxThroughputRps.toLocaleString()} rps`}
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-amber-500" />}
              label="Cost / Hour"
              value={`$${result.totalCostPerHour.toFixed(2)}`}
              subValue={`$${result.totalCostPerMonth.toFixed(0)}/month`}
            />
            <MetricCard
              icon={<Zap className="w-4 h-4 text-purple-500" />}
              label="Success Rate"
              value={`${successRate}%`}
              subValue={`${result.failedRequests.toLocaleString()} failed`}
              alert={Number(successRate) < 99}
            />
            {result.rateLimitedRequests > 0 && (
              <MetricCard
                icon={<ShieldAlert className="w-4 h-4 text-orange-500" />}
                label="Rate Limited"
                value={result.rateLimitedRequests.toLocaleString()}
                subValue={`${((result.rateLimitedRequests / result.totalRequests) * 100).toFixed(1)}% of traffic`}
                alert
              />
            )}
            {result.queuedRequests > 0 && (
              <MetricCard
                icon={<ShieldAlert className="w-4 h-4 text-purple-500" />}
                label="Queued"
                value={result.queuedRequests.toLocaleString()}
                subValue={`${((result.queuedRequests / result.totalRequests) * 100).toFixed(1)}% buffered`}
              />
            )}
          </div>
        </div>

        {/* Request Summary */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Request Summary
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Requests</span>
              <span className="font-mono font-semibold">{result.totalRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Successful
              </span>
              <span className="font-mono font-semibold text-green-600">
                {result.successfulRequests.toLocaleString()}
              </span>
            </div>
        <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" /> Failed
              </span>
              <span className="font-mono font-semibold text-red-600">
                {result.failedRequests.toLocaleString()}
              </span>
            </div>
            {result.rateLimitedRequests > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-orange-500" /> Rate Limited
                </span>
                <span className="font-mono font-semibold text-orange-600">
                  {result.rateLimitedRequests.toLocaleString()}
                </span>
              </div>
            )}
            {result.queuedRequests > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-purple-500" /> Queued (buffered)
                </span>
                <span className="font-mono font-semibold text-purple-600">
                  {result.queuedRequests.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Time-Series Chart */}
        {result.timeSeries.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Requests Over Time
            </h3>
            <TimeSeriesChart data={result.timeSeries} />
            <div className="flex gap-3 mt-2 flex-wrap">
              <LegendDot color="#22c55e" label="Successful" />
              <LegendDot color="#ef4444" label="Failed" />
              {result.rateLimitedRequests > 0 && <LegendDot color="#f97316" label="Rate Limited" />}
              {result.queuedRequests > 0 && <LegendDot color="#a855f7" label="Queued" />}
            </div>
            {result.queuedRequests > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Queue Depth Over Time
                </h4>
                <QueueDepthChart data={result.timeSeries} />
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Latency Breakdown */}
        {result.latencyBreakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Latency Breakdown (Critical Path)
            </h3>
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={result.latencyBreakdown.map(item => ({
                      name: item.nodeLabel,
                      value: item.avgLatencyMs,
                      percent: item.percentOfTotal,
                      color: COMPONENT_COLORS[item.componentType],
                    }))}
                    cx="50%"
                    cy="45%"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {result.latencyBreakdown.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={COMPONENT_COLORS[item.componentType]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      formatLatency(value),
                      name,
                      `${props.payload?.percent?.toFixed(1)}%`,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value: string, entry: any) => (
                      <span className="text-xs">
                        {value} ({entry.payload.percent.toFixed(1)}%)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <Separator />

        {/* Cost Breakdown */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Monthly Cost Breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(result.nodeMetrics)
              .filter(([, m]) => m.costPerMonth > 0)
              .sort(([, a], [, b]) => b.costPerMonth - a.costPerMonth)
              .map(([nodeId, metrics]) => {
                const pct = result.totalCostPerMonth > 0
                  ? (metrics.costPerMonth / result.totalCostPerMonth) * 100
                  : 0;
                return (
                  <div key={nodeId} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-gray-600">{nodeId}</span>
                      <span className="font-mono font-medium">
                        ${metrics.costPerMonth.toFixed(2)}/mo
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            <div className="flex justify-between pt-2 border-t text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono">${result.totalCostPerMonth.toFixed(2)}/mo</span>
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        {result.bottlenecks.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Bottleneck Analysis
              </h3>
              <div className="space-y-3">
                {result.bottlenecks.map((b) => (
                  <div
                    key={b.nodeId}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-sm font-semibold text-red-800">
                        {b.nodeLabel}
                      </span>
                      <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                        {b.utilization.toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-red-600 mb-1">{b.reason}</p>
                    <p className="text-xs text-red-700 font-medium">{b.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${alert ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      </div>
      <div className={`text-lg font-bold font-mono ${alert ? 'text-red-700' : 'text-gray-800'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400">{subValue}</div>
    </div>
  );
}

function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms > 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

function TimeSeriesChart({ data }: { data: TimeSeriesDataPoint[] }) {
  if (data.length === 0) return null;

  const W = 260;
  const H = 100;
  const PAD = { top: 8, right: 4, bottom: 20, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(1, ...data.map((d) => d.successful + d.failed + d.rateLimited + d.queued));
  const maxSec = Math.max(1, data[data.length - 1].second);

  const scaleX = (sec: number) => (sec / maxSec) * innerW;
  const scaleY = (v: number) => innerH - (v / maxVal) * innerH;

  const toPath = (values: number[]) => {
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(data[i].second).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');
  };

  const successVals = data.map((d) => d.successful);
  const failedVals = data.map((d) => d.failed);
  const rlVals = data.map((d) => d.rateLimited);
  const queuedVals = data.map((d) => d.queued);

  const hasRL = data.some((d) => d.rateLimited > 0);
  const hasFailed = data.some((d) => d.failed > 0);
  const hasQueued = data.some((d) => d.queued > 0);

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <svg width={W} height={H} className="overflow-visible">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={scaleY(t)} y2={scaleY(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-4} y={scaleY(t) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
                {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
              </text>
            </g>
          ))}
          {hasQueued && (
            <path d={toPath(queuedVals)} fill="none" stroke="#a855f7" strokeWidth={1.5} strokeOpacity={0.8} />
          )}
          {hasRL && (
            <path d={toPath(rlVals)} fill="none" stroke="#f97316" strokeWidth={1.5} strokeOpacity={0.8} />
          )}
          {hasFailed && (
            <path d={toPath(failedVals)} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.8} />
          )}
          <path d={toPath(successVals)} fill="none" stroke="#22c55e" strokeWidth={2} />
          {[0, Math.round(maxSec / 2), maxSec].map((t) => (
            <text key={t} x={scaleX(t)} y={innerH + 12} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {t}s
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function QueueDepthChart({ data }: { data: TimeSeriesDataPoint[] }) {
  if (data.length === 0) return null;

  const W = 260;
  const H = 80;
  const PAD = { top: 8, right: 4, bottom: 20, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(1, ...data.map((d) => d.queueDepth));
  const maxSec = Math.max(1, data[data.length - 1].second);

  const scaleX = (sec: number) => (sec / maxSec) * innerW;
  const scaleY = (v: number) => innerH - (v / maxVal) * innerH;

  const depthPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.second).toFixed(1)},${scaleY(d.queueDepth).toFixed(1)}`)
    .join(' ');

  const areaPath = `${depthPath} L${scaleX(data[data.length - 1].second).toFixed(1)},${innerH} L${scaleX(0)},${innerH} Z`;

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <svg width={W} height={H} className="overflow-visible">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={scaleY(t)} y2={scaleY(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-4} y={scaleY(t) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
                {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="#a855f7" fillOpacity={0.12} stroke="none" />
          <path d={depthPath} fill="none" stroke="#a855f7" strokeWidth={2} />
          {[0, Math.round(maxSec / 2), maxSec].map((t) => (
            <text key={t} x={scaleX(t)} y={innerH + 12} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {t}s
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
