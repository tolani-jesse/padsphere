import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import './index.css';
import PianoKeyboard from './components/PianoKeyboard';
import GridKeyboard from './components/GridKeyboard';
import ControlPanel from './components/ControlPanel';
import CustomPresetUploader from './components/CustomPresetUploader';
import PresetEditorModal from './components/PresetEditorModal';
import { audioEngine } from './utils/AudioEngine';
import { presetStore, type CustomPreset } from './utils/PresetStore';
import { INBUILT_PRESETS } from './utils/InbuiltPresets';

function App() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [volume, setVolume] = useState(80);
  const [octave, setOctave] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [showUploaderForEdit, setShowUploaderForEdit] = useState<CustomPreset | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default');
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
  const [layout, setLayout] = useState<'piano' | 'grid'>(() => {
    return (localStorage.getItem('padsphere-layout') as 'piano' | 'grid') || 'piano';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);

  // Only show the loader if loading takes more than 150ms to prevent flashing on cached presets
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 150);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadCustomPresets = async () => {
    const presets = await presetStore.getAllPresets();
    setCustomPresets(presets);
  };

  const loadInbuiltPreset = async (presetId: string) => {
    const inbuiltPreset = INBUILT_PRESETS.find(p => p.id === presetId);
    if (!inbuiltPreset) return;

    setIsLoading(true);
    audioEngine.clearBuffers();
    // Map standard keys to file names
    const fileMap: Record<string, string> = {
      'C': 'C', 'C#': 'Cs', 'D': 'D', 'D#': 'Ds', 'E': 'E', 'F': 'F',
      'F#': 'Fs', 'G': 'G', 'G#': 'Gs', 'A': 'A', 'A#': 'As', 'B': 'B'
    };
    
    const promises = Object.entries(fileMap).map(async ([key, fileName]) => {
      const url = `/presets/${inbuiltPreset.folderName}/${fileName}${inbuiltPreset.fileSuffix}`;
      await audioEngine.loadBuffer(key, url, `inbuilt-${presetId}-${key}`);
    });
    
    await Promise.all(promises);
    setLoadedKeys(audioEngine.getLoadedKeys());
    setIsLoading(false);
  };

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);
    
    // Remember what was playing to crossfade it after loading
    const currentlyPlayingKey = activeKey;

    setIsLoading(true);

    if (INBUILT_PRESETS.some(p => p.id === presetId)) {
      await loadInbuiltPreset(presetId);
    } else {
      const preset = await presetStore.getPreset(presetId);
      audioEngine.clearBuffers();
      if (preset && preset.files) {
        // Load all buffers for this custom preset
        for (const [key, file] of Object.entries(preset.files)) {
          await audioEngine.loadBuffer(key, file, `${presetId}-${preset.updatedAt || 0}-${key}`);
        }
      }
      setLoadedKeys(audioEngine.getLoadedKeys());
      setIsLoading(false);
    }

    // Seamlessly crossfade to the new preset if something was playing
    if (currentlyPlayingKey) {
      await audioEngine.play(currentlyPlayingKey, octave);
    }
  };

  // Initialize volume on mount and load custom presets
  useEffect(() => {
    audioEngine.setVolume(volume);
    loadCustomPresets();
    loadInbuiltPreset('default'); // Load default preset on startup

    // Silent Auto-Update Check
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          const shouldUpdate = window.confirm(
            `A new version of PadSphere (${update.version}) is available!\n\nDo you want to download and install it now?`
          );
          if (shouldUpdate) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (error) {
        // Will throw in normal browser environments, which is fine
        console.log('Updater check skipped or failed:', error);
      }
    };
    checkForUpdates();
  }, []);

  const handleKeyClick = async (key: string) => {
    if (activeKey === key) {
      // Tap active key again to stop
      audioEngine.stop();
      setActiveKey(null);
    } else {
      setActiveKey(key);
      await audioEngine.play(key, octave);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioEngine.setVolume(v);
  };

  const handleOctaveChange = async (o: number) => {
    setOctave(o);
    await audioEngine.setOctave(o);
  };

  const currentPresetName = INBUILT_PRESETS.find(p => p.id === selectedPresetId)?.name 
    || customPresets.find(p => p.id === selectedPresetId)?.name 
    || 'Preset';

  const activeCustomPreset = customPresets.find(p => p.id === selectedPresetId);

  return (
    <>
      <div className="bg-animation"></div>
      <div className="app-container">
        
        <header className="app-header glass-panel">
          <div className="preset-selector">
            <span className="control-label" style={{ fontSize: '0.75rem', opacity: 0.8 }}>PRESET</span>
            <select aria-label="Select Preset" value={selectedPresetId} onChange={handlePresetChange}>
              {INBUILT_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {customPresets.length > 0 && (
                <optgroup label="Custom Presets">
                  {customPresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {activeCustomPreset && (
              <button 
                className="btn" 
                style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}
                onClick={() => setShowEditorModal(true)}
                title="Edit Preset"
              >
                ⚙️
              </button>
            )}
          </div>
          
          <h1 className="title">PadSphere</h1>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="btn"
              onClick={() => {
                const newLayout = layout === 'piano' ? 'grid' : 'piano';
                setLayout(newLayout);
                localStorage.setItem('padsphere-layout', newLayout);
              }}
            >
              {layout === 'piano' ? 'Grid View' : 'Piano View'}
            </button>
            <button className="btn" onClick={() => setShowUploader(true)}>Create Custom Preset</button>
          </div>
        </header>

        <main className="keyboard-container" style={{ position: 'relative' }}>
          {layout === 'piano' ? (
            <PianoKeyboard activeKey={activeKey} onKeyClick={handleKeyClick} loadedKeys={loadedKeys} />
          ) : (
            <GridKeyboard activeKey={activeKey} onKeyClick={handleKeyClick} loadedKeys={loadedKeys} />
          )}
          {showLoader && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(9, 11, 20, 0.7)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 600,
              zIndex: 50,
              borderRadius: '8px'
            }}>
              Loading {currentPresetName}...
            </div>
          )}
        </main>

        <footer className="glass-panel">
          <ControlPanel 
            volume={volume} 
            setVolume={handleVolumeChange}
            octave={octave}
            setOctave={handleOctaveChange}
          />
        </footer>
        
      </div>

      {showEditorModal && activeCustomPreset && (
        <PresetEditorModal 
          preset={activeCustomPreset}
          onClose={() => setShowEditorModal(false)}
          onEditSounds={() => {
            setShowEditorModal(false);
            setShowUploaderForEdit(activeCustomPreset);
          }}
          onRenameComplete={() => loadCustomPresets()}
          onDeleteComplete={async () => {
            setShowEditorModal(false);
            setSelectedPresetId('default');
            await loadCustomPresets();
            await loadInbuiltPreset('default');
          }}
        />
      )}

      {(showUploader || showUploaderForEdit) && (
        <CustomPresetUploader 
          initialPreset={showUploaderForEdit}
          onClose={() => {
            setShowUploader(false);
            setShowUploaderForEdit(null);
          }} 
          onPresetSaved={async (savedPresetId: string) => {
            await loadCustomPresets();
            
            // Instantly switch the UI to the newly saved preset
            setSelectedPresetId(savedPresetId);
            // Remember what was playing
            const currentlyPlayingKey = activeKey;
            
            // Do NOT stop audio, just clear buffers and load new ones
            audioEngine.clearBuffers();
            setIsLoading(true);
            const preset = await presetStore.getPreset(savedPresetId);
            if (preset && preset.files) {
              for (const [key, file] of Object.entries(preset.files)) {
                await audioEngine.loadBuffer(key, file, `${savedPresetId}-${preset.updatedAt || 0}-${key}`);
              }
            }
            setLoadedKeys(audioEngine.getLoadedKeys());
            setIsLoading(false);
            
            // Seamlessly crossfade if a key was active
            if (currentlyPlayingKey) {
              await audioEngine.play(currentlyPlayingKey, octave);
            }
          }} 
        />
      )}
    </>
  );
}

export default App;
