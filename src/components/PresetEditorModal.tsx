import { useState } from 'react';
import { Pencil, Music, Trash2, X } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(preset.isImported || false);

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
    <div className="presets-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '12px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--modal-bg)' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="title" style={{ fontSize: '1.2rem', margin: 0 }}>
            {preset.isImported ? 'Delete Premium Preset' : 'Edit Preset'}
          </h2>
          <button className="btn" onClick={onClose} style={{ padding: '0.25rem 0.5rem', border: 'none', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {!preset.isImported && (
          <>
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
                      background: 'var(--glass-bg-hover)',
                      border: '1px solid var(--glass-border-light)',
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
                <button className="btn" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={() => setIsRenaming(true)}>
                  <Pencil size={18} /> Rename "{preset.name}"
                </button>
              )}

              <button className="btn" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={onEditSounds}>
                <Music size={18} /> Edit Sounds
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border-light)', margin: '0.5rem 0' }}></div>
          </>
        )}

        {isDeleting ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: 'var(--danger-light)', fontSize: '0.9rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!preset.isImported && (
                <button className="btn" style={{ flexGrow: 1 }} onClick={() => setIsDeleting(false)}>Cancel</button>
              )}
              <button className="btn" style={{ background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)', flexGrow: 1 }} onClick={handleDelete}>Confirm Delete</button>
            </div>
          </div>
        ) : (
          <button className="btn" style={{ textAlign: 'left', color: 'var(--danger-light)', borderColor: 'var(--danger-bg)', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={() => setIsDeleting(true)}>
            <Trash2 size={18} /> Delete Preset
          </button>
        )}

      </div>
    </div>
  );
}
