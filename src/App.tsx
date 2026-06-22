import { useState, useEffect, useRef } from 'react';
import { Pencil, Plus, Download, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';
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
  
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);

  // Updater State
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);

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

  const loadPresetById = async (presetId: string, crossfadeKey: string | null = null) => {
    setIsLoading(true);
    setSelectedPresetId(presetId);
    
    if (INBUILT_PRESETS.some(p => p.id === presetId)) {
      await loadInbuiltPreset(presetId);
    } else {
      const preset = await presetStore.getPreset(presetId);
      audioEngine.clearBuffers();
      if (preset && preset.files) {
        for (const [key, file] of Object.entries(preset.files)) {
          await audioEngine.loadBuffer(key, file, `${presetId}-${preset.updatedAt || 0}-${key}`);
        }
      } else {
        // Fallback if custom preset is deleted/not found
        await loadInbuiltPreset('default');
        setSelectedPresetId('default');
        return;
      }
      setLoadedKeys(audioEngine.getLoadedKeys());
      setIsLoading(false);
    }

    if (crossfadeKey) {
      await audioEngine.play(crossfadeKey, octave);
    }
  };

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await loadPresetById(e.target.value, activeKey);
  };

  // Initialize volume on mount and load custom presets
  useEffect(() => {
    audioEngine.setVolume(volume);
    loadCustomPresets();
    
    const defaultId = localStorage.getItem('padsphere-default-preset') || 'default';
    loadPresetById(defaultId);

    // Silent Auto-Update Check on Mount
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update) {
        const shouldUpdate = await ask(
          `A new version of PadSphere (${update.version}) is available!\n\nDo you want to download and install it now?`,
          { title: 'Update Available', kind: 'info' }
        );
        
        if (shouldUpdate) {
          setIsUpdating(true);
          setDownloadProgress(0);
          setDownloadTotal(0);
          
          let downloaded = 0;
          await update.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              setDownloadTotal(event.data.contentLength || 0);
            } else if (event.event === 'Progress') {
              downloaded += event.data.chunkLength;
              setDownloadProgress(downloaded);
            } else if (event.event === 'Finished') {
              setIsUpdating(false);
            }
          });
          
          await relaunch();
        }
      }
    } catch (error) {
      console.error('Updater check skipped or failed:', error);
    }
  };

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

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        let presetName = "Imported Preset";
        const manifestFile = zip.file("manifest.json");
        if (manifestFile) {
          const manifestText = await manifestFile.async("string");
          try {
            const manifest = JSON.parse(manifestText);
            if (manifest.name) presetName = manifest.name;
          } catch {}
        }
        
        const fileMap: Record<string, Blob> = {};
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          
          const match = relativePath.match(/^([A-G]s?|C_sharp|D_sharp|F_sharp|G_sharp|A_sharp)\.(mp3|wav|ogg|m4a|aac)$/i);
          if (match) {
            let key = match[1].toUpperCase();
            if (key.endsWith('S') || key.endsWith('_SHARP')) {
               key = key.charAt(0) + '#';
            }
            const blob = await zipEntry.async("blob");
            fileMap[key] = blob;
          }
        }
        
        const newPreset = await presetStore.savePreset(presetName, fileMap, true);
        await loadCustomPresets();
        await loadPresetById(newPreset.id, activeKey);
      } catch (err) {
        console.error("Failed to import preset:", err);
        setIsLoading(false);
        alert("Failed to import preset. Invalid or corrupted .padsphere file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
    setIsNewMenuOpen(false);
  };


  const currentPresetName = INBUILT_PRESETS.find(p => p.id === selectedPresetId)?.name 
    || customPresets.find(p => p.id === selectedPresetId)?.name 
    || 'Preset';

  const activeCustomPreset = customPresets.find(p => p.id === selectedPresetId);

  return (
    <>
      <div className="app-container">
        
        <header className="app-header glass-panel">
          <div className="header-left preset-selector" style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <span className="control-label" style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: '0.5rem' }}>PRESET</span>
            <select aria-label="Select Preset" value={selectedPresetId} onChange={handlePresetChange}>
              {INBUILT_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {/* Imported presets blended into the main list */}
              {customPresets.filter(p => p.isImported).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {/* User created presets */}
              {customPresets.filter(p => !p.isImported).length > 0 && (
                <optgroup label="Custom Presets">
                  {customPresets.filter(p => !p.isImported).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Edit Custom Preset Pencil Icon */}
            {activeCustomPreset && (
              <button
                className="btn"
                style={{ padding: '0.4rem', marginLeft: '-0.2rem', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center' }}
                onClick={() => setShowEditorModal(true)}
                title={activeCustomPreset.isImported ? "Delete Premium Preset" : "Edit Custom Preset"}
              >
                {activeCustomPreset.isImported ? (
                   <Trash2 size={18} color="#f87171" />
                ) : (
                   <Pencil size={18} color="var(--text-secondary)" />
                )}
              </button>
            )}
          </div>
          
          <div className="header-center" style={{ flex: '0 1 auto', textAlign: 'center' }}>
            <h1 className="title" style={{ margin: 0 }}>PadSphere</h1>
          </div>
          
          <div className="header-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
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

            <button 
              className={`btn ${isNewMenuOpen ? 'active' : ''}`}
              style={{ padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => setIsNewMenuOpen(true)}
            >
              <Plus size={18} /> New
            </button>
          </div>
        </header>

        {/* Hidden File Input for .padsphere imports */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".padsphere" 
          style={{ display: 'none' }} 
          onChange={handleImportPreset} 
        />

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

      {isNewMenuOpen && (
        <div className="presets-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsNewMenuOpen(false)}>
          <div style={{ padding: '1.5rem', borderRadius: '12px', width: '300px', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#1a1d27', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div className="overlay-header" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="title" style={{ fontSize: '1.1rem', margin: 0 }}>New Preset</h2>
              <button className="btn" style={{ padding: '0.2rem 0.6rem' }} onClick={() => setIsNewMenuOpen(false)}>✕</button>
            </div>
            <button className="btn" style={{ fontSize: '0.9rem', padding: '0.8rem', textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setShowUploader(true); setIsNewMenuOpen(false); }}>
              <Plus size={16} /> Create Custom Preset
            </button>
            <button className="btn" style={{ fontSize: '0.9rem', padding: '0.8rem', textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { fileInputRef.current?.click(); setIsNewMenuOpen(false); }}>
              <Download size={16} /> Import Preset (.padsphere)
            </button>
          </div>
        </div>
      )}

      {showLoader && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
          <p>Loading presets...</p>
        </div>
      )}

      {isUpdating && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '20px', 
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>
            Downloading Update...
          </div>
          <div style={{ width: '300px', height: '10px', backgroundColor: 'var(--surface-light)', borderRadius: '5px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: downloadTotal > 0 ? `${(downloadProgress / downloadTotal) * 100}%` : '0%', 
                height: '100%', 
                backgroundColor: 'var(--primary)',
                transition: 'width 0.1s ease-out'
              }} 
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {downloadTotal > 0 ? `${Math.round((downloadProgress / downloadTotal) * 100)}%` : 'Starting...'}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
