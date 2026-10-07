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
import {Entrance, KenBurns} from '../design/fx';

// Scene 2 (130f): the site rises with expo-out after a 6f anticipation dip,
// sheen sweep, then a slow Ken Burns drift. Rack focus: sharp only on hold.
export const SiteRise: React.FC<{shot: string}> = ({shot}) => {
  const frame = useCurrentFrame();

  const dip = interpolate(frame, [0, 7], [26, 0], {
    easing: theme.ease.in,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const riseT = Math.min(1, Math.max(0, (frame - 7) / 55));
  const riseE = 1 - Math.pow(2, -10 * riseT);
  const y = (1 - riseE) * 1080 + dip;
  const blur = interpolate(frame, [7, 62], [16, 0], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = 1.07 - riseE * 0.07;
  // gentle drift once settled
  const drift = frame > 70 ? (frame - 70) * 0.35 : 0;

  const sheen = interpolate(frame, [25, 75], [-350, 2300], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {frame >= 4 && frame < 18 && <Audio src={staticFile('whoosh.wav')} volume={0.5} />}
      <Img
        src={shot}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateY(${Math.max(0, y - drift * 0.2)}px) scale(${scale})`,
          filter: `blur(${Math.max(0, blur)}px) saturate(1.06)`,
        }}
      />
      <div
        style={{
          position: 'absolute', top: -200, bottom: -200, left: sheen, width: 240,
          transform: 'rotate(12deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
        }}
      />
      <Entrance delay={74} rise={20}>
        <div
          style={{
            position: 'absolute', left: 90, bottom: 84, display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(10,13,22,0.66)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '12px 26px',
          }}
        >
          <div style={{width: 12, height: 12, borderRadius: 6, background: '#34d399'}} />
          <span style={{fontSize: 25, fontFamily: theme.font, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em'}}>
            Live product — refract.software
          </span>
        </div>
      </Entrance>
      {frame >= 71 && frame < 77 && <Audio src={staticFile('pop.wav')} volume={0.45} />}
    </AbsoluteFill>
  );
};
