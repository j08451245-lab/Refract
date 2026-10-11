import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../design/theme';
import {Bloom} from '../design/fx';

// Act 5 — Close (300f = 10s).
// Privacy line, logo, name, CTA button with a single shimmer sweep. Long hold.
export const ActClose: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [0, 55], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, 55], [30, 0], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const priv = interpolate(frame, [10, 50], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Single shimmer sweep across the button, then hold clean.
  const sweep = interpolate(frame, [90, 150], [-250, 450], {
    easing: theme.ease.inOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const micro = interpolate(frame, [150, 190], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 55 && frame < 91 && <Audio src={staticFile('shimmer.wav')} volume={0.4} />}
      {frame >= 8 && frame < 11 && <Audio src={staticFile('thump.wav')} volume={0.5} />}
      <Bloom delay={20} peak={0.28} size={800} />
      <div
        style={{
          opacity: inn,
          transform: `translateY(${rise}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            opacity: priv,
            fontSize: 26,
            fontFamily: theme.font,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: theme.colors.accent,
          }}
        >
          PRIVATE BY ARCHITECTURE
        </div>
        <Img src={logo} style={{width: 150, height: 150, marginTop: 24}} />
        <div
          style={{
            marginTop: 20,
            fontSize: 64,
            fontFamily: theme.font,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#fff',
          }}
        >
          Refract
        </div>
        <div style={{marginTop: 8, fontSize: 28, fontFamily: theme.font, color: 'rgba(255,255,255,0.55)'}}>
          refract.software
        </div>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            marginTop: 36,
            fontSize: 30,
            fontFamily: theme.font,
            fontWeight: 600,
            color: '#fff',
            background: '#1d1d1f',
            padding: '20px 70px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span>Get Refract — Free</span>
          <span
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: sweep - 60,
              width: 120,
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent)',
              transform: 'skewX(-12deg)',
            }}
          />
        </div>
        <div
          style={{
            opacity: micro,
            marginTop: 22,
            fontSize: 24,
            fontFamily: theme.font,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Free to start · Bring your own key · $0 vs $149/mo rivals
        </div>
      </div>
    </AbsoluteFill>
  );
};
