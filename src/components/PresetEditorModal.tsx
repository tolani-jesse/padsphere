import { useState } from 'react';
import { presetStore, type CustomPreset } from '../utils/PresetStore';

interface Props {
  preset: CustomPreset;
  onClose: () => void;
  onEditSounds: () => void;
  onRenameComplete: () => void;
  onDeleteComplete: () => void;
}

export default function PresetEditorModal({ preset, onClose, onEditSounds, onRenameComplete, onDeleteComplete }: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(preset.name);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRename = async () => {
    if (newName.trim() && newName !== preset.name) {
      await presetStore.renamePreset(preset.id, newName.trim());
      onRenameComplete();
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    await presetStore.deletePreset(preset.id);
    onDeleteComplete();
  };

  return (
    <div className="presets-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(15, 19, 34, 0.95)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="title" style={{ fontSize: '1.2rem', margin: 0 }}>Edit Preset</h2>
          <button className="btn" onClick={onClose} style={{ padding: '0.25rem 0.5rem', border: 'none' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {isRenaming ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                autoFocus
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--accent)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  flexGrow: 1,
                  outline: 'none'
                }}
              />
              <button className="btn active" onClick={handleRename}>Save</button>
            </div>
          ) : (
            <button className="btn" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsRenaming(true)}>
              <span style={{ fontSize: '1.2rem' }}>✏️</span> Rename "{preset.name}"
            </button>
          )}

          <button className="btn" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={onEditSounds}>
            <span style={{ fontSize: '1.2rem' }}>🎵</span> Edit Sounds
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>

        {isDeleting ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ flexGrow: 1 }} onClick={() => setIsDeleting(false)}>Cancel</button>
              <button className="btn" style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444', flexGrow: 1 }} onClick={handleDelete}>Confirm Delete</button>
            </div>
          </div>
        ) : (
          <button className="btn" style={{ textAlign: 'left', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsDeleting(true)}>
            <span style={{ fontSize: '1.2rem' }}>🗑</span> Delete Preset
          </button>
        )}

      </div>
    </div>
  );
}
