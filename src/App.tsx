import { useStore } from './stores/useStore';
import { TransportBar } from './components/TransportBar';
import { CompositionPanel } from './components/CompositionPanel';
import { ArrangementView } from './components/ArrangementView';
import { MixerView } from './components/MixerView';
import { PianoRollView } from './components/PianoRollView';
import { ChordDisplay } from './components/ChordDisplay';
import { LayoutGrid, Sliders, Piano } from 'lucide-react';

function ViewTab({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? 'bg-zinc-800 text-amber-400'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function App() {
  const { activeView, setActiveView, composition } = useStore();

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <span className="text-zinc-900 text-sm font-black">M</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">MCP</h1>
              <p className="text-[9px] text-zinc-500 tracking-widest uppercase">Music Composition Platform</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/60 rounded-lg p-0.5 border border-zinc-800/40">
          <ViewTab
            active={activeView === 'arrange'}
            onClick={() => setActiveView('arrange')}
            icon={LayoutGrid}
            label="Arrange"
          />
          <ViewTab
            active={activeView === 'mixer'}
            onClick={() => setActiveView('mixer')}
            icon={Sliders}
            label="Mixer"
          />
          <ViewTab
            active={activeView === 'piano_roll'}
            onClick={() => setActiveView('piano_roll')}
            icon={Piano}
            label="Piano Roll"
          />
        </div>

        <div className="w-44" />
      </header>

      {/* Transport */}
      <TransportBar />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <CompositionPanel />
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'arrange' && <ArrangementView />}
          {activeView === 'mixer' && <MixerView />}
          {activeView === 'piano_roll' && <PianoRollView />}
          {composition && <ChordDisplay />}
        </div>
      </div>
    </div>
  );
}
