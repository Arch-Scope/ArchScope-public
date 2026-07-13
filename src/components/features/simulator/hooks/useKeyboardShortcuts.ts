import { useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { SimulationNodeData } from '@/types';

interface UseKeyboardShortcutsProps {
  selectedNodes: string[];
  selectedNode: Node<SimulationNodeData> | null;
  selectedEdge: Edge | null;
  nodes: Node<SimulationNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<SimulationNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  setSelectedNode: (node: Node<SimulationNodeData> | null) => void;
  setSelectedNodes: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedEdge: (edge: Edge | null) => void;
}

export function useKeyboardShortcuts({
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
  duplicate,
  setSelectedNode,
  setSelectedNodes,
  setSelectedEdge,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || 
                           activeElement instanceof HTMLTextAreaElement ||
                           (activeElement as HTMLElement)?.isContentEditable;
      
      if (isInputFocused) {
        return;
      }

      // Escape to clear selection
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setSelectedNodes([]);
        setSelectedEdge(null);
        return;
      }

      // Delete or Backspace to delete selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Handle multi-select
        if (selectedNodes.length > 0) {
          event.preventDefault();

          // Save state BEFORE deleting
          saveToHistory();

          // Batch delete all selected nodes at once
          setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
          setEdges((eds) => eds.filter((e) => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)));

          // Clear all selections
          setSelectedNode(null);
          setSelectedNodes([]);
          setSelectedEdge(null);
          return;
        }

        // Handle single node select
        if (selectedNode) {
          event.preventDefault();

          // Save state BEFORE deleting
          saveToHistory();

          // Delete the single selected node
          setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
          setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));

          // Clear selections
          setSelectedNode(null);
          setSelectedNodes([]);
          setSelectedEdge(null);
          return;
        }

        // Handle single edge select
        if (selectedEdge) {
          event.preventDefault();

          // Save state BEFORE deleting
          saveToHistory();

          // Delete the selected edge
          setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));

          // Clear selections
          setSelectedNode(null);
          setSelectedNodes([]);
          setSelectedEdge(null);
          return;
        }
      }

      // Ctrl+A to select all nodes
      if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const allNodeIds = nodes.map((n) => n.id);
        setSelectedNodes(allNodeIds);
        setSelectedNode(null);
        return;
      }

      // Ctrl+Z or Cmd+Z to undo
      if (event.key === 'z' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z to redo
      if (event.key === 'z' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl+Y or Cmd+Y to redo (alternative)
      if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl+C or Cmd+C to copy
      if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        copy();
        return;
      }

      // Ctrl+V or Cmd+V to paste
      if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        paste();
        return;
      }

      // Ctrl+D or Cmd+D to duplicate
      if (event.key === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        duplicate();
        return;
      }

      // Ctrl+X or Cmd+X to cut
      if (event.key === 'x' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        // Handle single node select
        if (selectedNode && selectedNodes.length === 0) {
          copy();
          // Save state before cutting
          saveToHistory();
          setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
          setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
          setSelectedNode(null);
          setSelectedNodes([]);
          setSelectedEdge(null);
          return;
        }

        // Handle multi-select
        if (selectedNodes.length > 0) {
          copy();
          // Save state before cutting
          saveToHistory();
          setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
          setEdges((eds) => eds.filter((e) => !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)));
          setSelectedNode(null);
          setSelectedNodes([]);
          setSelectedEdge(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
    duplicate,
    setSelectedNode,
    setSelectedNodes,
    setSelectedEdge,
  ]);
}
