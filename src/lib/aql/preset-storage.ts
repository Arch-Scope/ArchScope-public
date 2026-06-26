import { DesignPreset } from '@/types';
import { PRESETS } from '@/data/presets';

/**
 * Get all built-in presets from the presets data file
 * These are the read-only presets that come with the application
 */
export function getBuiltInPresets(): DesignPreset[] {
  return PRESETS;
}

/**
 * Get all user designs from the database
 * These are user-created designs stored in the DB
 */
export async function getUserDesigns(token: string): Promise<DesignPreset[]> {
  try {
    const res = await fetch('/api/designs', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user designs');
    }

    const data = await res.json();
    // Convert DB design format to DesignPreset format
    return data.designs.map((design: any) => ({
      id: design.id,
      name: design.name,
      description: '', // DB designs don't have descriptions
      nodes: design.nodes,
      edges: design.edges,
      simulationParams: {
        concurrentUsers: 100,
        requestsPerSecPerUser: 10,
        payloadSizeMB: 0.001,
        simulationDurationSeconds: 300,
        loadProfile: 'constant' as const,
        spikeFrequency: 3,
        spikeIntensity: 2,
      },
    }));
  } catch (error) {
    console.error('Error loading user designs from DB:', error);
    return [];
  }
}

/**
 * Get all presets (built-in + user designs)
 */
export async function getAllPresets(token?: string): Promise<DesignPreset[]> {
  const builtInPresets = getBuiltInPresets();
  if (!token) {
    return builtInPresets;
  }

  const userDesigns = await getUserDesigns(token);
  return [...builtInPresets, ...userDesigns];
}

/**
 * Find a preset by name (case-insensitive)
 */
export async function findPresetByName(name: string, token?: string): Promise<DesignPreset | null> {
  const allPresets = await getAllPresets(token);
  const lowerName = name.toLowerCase();
  
  return allPresets.find(preset => 
    preset.name.toLowerCase() === lowerName || 
    preset.id.toLowerCase() === lowerName
  ) || null;
}

/**
 * Check if a preset is built-in (from data/presets.ts)
 */
export function isBuiltInPreset(preset: DesignPreset): boolean {
  return getBuiltInPresets().some(builtIn => builtIn.id === preset.id);
}

/**
 * Check if a preset name already exists (case-insensitive)
 */
export async function presetNameExists(name: string, token?: string): Promise<boolean> {
  const allPresets = await getAllPresets(token);
  const lowerName = name.toLowerCase();
  
  return allPresets.some(preset => 
    preset.name.toLowerCase() === lowerName || 
    preset.id.toLowerCase() === lowerName
  );
}

/**
 * Save a user design to the database
 */
export async function saveUserDesign(token: string, preset: DesignPreset): Promise<boolean> {
  try {
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: preset.name,
        nodes: preset.nodes,
        edges: preset.edges,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to save design to DB');
    }

    return true;
  } catch (error) {
    console.error('Error saving user design to DB:', error);
    return false;
  }
}

/**
 * Delete a user design from the database
 */
export async function deleteUserDesign(token: string, designId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/designs/${designId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete design from DB');
    }

    return true;
  } catch (error) {
    console.error('Error deleting user design from DB:', error);
    return false;
  }
}

/**
 * Validate preset name format (alphanumeric, underscores, hyphens only)
 */
export function isValidPresetName(name: string): boolean {
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  return validNameRegex.test(name) && name.length > 0;
}
