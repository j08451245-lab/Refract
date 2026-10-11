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
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

// Act 2 — Product (270f = 9s). REAL launcher plate (dark, 2x capture).
// coordinate-target-zoom: wide establishes → zoom into Start Refract
// (outer scale @center + inner counter-translate, shared ease/duration)
// → dwell so the viewer READS the UI → click with press physics →
// pull back + line. No fake UI, no callouts — the pixels are the product.
//
// Measured target (Playwright bbox, CSS px @1920x1080):
//   Start Refract center = (1297.2, 98.25)
//   offset from viewport center = (337.2, -441.75)
//   counter-translate T = -offset = (-337.2, +441.75)
// Zoom 2.0x: plate is 3840px wide = exactly 1:1 at peak (no upscale blur).
const OFF_X = 337.2;
const OFF_Y = -441.75;
const ZOOM = 2.0;
const CLICK = {x: 960, y: 540}; // button lands at viewport center by construction

export const ActProduct: React.FC<{app: string}> = ({app}) => {
  const frame = useCurrentFrame();

  const inn = interpolate(frame, [0, 45], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const settle = 0.985 + inn * 0.015;

  // Zoom envelope: in [50,110] → dwell → out [200,250]. Same curve drives
  // scale AND counter-translate so the target never wanders mid-zoom.
  const zin = interpolate(frame, [50, 110], [0, 1], {
    easing: theme.ease.inOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zout = interpolate(frame, [200, 250], [0, 1], {
    easing: theme.ease.inOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p = zin * (1 - zout);
  const scale = 1 + (ZOOM - 1) * p;
  const tx = -OFF_X * p;
  const ty = -OFF_Y * p;

  const line = interpolate(frame, [212, 252], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor glides while the camera travels, arrives as the zoom settles,
  // clicks at 165 (button is at viewport center), then leaves.
  const pos = cursorAt(
    [
      {f: 0, x: 1750, y: 900},
      {f: 150, x: CLICK.x, y: CLICK.y, bow: -60},
      {f: 168, x: CLICK.x, y: CLICK.y},
      {f: 245, x: 1780, y: 880, bow: 60},
    ],
    frame,
  );
  // press-release-spring: cursor + target depress together on click.
  const dip = interpolate(frame, [155, 165, 182], [1.5, 1.28, 1.5], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
      {frame >= 162 && frame < 165 && <Audio src={staticFile('click.wav')} volume={0.6} />}
      {frame >= 2 && frame < 5 && <Audio src={staticFile('whoosh.wav')} volume={0.28} />}
      <div
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: '50% 50%',
          transform: `scale(${settle * scale})`,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${tx}px, ${ty}px)`,
            willChange: 'transform',
          }}
        >
          <Img
            src={app}
            style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.03)'}}
          />
        </div>
      </div>
      {/* bottom scrim — type stays legible over any capture */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 260,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
          opacity: line,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 92,
          opacity: line,
          fontSize: 52,
          fontFamily: theme.font,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: '#fff',
          textShadow: '0 2px 24px rgba(0,0,0,0.6)',
        }}
      >
        Your day, already prepared.
      </div>
      {frame >= 30 && frame < 250 && <Cursor x={pos.x - 8} y={pos.y - 4} scale={dip} />}
      {frame >= 165 && frame < 185 && <ClickRipple x={CLICK.x} y={CLICK.y} at={165} />}
    </AbsoluteFill>
  );
};
