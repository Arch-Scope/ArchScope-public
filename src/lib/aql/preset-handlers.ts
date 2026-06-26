import { Node, Edge } from '@xyflow/react';
import { SimulationNodeData, SimulationParams, DesignPreset } from '@/types';
import { ParsedCommand } from './parser';
import {
  findPresetByName,
  isBuiltInPreset,
  presetNameExists,
  isValidPresetName,
  saveUserDesign,
  deleteUserDesign,
  getAllPresets
} from './preset-storage';

export interface CommandResult {
  success: boolean;
  message: string;
  pendingConfirmation?: boolean;
  confirmationPrompt?: string;
}

/**
 * Execute a load preset command
 */
export async function executeLoadPresetCommand(
  parsed: ParsedCommand,
  setNodes: (nodes: Node<SimulationNodeData>[]) => void,
  setEdges: (edges: Edge[]) => void,
  setSimulationParams: (params: SimulationParams) => void,
  setCurrentDesignName?: (name: string) => void,
  token?: string
): Promise<CommandResult> {
  if (!parsed.presetName) {
    return { success: false, message: 'Invalid load_preset command' };
  }

  const preset = await findPresetByName(parsed.presetName, token);

  if (!preset) {
    const allPresets = await getAllPresets(token);
    const presetNames = allPresets.map(p => p.name).join(', ');
    return {
      success: false,
      message: `Preset "${parsed.presetName}" not found. Available presets: ${presetNames}`
    };
  }

  // Update current design name (same as UI behavior)
  if (setCurrentDesignName) {
    setCurrentDesignName(preset.name);
  }

  // Load nodes
  setNodes(preset.nodes as Node<SimulationNodeData>[]);

  // Load edges
  setEdges(preset.edges as Edge[]);

  // Load simulation parameters
  setSimulationParams(preset.simulationParams);

  return {
    success: true,
    message: `Loaded preset "${preset.name}" with ${preset.nodes.length} nodes and ${preset.edges.length} connections`
  };
}

/**
 * Execute a save preset command
 */
export async function executeSavePresetCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  currentSimulationParams: SimulationParams,
  token?: string
): Promise<CommandResult> {
  if (!parsed.presetName) {
    return { success: false, message: 'Invalid save_preset command' };
  }

  if (!token) {
    return { success: false, message: 'Please login to save presets' };
  }

  // Validate preset name format
  if (!isValidPresetName(parsed.presetName)) {
    return { 
      success: false, 
      message: 'Invalid preset name. Use alphanumeric characters, underscores, or hyphens only' 
    };
  }

  // Check for duplicate names
  const nameExists = await presetNameExists(parsed.presetName, token);
  if (nameExists) {
    return { 
      success: false, 
      message: `Preset "${parsed.presetName}" already exists. Use delete_preset first or choose a different name` 
    };
  }

  // Check if architecture has nodes
  if (nodes.length === 0) {
    return { 
      success: false, 
      message: 'No architecture to save. Add nodes and connections first' 
    };
  }

  // Create preset object
  const preset: DesignPreset = {
    id: parsed.presetName.toLowerCase().replace(/\s+/g, '_'),
    name: parsed.presetName,
    description: parsed.presetDescription || '',
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type || 'infra',
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      animated: edge.animated
    })),
    simulationParams: currentSimulationParams
  };

  // Save to DB
  const saved = await saveUserDesign(token, preset);

  if (!saved) {
    return { 
      success: false, 
      message: 'Failed to save preset. Database error occurred.' 
    };
  }

  return { 
    success: true, 
    message: `Saved preset "${preset.name}" with ${preset.nodes.length} nodes and ${preset.edges.length} connections` 
  };
}

/**
 * Execute a delete preset command
 * Returns pendingConfirmation state for interactive confirmation
 */
export async function executeDeletePresetCommand(
  parsed: ParsedCommand,
  confirmed: boolean = false,
  token?: string
): Promise<CommandResult> {
  if (!parsed.presetName) {
    return { success: false, message: 'Invalid delete_preset command' };
  }

  if (!token) {
    return { success: false, message: 'Please login to delete presets' };
  }

  // If not yet confirmed, return confirmation prompt
  if (!confirmed) {
    const preset = await findPresetByName(parsed.presetName, token);
    
    if (!preset) {
      return { 
        success: false, 
        message: `Preset "${parsed.presetName}" not found` 
      };
    }

    // Check if it's a built-in preset
    if (isBuiltInPreset(preset)) {
      return { 
        success: false, 
        message: `Cannot delete built-in preset "${preset.name}". Only user-created presets can be deleted` 
      };
    }

    return { 
      success: false, 
      message: `Are you sure you want to delete preset "${preset.name}"? (Y to confirm, any other key to cancel)`,
      pendingConfirmation: true,
      confirmationPrompt: `delete_preset ${parsed.presetName}`
    };
  }

  // User confirmed, proceed with deletion
  const preset = await findPresetByName(parsed.presetName, token);
  
  if (!preset) {
    return { 
      success: false, 
      message: `Preset "${parsed.presetName}" not found` 
    };
  }

  if (isBuiltInPreset(preset)) {
    return { 
      success: false, 
      message: `Cannot delete built-in preset "${preset.name}". Only user-created presets can be deleted` 
    };
  }

  const deleted = await deleteUserDesign(token, preset.id);

  if (!deleted) {
    return { 
      success: false, 
      message: `Failed to delete preset "${preset.name}"` 
    };
  }

  return { 
    success: true, 
    message: `Deleted preset "${preset.name}"` 
  };
}

/**
 * Execute a list preset command
 */
export async function executeListPresetCommand(token?: string): Promise<CommandResult> {
  const allPresets = await getAllPresets(token);

  if (allPresets.length === 0) {
    return { 
      success: true, 
      message: 'No presets available' 
    };
  }

  let output = 'Available Presets:\n';
  
  allPresets.forEach((preset, index) => {
    const isBuiltIn = isBuiltInPreset(preset);
    const typeLabel = isBuiltIn ? '(built-in)' : '(user-created)';
    
    output += `  ${index + 1}. ${preset.name} ${typeLabel}\n`;
    output += `    ${preset.description || 'No description'}\n`;
    output += `    Nodes: ${preset.nodes.length} | Connections: ${preset.edges.length}\n`;
    
    if (index < allPresets.length - 1) {
      output += '\n';
    }
  });

  return { 
    success: true, 
    message: output 
  };
}
