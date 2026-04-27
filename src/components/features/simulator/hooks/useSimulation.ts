import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { SimulationNodeData, SimulationParams, SimulationResult, TimeSeriesDataPoint } from '@/types';
import { prepareSimulation, simulateTick, finalizeSimulation, SimulationContext } from '@/lib/core';
import { calculateLayout} from '@/lib/utils/layout';

export function useSimulation(
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  simulationParams: SimulationParams,
  setNodes: React.Dispatch<React.SetStateAction<Node<SimulationNodeData>[]>>
) {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simProgress, setSimProgress] = useState<{ elapsed: number; total: number } | null>(null);
  const [liveTimeSeries, setLiveTimeSeries] = useState<TimeSeriesDataPoint[]>([]);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simContextRef = useRef<SimulationContext | null>(null);
  const simTickRef = useRef<{ second: number; series: TimeSeriesDataPoint[] }>({ second: 0, series: [] });
  const originalPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsRunning(false);
    setSimProgress(null);
  }, []);

  const startSimulationInterval = useCallback((
    ctx: SimulationContext,
    startSecond: number,
    startSeries: TimeSeriesDataPoint[],
    tickIntervalMs: number
  ) => {
    simTickRef.current = { second: startSecond, series: startSeries };
    const duration = simulationParams.simulationDurationSeconds;

    simIntervalRef.current = setInterval(() => {
      const { second, series } = simTickRef.current;

      const point = simulateTick(ctx, second);
      const newSeries = [...series, point];
      simTickRef.current = { second: second + 1, series: newSeries };

      setLiveTimeSeries(newSeries);
      setSimProgress({ elapsed: second + 1, total: duration });

      if (second + 1 >= duration) {
        stopSimulation();
        const result = finalizeSimulation(ctx, newSeries, simulationParams);
        setSimulationResult(result);
        setLiveTimeSeries([]);
        setIsRunning(false);
        setSimProgress(null);
      }
    }, tickIntervalMs);
  }, [simulationParams, stopSimulation]);

  const handleRunSimulation = useCallback(() => {
    stopSimulation();
    setIsRunning(true);
    setSimulationResult(null);
    setLiveTimeSeries([]);
    setSimProgress({ elapsed: 0, total: simulationParams.simulationDurationSeconds });

    // Save original positions
    originalPositionsRef.current = new Map(
      nodes.map(n => [n.id, { x: n.position.x, y: n.position.y }])
    );

    const ctx = prepareSimulation(nodes, edges, simulationParams);
    simContextRef.current = ctx;

    // Calculate expanded layout to accommodate metrics
    const layoutPositions = calculateLayout(nodes, edges, true);

    setNodes((nds) =>
      nds.map((n) => {
        const pos = layoutPositions.get(n.id);
        return {
          ...n,
          position: pos || n.position,
          data: { ...n.data, metrics: ctx.nodeMetrics[n.id] || undefined },
        };
      })
    );

    startSimulationInterval(ctx, 0, [], 1000);
  }, [nodes, edges, simulationParams, setNodes, stopSimulation, startSimulationInterval]);

  const handleReset = useCallback(() => {
    setSimulationResult(null);
    setNodes((nds) =>
      nds.map((n) => {
        const originalPos = originalPositionsRef.current.get(n.id);
        return {
          ...n,
          position: originalPos || n.position,
          data: { ...n.data, metrics: undefined },
        };
      })
    );
  }, [setNodes]);

  const handleFastForward = useCallback(() => {
    stopSimulation();
    setIsRunning(true);
    setSimulationResult(null);
    // Don't clear liveTimeSeries and simProgress - preserve them to avoid blank flash
    const duration = simulationParams.simulationDurationSeconds;

    // Save original positions
    originalPositionsRef.current = new Map(
      nodes.map(n => [n.id, { x: n.position.x, y: n.position.y }])
    );

    const ctx = prepareSimulation(nodes, edges, simulationParams);
    simContextRef.current = ctx;

    // Start from where we left off or from 0
    const currentSecond = simTickRef.current.second;
    const currentSeries = simTickRef.current.series;

    // Calculate expanded layout to accommodate metrics
    const layoutPositions = calculateLayout(nodes, edges, true);

    setNodes((nds) =>
      nds.map((n) => {
        const pos = layoutPositions.get(n.id);
        return {
          ...n,
          position: pos || n.position,
          data: { ...n.data, metrics: ctx.nodeMetrics[n.id] || undefined },
        };
      })
    );

    // Calculate speed to complete in 2 seconds
    const targetDurationMs = 2000;
    const remainingDuration = duration - currentSecond;
    const speedMultiplier = remainingDuration / (targetDurationMs / 1000);
    const tickIntervalMs = Math.max(10, Math.floor(1000 / speedMultiplier));

    startSimulationInterval(ctx, currentSecond, currentSeries, tickIntervalMs);
  }, [nodes, edges, simulationParams, setNodes, stopSimulation, startSimulationInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  return {
    simulationResult,
    setSimulationResult,
    isRunning,
    simProgress,
    liveTimeSeries,
    handleRunSimulation,
    stopSimulation,
    handleReset,
    handleFastForward,
  };
}
