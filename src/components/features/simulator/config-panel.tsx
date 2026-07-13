"use client";

import React from "react";
import { Node } from "@xyflow/react";
import {
  SimulationNodeData,
  ComponentType,
  RateLimitAlgorithm,
  TimeComplexity,
} from "@/types";
import {
  getServicesForType,
  getServiceById,
  COMPONENT_LABELS,
} from "@/lib/services";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

interface ConfigPanelProps {
  node: Node<SimulationNodeData> | null;
  onUpdate: (nodeId: string, data: Partial<SimulationNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

export default function ConfigPanel({
  node,
  onUpdate,
  onDelete,
}: ConfigPanelProps) {
  if (!node) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <p className="mt-8">Select a component to configure it</p>
        <p className="mt-2 text-xs">Click on any node in the canvas</p>
      </div>
    );
  }

  const data = node.data as SimulationNodeData;
  const services = getServicesForType(data.componentType);
  const selectedService = getServiceById(data.config.serviceId);

  const handleServiceChange = (serviceId: string | null) => {
    if (!serviceId) return;
    onUpdate(node.id, {
      config: { ...data.config, serviceId },
    });
  };

  // Handles the user picking a new value from the Time Complexity dropdown.
  // Same pattern as handleServiceChange right above it.
  const handleTimeComplexityChange = (value: string) => {
    onUpdate(node.id, {
      config: { ...data.config, timeComplexity: value as TimeComplexity },
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdate(node.id, { label });
  };

  const handleCacheHitRateChange = (rate: number | readonly number[]) => {
    const val = Array.isArray(rate) ? rate[0] : rate;
    onUpdate(node.id, {
      config: { ...data.config, cacheHitRate: (val as number) / 100 },
    });
  };

  const handleQueueProcessingTimeChange = (ms: number) => {
    onUpdate(node.id, {
      config: { ...data.config, queueProcessingTimeMs: ms },
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline" className="text-xs">
            {COMPONENT_LABELS[data.componentType]}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={data.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <Separator />

      {/* Service Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs">Service / Implementation</Label>
        <Select
          value={data.config.serviceId}
          onValueChange={handleServiceChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] py-0 px-1">
                    {s.provider}
                  </Badge>
                  <span className="text-sm">{s.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedService && (
          <p className="text-[10px] text-gray-400 leading-tight mt-1">
            {selectedService.description}
          </p>
        )}
      </div>
      {/* NEW: lets the user tell the simulator how this component's latency
    should scale as payload size grows. Sits right after the Service
    dropdown since they're closely related settings. */}
      <div className="space-y-1.5">
        <Label className="text-xs">Time Complexity</Label>
        <Select
          value={data.config.timeComplexity ?? "O(1)"}
          onValueChange={handleTimeComplexityChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="O(1)">O(1) — constant</SelectItem>
            <SelectItem value="O(log n)">O(log n) — logarithmic</SelectItem>
            <SelectItem value="O(n)">O(n) — linear</SelectItem>
            <SelectItem value="O(n log n)">
              O(n log n) — linearithmic
            </SelectItem>
            <SelectItem value="O(n^2)">O(n^2) — quadratic</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-gray-400 leading-tight mt-1">
          How this component's latency scales as payload size grows.
        </p>
      </div>

      <Separator />

      {/* Service-specific configs */}
      {selectedService && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">
            Specs (per instance)
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-md p-2">
              <div className="text-gray-400">Base Latency</div>
              <div className="font-mono font-semibold">
                {selectedService.baseLatencyMs}ms
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <div className="text-gray-400">Max RPS</div>
              <div className="font-mono font-semibold">
                {selectedService.maxRps === Infinity
                  ? "∞"
                  : selectedService.maxRps.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <div className="text-gray-400">Throughput</div>
              <div className="font-mono font-semibold">
                {selectedService.maxThroughputMBps === Infinity
                  ? "∞"
                  : `${selectedService.maxThroughputMBps} MB/s`}
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <div className="text-gray-400">Cost/hr</div>
              <div className="font-mono font-semibold">
                $
                {(
                  data.config.customCostPerHour ??
                  selectedService.baseCostPerHour
                ).toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Cost Configuration */}
      <Separator />
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">
          Cost Configuration
        </h4>

        <div className="space-y-1.5">
          <Label className="text-xs">Custom Cost per Hour ($)</Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder={
              selectedService
                ? (
                    data.config.customCostPerHour ??
                    selectedService.baseCostPerHour
                  ).toFixed(4)
                : ""
            }
            value={data.config.customCostPerHour ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                onUpdate(node.id, {
                  config: { ...data.config, customCostPerHour: undefined },
                });
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num >= 0) {
                  onUpdate(node.id, {
                    config: { ...data.config, customCostPerHour: num },
                  });
                }
              }
            }}
            className="h-8 text-xs"
          />
          <p className="text-[10px] text-gray-400">
            Override default pricing. Leave empty to use service default.
          </p>
          {selectedService && (
            <p className="text-[10px] text-gray-500">
              Default: ${selectedService.baseCostPerHour.toFixed(4)}/hr |
              Updated: {selectedService.pricingLastUpdated} |
              {selectedService.pricingDisclaimer}
            </p>
          )}
        </div>
      </div>

      {/* Cache-specific */}
      {data.componentType === "cache" && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs">
              Cache Hit Rate:{" "}
              {((data.config.cacheHitRate ?? 0.8) * 100).toFixed(0)}%
            </Label>
            <Slider
              value={[(data.config.cacheHitRate ?? 0.8) * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleCacheHitRateChange}
            />
            <p className="text-[10px] text-gray-400">
              Higher hit rate = less traffic to downstream DB
            </p>
          </div>
        </>
      )}

      {/* Rate Limiter-specific */}
      {data.componentType === "rate_limiter" && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Rate Limiting Rules
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs">Algorithm</Label>
              <Select
                value={data.config.rateLimitAlgorithm ?? "token_bucket"}
                onValueChange={(val) =>
                  onUpdate(node.id, {
                    config: {
                      ...data.config,
                      rateLimitAlgorithm: val as RateLimitAlgorithm,
                    },
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token_bucket">Token Bucket</SelectItem>
                  <SelectItem value="leaky_bucket">Leaky Bucket</SelectItem>
                  <SelectItem value="fixed_window">
                    Fixed Window Counter
                  </SelectItem>
                  <SelectItem value="sliding_window">
                    Sliding Window Log
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">
                {(data.config.rateLimitAlgorithm ?? "token_bucket") ===
                  "token_bucket" &&
                  "Tokens accumulate up to bucket size; each request consumes one token."}
                {data.config.rateLimitAlgorithm === "leaky_bucket" &&
                  "Requests leak out at a fixed rate; excess requests are dropped."}
                {data.config.rateLimitAlgorithm === "fixed_window" &&
                  "Count resets every window. Simple but allows burst at window boundary."}
                {data.config.rateLimitAlgorithm === "sliding_window" &&
                  "Weighted log of request timestamps — no boundary burst problem."}
              </p>
            </div>

            {/* Token Bucket / Leaky Bucket params */}
            {(data.config.rateLimitAlgorithm === "token_bucket" ||
              data.config.rateLimitAlgorithm === "leaky_bucket" ||
              !data.config.rateLimitAlgorithm) && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bucket Size (max tokens)</Label>
                  <Input
                    type="number"
                    value={data.config.rateLimitBucketSize ?? 100}
                    onChange={(e) =>
                      onUpdate(node.id, {
                        config: {
                          ...data.config,
                          rateLimitBucketSize: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">
                    Max burst capacity
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Refill Rate (tokens/sec)</Label>
                  <Input
                    type="number"
                    value={data.config.rateLimitRefillRate ?? 10}
                    onChange={(e) =>
                      onUpdate(node.id, {
                        config: {
                          ...data.config,
                          rateLimitRefillRate: parseInt(e.target.value) || 10,
                        },
                      })
                    }
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">
                    Sustained request rate allowed
                  </p>
                </div>
              </>
            )}

            {/* Fixed / Sliding Window params */}
            {(data.config.rateLimitAlgorithm === "fixed_window" ||
              data.config.rateLimitAlgorithm === "sliding_window") && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Requests per Window</Label>
                  <Input
                    type="number"
                    value={data.config.rateLimitMaxRequests ?? 100}
                    onChange={(e) =>
                      onUpdate(node.id, {
                        config: {
                          ...data.config,
                          rateLimitMaxRequests: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Window Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={data.config.rateLimitWindowSeconds ?? 60}
                    onChange={(e) =>
                      onUpdate(node.id, {
                        config: {
                          ...data.config,
                          rateLimitWindowSeconds:
                            parseInt(e.target.value) || 60,
                        },
                      })
                    }
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-gray-400">
                    Redis TTL = this window duration
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Redis Counter TTL (seconds)</Label>
              <Input
                type="number"
                value={data.config.redisCounterTtlSeconds ?? 60}
                onChange={(e) =>
                  onUpdate(node.id, {
                    config: {
                      ...data.config,
                      redisCounterTtlSeconds: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-gray-400">
                Counter expires and resets after this duration
              </p>
            </div>

            <div className="bg-red-50 rounded-md p-2 text-[10px] text-red-700 space-y-0.5">
              <div className="font-semibold">On rate limit exceeded:</div>
              <div>
                → Returns <span className="font-mono font-bold">HTTP 429</span>{" "}
                Too Many Requests
              </div>
              <div>→ Request is dropped (not queued)</div>
            </div>
          </div>
        </>
      )}

      {/* Queue-specific */}
      {data.componentType === "message_queue" && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs">Processing Time per Message (ms)</Label>
            <Input
              type="number"
              value={data.config.queueProcessingTimeMs ?? 100}
              onChange={(e) =>
                handleQueueProcessingTimeChange(parseInt(e.target.value) || 100)
              }
              className="h-8 text-sm"
            />
          </div>
        </>
      )}

      {/* Metrics display */}
      {data.metrics && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">
              Live Metrics
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Avg Latency</span>
                <span className="font-mono font-medium">
                  {data.metrics.avgLatencyMs.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">P99 Latency</span>
                <span className="font-mono font-medium">
                  {data.metrics.p99LatencyMs.toFixed(2)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Throughput</span>
                <span className="font-mono font-medium">
                  {data.metrics.throughputRps.toLocaleString()} rps
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Utilization</span>
                <span
                  className={`font-mono font-medium ${
                    data.metrics.utilizationPercent > 90
                      ? "text-red-600"
                      : data.metrics.utilizationPercent > 70
                        ? "text-amber-600"
                        : "text-green-600"
                  }`}
                >
                  {data.metrics.utilizationPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cost/month</span>
                <span className="font-mono font-medium">
                  ${data.metrics.costPerMonth.toFixed(2)}
                </span>
              </div>
              {data.metrics.errorRate !== undefined &&
                data.metrics.errorRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Error Rate</span>
                    <span className="font-mono font-medium text-red-600">
                      {data.metrics.errorRate.toFixed(2)}%
                    </span>
                  </div>
                )}
              {data.metrics.cacheHits !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cache Hits/s</span>
                  <span className="font-mono font-medium text-green-600">
                    {data.metrics.cacheHits.toLocaleString()}
                  </span>
                </div>
              )}
              {data.metrics.queueDepth !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Queue Depth</span>
                  <span className="font-mono font-medium">
                    {data.metrics.queueDepth.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
