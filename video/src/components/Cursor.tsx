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

// Apple-style pointer arrow with soft drop shadow.
export const CURSOR_PATH =
  'M4 3 L4 34 L11.5 26.5 L15.5 35 L20 33 L16 24.5 L23.5 24.5 Z';

export const Cursor: React.FC<{
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}> = ({x, y, scale = 1, opacity = 1}) => {
  return (
    <svg
      width={30 * scale}
      height={40 * scale}
      viewBox="0 0 28 40"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))',
      }}
    >
      <path d={CURSOR_PATH} fill="#fff" stroke="#111" strokeWidth={1.6} />
    </svg>
  );
};

// Expanding click ripple ring. Mount at a click frame; lives ~20 frames.
export const ClickRipple: React.FC<{x: number; y: number; at: number}> = ({
  x,
  y,
  at,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 22) return null;
  const r = interpolate(local, [0, 22], [6, 46]);
  const o = interpolate(local, [0, 22], [0.9, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.95)',
        opacity: o,
        pointerEvents: 'none',
      }}
    />
  );
};

// Piecewise cursor position along timed waypoints.
export type Waypoint = {f: number; x: number; y: number};
export function cursorAt(waypoints: Waypoint[], frame: number) {
  if (frame <= waypoints[0].f) return waypoints[0];
  for (let i = 1; i < waypoints.length; i++) {
    if (frame <= waypoints[i].f) {
      const a = waypoints[i - 1];
      const b = waypoints[i];
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      // smoothstep easing per segment
      const s = t * t * (3 - 2 * t);
      return {f: frame, x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s};
    }
  }
  return waypoints[waypoints.length - 1];
}

// Frosted-glass label chip that pops in.
export const Callout: React.FC<{
  x: number;
  y: number;
  at: number;
  children: React.ReactNode;
}> = ({x, y, at, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - at;
  if (local < 0) return null;
  const pop = spring({frame: local, fps, config: {damping: 15, stiffness: 160}});
  const fadeOut =
    local > 90 ? interpolate(local, [90, 115], [1, 0], {extrapolateRight: 'clamp'}) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${pop})`,
        opacity: Math.min(pop, fadeOut),
        background: 'rgba(20,22,30,0.72)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 14,
        padding: '10px 18px',
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#fff',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      <Audio src={staticFile('pop.wav')} volume={0.5} startFrom={0} />
    </div>
  );
};
