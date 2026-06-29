import { useState } from 'react';
import { X } from 'lucide-react';
import { presetStore, type CustomPreset } from '../utils/PresetStore';

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface CustomPresetUploaderProps {
  onClose: () => void;
  onPresetSaved: (id: string) => void;
  initialPreset?: CustomPreset | null;
}

export default function CustomPresetUploader({ onClose, onPresetSaved, initialPreset }: CustomPresetUploaderProps) {
  const [presetName, setPresetName] = useState(initialPreset ? initialPreset.name : '');
  const [files, setFiles] = useState<Record<string, File | Blob>>(initialPreset ? initialPreset.files : {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState(false);
  const [dragActiveKey, setDragActiveKey] = useState<string | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFile = (key: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, [key]: 'Max size is 10MB' }));
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[key];
        return newFiles;
      });
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
      setFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const handleClearFile = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[key];
      return newFiles;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleDrop = (key: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActiveKey(null);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const isAudio = droppedFile.type.startsWith('audio/') || droppedFile.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
      if (isAudio) {
        handleFile(key, droppedFile);
      } else {
        setErrors(prev => ({ ...prev, [key]: 'Only audio files are allowed' }));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (key: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActiveKey(key);
  };

  const handleDragLeave = (key: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragActiveKey(prev => prev === key ? null : prev);
    }
  };

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(key, selectedFile);
    }
  };

  const handleSave = async () => {
    if (!presetName.trim()) {
      setNameError(true);
      return;
    }
    
    let savedId: string;
    // Save to IndexedDB
    if (initialPreset) {
      await presetStore.updatePreset(initialPreset.id, presetName, files as Record<string, Blob>);
      savedId = initialPreset.id;
    } else {
      const newPreset = await presetStore.savePreset(presetName, files as Record<string, Blob>);
      savedId = newPreset.id;
    }
    
    onPresetSaved(savedId);
    onClose();
  };

  return (
    <div className="presets-overlay" style={{ background: 'var(--bg-dark)', backdropFilter: 'none' }}>
      <div className="overlay-header">
        <h2 className="title" style={{ fontSize: '1.2rem' }}>
          {initialPreset ? 'Edit Custom Preset' : 'Create Custom Preset'}
        </h2>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input 
          type="text" 
          placeholder="Preset Name" 
          value={presetName}
          onChange={(e) => {
            setPresetName(e.target.value);
            if (nameError) setNameError(false);
          }}
          style={{
            background: 'var(--glass-bg-hover)',
            border: nameError ? '1px solid var(--danger-light)' : '1px solid var(--glass-border-light)',
            color: 'var(--text-primary)',
            padding: '0.8rem 1rem',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '400px',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        {nameError && (
          <span style={{ color: 'var(--danger-light)', fontSize: '0.85rem' }}>
            Please enter a name for your preset before saving.
          </span>
        )}
      </div>

      <div className="dropzone-grid">
        {ALL_KEYS.map(key => (
          <div 
            key={key} 
            className={`dropzone ${files[key] ? 'filled' : ''} ${dragActiveKey === key ? 'active' : ''}`}
            onDrop={(e) => handleDrop(key, e)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(key, e)}
            onDragLeave={(e) => handleDragLeave(key, e)}
            onClick={() => document.getElementById(`file-${key}`)?.click()}
          >
            {files[key] && (
              <button 
                className="dropzone-clear" 
                onClick={(e) => handleClearFile(key, e)}
                title="Remove audio"
              >
                <X size={14} />
              </button>
            )}
            <div className="dropzone-key">{key}</div>
            <div className="dropzone-status">
              {errors[key] ? (
                <span style={{ color: 'var(--danger-light)' }}>{errors[key]}</span>
              ) : files[key] ? (
                (files[key] as File).name || 'Saved Audio File'
              ) : (
                'Click or drop audio here'
              )}
            </div>
            <input 
              type="file" 
              id={`file-${key}`}
              accept="audio/*" 
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(key, e)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'right', paddingTop: '2rem' }}>
        <button 
          className="btn active" 
          onClick={handleSave}
          disabled={Object.keys(files).length === 0}
        >
          Save Preset
        </button>
      </div>
    </div>
  );
}
