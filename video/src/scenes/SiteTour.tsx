import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {theme} from '../design/theme';

// Scene 3 (300f): Cluely-style continuous scroll — one smooth camera down
// the whole page, expo glides, breathing holds on each section, gentle
// rack focus with velocity. No cuts, no clutter.
const MAX_Y = 7876 - 1080;
const STOPS: Array<[number, number]> = [
  [0, 0],
  [45, 0],
  [100, -1750],
  [132, -1750],
  [187, -3350],
  [219, -3350],
  [292, -MAX_Y],
  [300, -MAX_Y],
];

function camY(frame: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    if (frame <= STOPS[i][0]) {
      const [f0, y0] = STOPS[i - 1];
      const [f1, y1] = STOPS[i];
      const t = Math.min(1, Math.max(0, (frame - f0) / Math.max(1, f1 - f0)));
      const s = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -7 * t);
      return y0 + (y1 - y0) * s;
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export const SiteTour: React.FC<{tall: string}> = ({tall}) => {
  const frame = useCurrentFrame();
  const y = camY(frame);
  const vel = Math.abs(camY(frame) - camY(Math.max(0, frame - 1)));
  const focus = Math.min(5, vel * 0.16);

  const chipO = interpolate(frame, [0, 14, 60, 80], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {[43, 123, 226].map((f) =>
        frame >= f - 3 && frame < f + 11 ? (
          <Audio key={f} src={staticFile('whoosh.wav')} volume={0.3} />
        ) : null,
      )}
      <Img
        src={tall}
        style={{
          position: 'absolute', top: 0, left: 0, width: 1920,
          transform: `translateY(${y}px)`,
          transformOrigin: 'top center',
          filter: `blur(${focus.toFixed(2)}px) saturate(1.05)`,
        }}
      />
      <div style={{position: 'absolute', left: 90, top: 84, opacity: chipO,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(10,13,22,0.66)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '12px 26px'}}>
        <div style={{width: 12, height: 12, borderRadius: 6, background: '#34d399'}} />
        <span style={{fontSize: 25, fontFamily: theme.font, fontWeight: 600, color: '#fff'}}>
          refract.software — full tour
        </span>
      </div>
    </AbsoluteFill>
  );
};
