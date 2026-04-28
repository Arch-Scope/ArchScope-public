import { useState } from 'react';
import { createDesign, updateDesign } from '@/lib/api/designs';

export function useDesigns(nodes: any, edges: any) {
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  const saveDesign = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Please login to save designs');
      return;
    }

    try {
      let result;

      if (currentDesignId) {
        // UPDATE
        result = await updateDesign(token, currentDesignId, {
          nodes,
          edges,
        });

        alert('Design updated');
      } else {
        // CREATE
        const name = prompt('Enter design name');
        if (!name) return;

        result = await createDesign(token, {
          name,
          nodes,
          edges,
        });

        setCurrentDesignId(result.design.id);
        alert('Design saved');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadDesign = (design: any, setNodes: any, setEdges: any) => {
    if (!design) return;

    setNodes(design.nodes);
    setEdges(design.edges);
    setCurrentDesignId(design.id);
  };

  const clearCurrentDesign = () => {
    setCurrentDesignId(null);
  };

  return {
    saveDesign,
    loadDesign,
    currentDesignId,
    clearCurrentDesign,
  };
}