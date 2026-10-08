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
import {BgMesh} from '../design/fx';

// Scene 2 (130f): aurora stage breathes in from black, then the launcher
// rises expo with a floor reflection. (Site tour was cut: the film lives
// on the site, so showing it inside is redundant.)
export const DesktopReveal: React.FC<{app: string}> = ({app}) => {
  const frame = useCurrentFrame();

  const stage = interpolate(frame, [0, 40], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // anticipation crouch then expo rise
  const crouch = interpolate(frame, [18, 28], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = Math.min(1, Math.max(0, (frame - 28) / 52));
  const riseE = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
  const wy = (1 - riseE) * 1080 + (frame < 28 ? 1080 + crouch : 0);
  const landed = frame >= 76;

  const sheen = interpolate(frame, [58, 103], [-300, 1900], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {frame >= 25 && frame < 39 && <Audio src={staticFile('whoosh.wav')} volume={0.55} />}
      {frame >= 73 && frame < 76 && <Audio src={staticFile('thump.wav')} volume={0.7} />}
      <div style={{opacity: stage}}>
        <BgMesh />
      </div>
      <div
        style={{
          position: 'absolute', left: 210, top: 105, width: 1500, opacity: stage,
          transform: `translateY(${Math.max(0, wy)}px)`,
        }}
      >
        <Img
          src={app}
          style={{
            width: '100%', borderRadius: 18,
            boxShadow: '0 60px 120px rgba(0,0,0,0.65), 0 0 90px rgba(80,140,255,0.18)',
            filter: 'saturate(1.05)',
          }}
        />
        {/* floor reflection */}
        <Img
          src={app}
          style={{
            width: '100%', height: 300, objectFit: 'cover', objectPosition: 'top',
            borderRadius: '0 0 18px 18px', transform: 'scaleY(-1)',
            opacity: 0.16 * stage,
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 85%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 85%)',
            filter: 'blur(3px)',
          }}
        />
        {/* glass sheen after landing */}
        {landed && (
          <div
            style={{
              position: 'absolute', top: -100, bottom: -100, left: sheen, width: 200,
              transform: 'rotate(10deg)',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
