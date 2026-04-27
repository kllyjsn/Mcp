import { useStore } from '../stores/useStore';
import { midiNoteToString } from '../engine/scales';
import { chordToString } from '../engine/chords';

const STAFF_LINE_SPACING = 8;
const TREBLE_LINES = [64, 67, 71, 74, 77]; // E4, G4, B4, D5, F5
const BASS_LINES = [43, 47, 50, 53, 57]; // G2, B2, D3, F3, A3
const STAFF_TOP_MARGIN = 40;
const TREBLE_TOP = STAFF_TOP_MARGIN;
const BASS_TOP = TREBLE_TOP + STAFF_LINE_SPACING * 8 + 30;
const SYSTEM_HEIGHT = BASS_TOP + STAFF_LINE_SPACING * 8 + 40;

function midiToDiatonicPos(midi: number): number {
  const chromaticToDiatonic = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  return Math.floor(midi / 12) * 7 + chromaticToDiatonic[midi % 12];
}

function midiToStaffY(midi: number, clef: 'treble' | 'bass'): number {
  const ref = clef === 'treble' ? { midi: 71, line: 2 } : { midi: 50, line: 2 };
  const top = clef === 'treble' ? TREBLE_TOP : BASS_TOP;

  const diatonicDiff = midiToDiatonicPos(midi) - midiToDiatonicPos(ref.midi);
  const linePos = ref.line - diatonicDiff * 0.5;
  return top + linePos * STAFF_LINE_SPACING;
}

