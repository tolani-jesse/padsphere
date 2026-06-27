

interface PianoKeyboardProps {
  activeKey: string | null;
  onKeyClick: (key: string) => void;
  loadedKeys: string[];
}

const keys = [
  { id: 'C', type: 'white', label: 'C' },
  { id: 'C#', type: 'black', pos: 'cs' },
  { id: 'D', type: 'white', label: 'D' },
  { id: 'D#', type: 'black', pos: 'ds' },
  { id: 'E', type: 'white', label: 'E' },
  { id: 'F', type: 'white', label: 'F' },
  { id: 'F#', type: 'black', pos: 'fs' },
  { id: 'G', type: 'white', label: 'G' },
  { id: 'G#', type: 'black', pos: 'gs' },
  { id: 'A', type: 'white', label: 'A' },
  { id: 'A#', type: 'black', pos: 'as' },
  { id: 'B', type: 'white', label: 'B' },
];

export default function PianoKeyboard({ activeKey, onKeyClick, loadedKeys }: PianoKeyboardProps) {
  return (
    <div className="piano">
      {keys.map((k, index) => {
        const isLoaded = loadedKeys.includes(k.id);
        const nextKey = keys[index + 1];
        const isNextKeyActiveBlack = nextKey && nextKey.type === 'black' && activeKey === nextKey.id;

        return (
          <div
            key={k.id}
            className={`key key-${k.type} key-id-${k.id.replace('#', 's').toLowerCase()} ${k.type === 'black' ? k.pos : ''} ${activeKey === k.id ? 'active' : ''} ${!isLoaded ? 'disabled' : ''} ${isNextKeyActiveBlack ? 'hide-separator' : ''}`}
            onClick={() => {
              if (isLoaded) {
                onKeyClick(k.id);
              }
            }}
          >
            {activeKey === k.id && (
              <div className="ripple-container">
                <div className="ripple ripple-1"></div>
                <div className="ripple ripple-2"></div>
                <div className="ripple ripple-3"></div>
              </div>
            )}
            {k.label && <span className="key-label">{k.label}</span>}
            {k.type === 'black' && <span className="key-label" style={{ position: 'absolute', bottom: '15px' }}>{k.id}</span>}
          </div>
        );
      })}
    </div>
  );
}
