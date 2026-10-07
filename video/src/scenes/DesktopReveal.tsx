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

// Scene 4 (130f): the site sinks away blurred; aurora stage breathes in
// (anticipation), then the launcher rises expo with a floor reflection.
export const DesktopReveal: React.FC<{site: string; app: string}> = ({site, app}) => {
  const frame = useCurrentFrame();

  const sink = interpolate(frame, [0, 42], [0, 720], {
    easing: theme.ease.in,
    extrapolateRight: 'clamp',
  });
  const sinkBlur = interpolate(frame, [0, 42], [0, 20], {extrapolateRight: 'clamp'});
  const sinkDim = interpolate(frame, [0, 42], [1, 0], {extrapolateRight: 'clamp'});

  const stage = interpolate(frame, [12, 52], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // anticipation crouch then expo rise
  const crouch = interpolate(frame, [30, 40], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = Math.min(1, Math.max(0, (frame - 40) / 52));
  const riseE = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
  const wy = (1 - riseE) * 1080 + (frame < 40 ? 1080 + crouch : 0);
  const landed = frame >= 88;

  const sheen = interpolate(frame, [70, 115], [-300, 1900], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {frame >= 37 && frame < 51 && <Audio src={staticFile('whoosh.wav')} volume={0.55} />}
      {frame >= 85 && frame < 88 && <Audio src={staticFile('thump.wav')} volume={0.7} />}
      <Img
        src={site}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `translateY(${sink}px)`, filter: `blur(${sinkBlur}px)`, opacity: sinkDim,
        }}
      />
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
