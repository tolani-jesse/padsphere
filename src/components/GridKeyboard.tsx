

interface GridKeyboardProps {
  activeKey: string | null;
  onKeyClick: (key: string) => void;
  loadedKeys?: string[];
}

// 12 keys total (C through B)
const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function GridKeyboard({ activeKey, onKeyClick, loadedKeys }: GridKeyboardProps) {
  return (
    <div className="grid-keyboard">
      {keys.map((k) => {
        const isLoaded = loadedKeys ? loadedKeys.includes(k) : true;

        return (
          <div
            key={k}
            className={`grid-pad ${activeKey === k ? 'active' : ''} ${!isLoaded ? 'disabled' : ''}`}
            onClick={() => {
              if (isLoaded) {
                onKeyClick(k);
              }
            }}
          >
            {activeKey === k && (
              <div className="ripple-container">
                <div className="ripple ripple-1"></div>
                <div className="ripple ripple-2"></div>
              </div>
            )}
            <span className="pad-label">{k}</span>
          </div>
        );
      })}
    </div>
  );
}
