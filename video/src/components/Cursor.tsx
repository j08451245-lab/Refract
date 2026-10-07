import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Trail} from '@remotion/motion-blur';
import {theme} from '../design/theme';

// Apple pointer with physical motion: arcs between waypoints,
// anticipation pull-back before clicks, motion-blur trail on fast moves.
export const CURSOR_PATH =
  'M4 3 L4 34 L11.5 26.5 L15.5 35 L20 33 L16 24.5 L23.5 24.5 Z';

export const Cursor: React.FC<{
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
  trail?: boolean;
}> = ({x, y, scale = 1, opacity = 1, trail = false}) => {
  const el = (
    <svg
      width={30 * scale}
      height={40 * scale}
      viewBox="0 0 28 40"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))',
      }}
    >
      <path d={CURSOR_PATH} fill="#fff" stroke="#111" strokeWidth={1.6} />
    </svg>
  );
  if (!trail) return el;
  return (
    <Trail layers={4} lagInFrames={0.5} trailOpacity={0.55}>
      {el}
    </Trail>
  );
};

export const ClickRipple: React.FC<{x: number; y: number; at: number}> = ({
  x,
  y,
  at,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 20) return null;
  const t = local / 20;
  const r = 6 + (1 - Math.pow(1 - t, 3)) * 44;
  const r2 = 4 + (1 - Math.pow(1 - Math.min(1, t * 1.4), 3)) * 26;
  const o = 1 - t;
  return (
    <>
      <div
        style={{
          position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2,
          borderRadius: '50%', border: '3px solid rgba(255,255,255,0.95)', opacity: o,
        }}
      />
      <div
        style={{
          position: 'absolute', left: x - r2, top: y - r2, width: r2 * 2, height: r2 * 2,
          borderRadius: '50%', border: '2px solid rgba(140,190,255,0.9)', opacity: o,
        }}
      />
    </>
  );
};

export type Waypoint = {f: number; x: number; y: number; bow?: number};
// Interpolated cursor path with perpendicular arc bow (arcs, not lines)
// and expo easing per segment.
export function cursorAt(waypoints: Waypoint[], frame: number) {
  if (frame <= waypoints[0].f) return waypoints[0];
  for (let i = 1; i < waypoints.length; i++) {
    if (frame <= waypoints[i].f) {
      const a = waypoints[i - 1];
      const b = waypoints[i];
      const span = Math.max(1, b.f - a.f);
      const t = Math.min(1, Math.max(0, (frame - a.f) / span));
      // expo-out per segment: fast attack, confident settle
      const s = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bow = b.bow ?? 0;
      const nx = -dy / len;
      const ny = dx / len;
      const arc = Math.sin(s * Math.PI) * bow;
      return {f: frame, x: a.x + dx * s + nx * arc, y: a.y + dy * s + ny * arc};
    }
  }
  return waypoints[waypoints.length - 1];
}

// Frosted callout with staggered pop; SFX lands 3f before the visual.
export const Callout: React.FC<{
  x: number;
  y: number;
  at: number;
  children: React.ReactNode;
}> = ({x, y, at, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - at;
  // SFX fires ~3f before the visual lands (sound leads motion).
  if (local < -3) return null;
  const pop = spring({frame: local, fps, config: theme.spring.snappy});
  const fadeOut =
    local > 100 ? interpolate(local, [100, 126], [1, 0], {extrapolateRight: 'clamp'}) : 1;
  return (
    <>
      {local >= -3 && local < 3 && (
        <Audio src={staticFile('pop.wav')} volume={0.5} />
      )}
      {local >= 0 && (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `scale(${pop})`,
          opacity: Math.min(pop, fadeOut),
          background: 'rgba(16,19,29,0.78)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 14,
          padding: '11px 20px',
          fontSize: 26,
          fontFamily: theme.font,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#fff',
          boxShadow: '0 14px 44px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
      )}
    </>
  );
};
