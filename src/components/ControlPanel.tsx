import { Volume2 } from 'lucide-react';
import React from 'react';

interface ControlPanelProps {
  volume: number;
  setVolume: (v: number) => void;
  octave: number;
  setOctave: (o: number) => void;
  onCheckForUpdates: () => void;
}

export default function ControlPanel({ volume, setVolume, octave, setOctave, onCheckForUpdates }: ControlPanelProps) {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    const remainder = val % 10;
    
    // Magnetic snap distance of ±1
    if (remainder <= 1) {
      val = val - remainder;
    } else if (remainder >= 9) {
      val = val + (10 - remainder);
    }
    
    setVolume(val);
  };

  return (
    <div className="control-bar">
      
      {/* Octave Controls */}
      <div className="control-group">
        <span className="control-label">Octave</span>
        <div className="octave-controls">
          <button 
            className={`octave-btn ${octave === -1 ? 'active' : ''}`}
            onClick={() => setOctave(-1)}
          >
            -1
          </button>
          <button 
            className={`octave-btn ${octave === 0 ? 'active' : ''}`}
            onClick={() => setOctave(0)}
          >
            0
          </button>
          <button 
            className={`octave-btn ${octave === 1 ? 'active' : ''}`}
            onClick={() => setOctave(1)}
          >
            +1
          </button>
        </div>
      </div>

      {/* Volume Control */}
      <div className="control-group volume-group">
        <span className="control-label">Volume</span>
        <div className="volume-control">
          <Volume2 size={20} color="var(--text-secondary)" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <span className="volume-value">{volume}%</span>
        </div>
      </div>

      <div className="control-group" style={{ marginLeft: 'auto' }}>
        <button className="primary-btn" onClick={onCheckForUpdates} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          Check for Updates
        </button>
      </div>
    </div>
  );
}
