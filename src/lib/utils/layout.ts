import { Node, Edge } from '@xyflow/react';
import { SimulationNodeData } from '@/types';

interface LayoutNode {
  id: string;
  level: number;
  originalX: number;
  originalY: number;
  children: string[];
  parents: string[];
}

const NORMAL_VERTICAL_SCALE = 1.0;
const EXPANDED_VERTICAL_SCALE = 1.15; // Scale up vertical spacing when expanded
const BASE_Y_OFFSET = 100;

/**
 * Calculate layout that preserves graph structure but expands spacing
 * When expanded is true, scales vertical spacing to accommodate larger nodes
 */
export function calculateLayout(
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  expanded: boolean = false
): Map<string, { x: number; y: number }> {
  const layoutNodes = new Map<string, LayoutNode>();
  const levelGroups = new Map<number, string[]>();

  // Initialize layout nodes with original positions
  for (const node of nodes) {
    layoutNodes.set(node.id, {
      id: node.id,
      level: 0,
      originalX: node.position.x,
      originalY: node.position.y,
      children: [],
      parents: [],
    });
  }

  // Build adjacency lists
  for (const edge of edges) {
    const source = layoutNodes.get(edge.source);
    const target = layoutNodes.get(edge.target);
    if (source && target) {
      source.children.push(target.id);
      target.parents.push(source.id);
    }
  }

  // Calculate levels using BFS from entry nodes (nodes with no parents)
  const entryNodes = Array.from(layoutNodes.values()).filter(n => n.parents.length === 0);
  const queue = [...entryNodes.map(n => ({ id: n.id, level: 0 }))];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = layoutNodes.get(id);
    if (node) {
      node.level = level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(id);

      for (const childId of node.children) {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      }
    }
  }

  // Handle cycles: any unvisited nodes get level based on max parent level + 1
  for (const node of layoutNodes.values()) {
    if (!visited.has(node.id)) {
      const maxParentLevel = Math.max(0, ...node.parents.map(pid => layoutNodes.get(pid)?.level ?? 0));
      node.level = maxParentLevel + 1;
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node.id);
    }
  }

  // Calculate positions preserving structure
  const positions = new Map<string, { x: number; y: number }>();
  const verticalScale = expanded ? EXPANDED_VERTICAL_SCALE : NORMAL_VERTICAL_SCALE;

  // Find the minimum Y across all nodes as reference point
  const allY = Array.from(layoutNodes.values()).map(n => n.originalY);
  const minY = Math.min(...allY);

  // Assign new positions - scale Y from the minimum Y
  for (const node of layoutNodes.values()) {
    const relativeY = node.originalY - minY;
    const scaledRelativeY = relativeY * verticalScale;

    positions.set(node.id, {
      x: node.originalX,
      y: minY + scaledRelativeY,
    });
  }

  return positions;
}