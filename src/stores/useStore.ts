import { create } from 'zustand';
import type {
  Composition,
  CompositionParams,
  TransportState,
} from '../types/music';
import { compose, recomposeTrack } from '../engine/composer';
import {
  buildComposition,
  play,
  pause,
  stop,
  setTempo,
  setTrackVolume,
  setTrackPan,
  setTrackMute,
  setTrackSolo,
  initAudio,
  setLoop,
  disableLoop,
} from '../engine/audio';

interface ComposerStore {
  composition: Composition | null;
  params: CompositionParams;
  transport: TransportState;
  selectedTrackId: string | null;
  isGenerating: boolean;
  compositionHistory: Composition[];
  activeView: 'arrange' | 'mixer' | 'piano_roll';

  setParam: <K extends keyof CompositionParams>(key: K, value: CompositionParams[K]) => void;
  generate: () => Promise<void>;
  regenerateTrack: (trackIndex: number) => void;
  togglePlay: () => Promise<void>;
  stopPlayback: () => void;
  setSelectedTrack: (id: string | null) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  updateTrackPan: (trackId: string, pan: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  setActiveView: (view: 'arrange' | 'mixer' | 'piano_roll') => void;
  setTempo: (bpm: number) => void;
  toggleLoop: () => void;
}

const DEFAULT_PARAMS: CompositionParams = {
  key: 'C',
  scale: 'major',
  tempo: 110,
  timeSignature: [4, 4],
  measures: 8,
  style: 'classical',
  dynamics: 'swell',
  harmonicComplexity: 5,
  melodicDensity: 5,
  rhythmicVariety: 5,
  expressiveness: 6,
};

export const useStore = create<ComposerStore>((set, get) => ({
  composition: null,
  params: DEFAULT_PARAMS,
  transport: {
    isPlaying: false,
    currentBeat: 0,
    loop: false,
    loopStart: 0,
    loopEnd: 32,
  },
  selectedTrackId: null,
  isGenerating: false,
  compositionHistory: [],
  activeView: 'arrange',

  setParam: (key, value) => {
    set(state => ({
      params: { ...state.params, [key]: value },
    }));
  },

  generate: async () => {
    set({ isGenerating: true });
    await initAudio();

    const params = get().params;
    const composition = compose(params);

    set(state => ({
      composition,
      isGenerating: false,
      selectedTrackId: composition.tracks[0]?.id ?? null,
      compositionHistory: [...state.compositionHistory.slice(-19), composition],
      transport: { ...state.transport, isPlaying: false, currentBeat: 0 },
    }));

    stop();
    buildComposition(composition);
  },

  regenerateTrack: (trackIndex: number) => {
    const { composition } = get();
    if (!composition) return;

    const newTrack = recomposeTrack(composition, trackIndex);
    const newTracks = [...composition.tracks];
    newTracks[trackIndex] = newTrack;

    const newComposition = { ...composition, tracks: newTracks };
    set({ composition: newComposition });

    stop();
    buildComposition(newComposition);
  },

  togglePlay: async () => {
    await initAudio();
    const { transport, composition } = get();
    if (!composition) return;

    if (transport.isPlaying) {
      pause();
      set({ transport: { ...transport, isPlaying: false } });
    } else {
      play();
      set({ transport: { ...transport, isPlaying: true } });
    }
  },

  stopPlayback: () => {
    stop();
    set(state => ({
      transport: { ...state.transport, isPlaying: false, currentBeat: 0 },
    }));
  },

  setSelectedTrack: (id) => set({ selectedTrackId: id }),

  updateTrackVolume: (trackId, volume) => {
    setTrackVolume(trackId, volume);
    set(state => {
      if (!state.composition) return {};
      return {
        composition: {
          ...state.composition,
          tracks: state.composition.tracks.map(t =>
            t.id === trackId ? { ...t, volume } : t
          ),
        },
      };
    });
  },

  updateTrackPan: (trackId, pan) => {
    setTrackPan(trackId, pan);
    set(state => {
      if (!state.composition) return {};
      return {
        composition: {
          ...state.composition,
          tracks: state.composition.tracks.map(t =>
            t.id === trackId ? { ...t, pan } : t
          ),
        },
      };
    });
  },

  toggleTrackMute: (trackId) => {
    set(state => {
      if (!state.composition) return {};
      const track = state.composition.tracks.find(t => t.id === trackId);
      if (!track) return {};

      const newMuted = !track.muted;
      setTrackMute(trackId, newMuted);

      return {
        composition: {
          ...state.composition,
          tracks: state.composition.tracks.map(t =>
            t.id === trackId ? { ...t, muted: newMuted } : t
          ),
        },
      };
    });
  },

  toggleTrackSolo: (trackId) => {
    set(state => {
      if (!state.composition) return {};
      const track = state.composition.tracks.find(t => t.id === trackId);
      if (!track) return {};

      const newSolo = !track.solo;
      const allIds = state.composition.tracks.map(t => t.id);
      setTrackSolo(trackId, newSolo, allIds);

      return {
        composition: {
          ...state.composition,
          tracks: state.composition.tracks.map(t =>
            t.id === trackId ? { ...t, solo: newSolo } : t
          ),
        },
      };
    });
  },

  setActiveView: (view) => set({ activeView: view }),

  setTempo: (bpm) => {
    setTempo(bpm);
    set(state => ({
      params: { ...state.params, tempo: bpm },
    }));
  },

  toggleLoop: () => {
    set(state => {
      const newLoop = !state.transport.loop;
      if (newLoop) {
        const totalBeats = state.params.measures * state.params.timeSignature[0];
        setLoop(0, totalBeats);
      } else {
        disableLoop();
      }
      return { transport: { ...state.transport, loop: newLoop } };
    });
  },
}));
