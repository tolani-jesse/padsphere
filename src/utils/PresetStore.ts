import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export interface CustomPreset {
  id: string;
  name: string;
  files: Record<string, Blob>; // maps key (e.g., 'C', 'C#') to audio file blob
  updatedAt?: number;
  isImported?: boolean;
}

export class PresetStore {
  constructor() {
    localforage.config({
      name: 'PadSphere',
      storeName: 'presets'
    });
  }

  async savePreset(name: string, files: Record<string, Blob>, isImported: boolean = false): Promise<CustomPreset> {
    const preset: CustomPreset = {
      id: uuidv4(),
      name,
      files,
      updatedAt: Date.now(),
      isImported
    };
    await localforage.setItem(preset.id, preset);
    return preset;
  }

  async updatePreset(id: string, name: string, files: Record<string, Blob>): Promise<CustomPreset | null> {
    const existing = await this.getPreset(id);
    if (!existing) return null;
    
    const updated: CustomPreset = { ...existing, name, files, updatedAt: Date.now() };
    await localforage.setItem(id, updated);
    return updated;
  }

  async renamePreset(id: string, newName: string): Promise<CustomPreset | null> {
    const existing = await this.getPreset(id);
    if (!existing) return null;
    
    const updated: CustomPreset = { ...existing, name: newName };
    await localforage.setItem(id, updated);
    return updated;
  }

  async getPreset(id: string): Promise<CustomPreset | null> {
    return await localforage.getItem<CustomPreset>(id);
  }

  async getAllPresets(): Promise<CustomPreset[]> {
    const presets: CustomPreset[] = [];
    await localforage.iterate((value: CustomPreset) => {
      // Filter out non-preset items (e.g., residual midi-mappings saved to the same localforage instance)
      if (value && value.id && value.name) {
        presets.push(value);
      }
    });
    return presets;
  }

  async deletePreset(id: string): Promise<void> {
    await localforage.removeItem(id);
  }
}

export const presetStore = new PresetStore();