function isSharp(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

export function ScoreView() {
  const { composition, selectedTrackId } = useStore();

  const track = composition?.tracks.find(t => t.id === selectedTrackId);

  if (!composition || !track) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950/50">
        <p className="text-zinc-500">Select a track to view its score</p>
      </div>
    );
  }

  const totalBeats = composition.params.measures * composition.params.timeSignature[0];
  const beatsPerMeasure = composition.params.timeSignature[0];
  const beatWidth = 40;
  const scoreWidth = totalBeats * beatWidth + 120;
  const xOffset = 80;

  const isDrums = track.name === 'Drums';
  const isBass = track.name === 'Bass';
  const clef = isBass ? 'bass' : 'treble';
  const staffMiddleY = (clef === 'treble' ? TREBLE_TOP : BASS_TOP) + 2 * STAFF_LINE_SPACING;

  return (
    <div className="flex-1 overflow-auto custom-scrollbar bg-zinc-950/30 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Score</span>
        <span className="text-xs text-amber-400/70 font-mono">{track.name}</span>
        <span className="text-xs text-zinc-600 font-mono">
          {composition.params.key} {composition.params.scale.replace(/_/g, ' ')}
        </span>
      </div>

      <svg
        width={scoreWidth}
        height={SYSTEM_HEIGHT}
        className="bg-zinc-900/20 rounded-lg"
      >
        {/* Treble clef staff lines */}
        {!isDrums && TREBLE_LINES.map((_, i) => (
          <line
            key={`t-${i}`}
            x1={xOffset - 20}
            x2={scoreWidth - 20}
            y1={TREBLE_TOP + i * STAFF_LINE_SPACING}
            y2={TREBLE_TOP + i * STAFF_LINE_SPACING}
            stroke="rgba(113,113,122,0.3)"
            strokeWidth={0.5}
          />
        ))}

        {/* Bass clef staff lines */}
        {!isDrums && isBass && BASS_LINES.map((_, i) => (
          <line
            key={`b-${i}`}
            x1={xOffset - 20}
            x2={scoreWidth - 20}
            y1={BASS_TOP + i * STAFF_LINE_SPACING}
            y2={BASS_TOP + i * STAFF_LINE_SPACING}
            stroke="rgba(113,113,122,0.3)"
            strokeWidth={0.5}
          />
        ))}

        {/* Clef symbols */}
        {!isDrums && (
          <text
            x={xOffset - 15}
            y={clef === 'treble' ? TREBLE_TOP + 28 : BASS_TOP + 24}
            fill="rgba(161,161,170,0.6)"
            fontSize={clef === 'treble' ? 32 : 24}
            fontFamily="serif"
          >
            {clef === 'treble' ? '\uD834\uDD1E' : '\uD834\uDD22'}
          </text>
        )}

        {/* Measure bar lines */}
        {Array.from({ length: composition.params.measures + 1 }, (_, i) => {
          const x = xOffset + i * beatsPerMeasure * beatWidth;
          return (
            <line
              key={`bar-${i}`}
              x1={x}
              x2={x}
              y1={TREBLE_TOP}
              y2={isBass ? BASS_TOP + 4 * STAFF_LINE_SPACING : TREBLE_TOP + 4 * STAFF_LINE_SPACING}
              stroke="rgba(113,113,122,0.4)"
              strokeWidth={i === 0 || i === composition.params.measures ? 1.5 : 0.5}
            />
          );
        })}

        {/* Measure numbers */}
        {Array.from({ length: composition.params.measures }, (_, i) => (
          <text
            key={`mnum-${i}`}
            x={xOffset + i * beatsPerMeasure * beatWidth + 3}
            y={TREBLE_TOP - 8}
            fill="rgba(113,113,122,0.5)"
            fontSize={9}
            fontFamily="monospace"
          >
            {i + 1}
          </text>
        ))}

        {/* Chord symbols */}
        {composition.chordProgression.map((chord, i) => (
          <text
            key={`chord-${i}`}
            x={xOffset + chord.startBeat * beatWidth + 2}
            y={TREBLE_TOP - 20}
            fill="rgba(217,119,6,0.7)"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {chordToString(chord)}
          </text>
        ))}

        {/* Notes */}
        {!isDrums && track.notes.map((note, i) => {
          const x = xOffset + note.startBeat * beatWidth;
          const y = midiToStaffY(note.pitch, clef);
          const opacity = 0.5 + (note.velocity / 127) * 0.5;
          const sharp = isSharp(note.pitch);

          return (
            <g key={i}>
              {sharp && (
                <text
                  x={x - 8}
                  y={y + 4}
                  fill={track.color}
                  fontSize={10}
                  opacity={opacity}
                >
                  #
                </text>
              )}
              <ellipse
                cx={x + 5}
                cy={y}
                rx={4}
                ry={3}
                fill={track.color}
                opacity={opacity}
              />
              {note.duration >= 1 && (
                <line
                  x1={x + 9}
                  x2={x + 9}
                  y1={y}
                  y2={y < staffMiddleY ? y + 24 : y - 24}
                  stroke={track.color}
                  strokeWidth={1}
                  opacity={opacity}
                />
              )}
              {note.duration < 1 && (
                <>
                  <line
                    x1={x + 9}
                    x2={x + 9}
                    y1={y}
                    y2={y < staffMiddleY ? y + 24 : y - 24}
                    stroke={track.color}
                    strokeWidth={1}
                    opacity={opacity}
                  />
                  <line
                    x1={x + 9}
                    x2={x + 16}
                    y1={y < staffMiddleY ? y + 24 : y - 24}
                    y2={y < staffMiddleY ? y + 18 : y - 18}
                    stroke={track.color}
                    strokeWidth={1}
                    opacity={opacity}
                  />
                </>
              )}
              <title>{midiNoteToString(note.pitch)} vel:{note.velocity}</title>
            </g>
          );
        })}

        {/* Drum notation */}
        {isDrums && track.notes.map((note, i) => {
          const x = xOffset + note.startBeat * beatWidth;
          const yMap: Record<number, number> = {
            36: TREBLE_TOP + 4 * STAFF_LINE_SPACING,     // kick
            38: staffMiddleY,     // snare
            42: TREBLE_TOP,                                // hihat closed
            46: TREBLE_TOP - STAFF_LINE_SPACING,          // hihat open
            51: TREBLE_TOP - STAFF_LINE_SPACING * 0.5,   // ride
            49: TREBLE_TOP - STAFF_LINE_SPACING * 1.5,   // crash
            37: TREBLE_TOP + 2.5 * STAFF_LINE_SPACING,   // rimshot
            45: TREBLE_TOP + 3 * STAFF_LINE_SPACING,     // tom low
            50: TREBLE_TOP + 1.5 * STAFF_LINE_SPACING,   // tom high
          };
          const y = yMap[note.pitch] ?? staffMiddleY;
          const isHihatOrCymbal = [42, 46, 49, 51].includes(note.pitch);

          return (
            <g key={i}>
              {isHihatOrCymbal ? (
                <text
                  x={x}
                  y={y + 4}
                  fill={track.color}
                  fontSize={10}
                  opacity={0.6 + (note.velocity / 127) * 0.4}
                >
                  x
                </text>
              ) : (
                <ellipse
                  cx={x + 4}
                  cy={y}
                  rx={3.5}
                  ry={3}
                  fill={track.color}
                  opacity={0.5 + (note.velocity / 127) * 0.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
