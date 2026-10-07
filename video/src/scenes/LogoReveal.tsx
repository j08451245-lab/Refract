import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {theme} from '../design/theme';
import {WordReveal} from '../design/fx';

// Scene 1 (160f): cold open on black. Anticipation dip, sub-bass landing,
// spark rays, breathing glow, kinetic tagline.
const RAYS = 12;

export const LogoReveal: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // anticipation: slight crouch before the spring releases at f10
  const dip = interpolate(frame, [0, 10], [0.86, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rel = spring({frame: frame - 10, fps, config: {damping: 11, stiffness: 95}});
  const scale = frame < 10 ? dip : 0.92 + rel * 0.08;

  const breathe = 0.5 + 0.5 * Math.sin(((frame - 10) / fps) * Math.PI * 2 * 0.45);
  const glowR = 70 + breathe * 55;
  const glowA = 0.38 + breathe * 0.27;

  const raysOn = spring({frame: frame - 12, fps, config: theme.spring.snappy});

  return (
    <AbsoluteFill style={{backgroundColor: '#020306', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 9 && frame < 12 && <Audio src={staticFile('thump.wav')} volume={0.9} />}
      {frame >= 16 && frame < 52 && <Audio src={staticFile('shimmer.wav')} volume={0.55} />}

      {/* spark rays */}
      <div style={{position: 'absolute', opacity: Math.min(1, raysOn * 1.2), transform: `scale(${0.6 + raysOn * 0.4})`}}>
        {Array.from({length: RAYS}).map((_, i) => {
          const p = spring({frame: frame - 12 - i * 1.1, fps, config: theme.spring.snappy});
          if (p <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: '50%', top: '50%', width: 10, height: 200 * p,
                background: `linear-gradient(180deg, ${theme.colors.accent}, transparent)`,
                borderRadius: 8, transformOrigin: '50% 0%',
                transform: `translateX(-50%) rotate(${(360 / RAYS) * i}deg) translateY(190px)`,
                opacity: 0.5 * p,
              }}
            />
          );
        })}
      </div>

      <Img
        src={logo}
        style={{
          width: 300,
          height: 300,
          transform: `scale(${Math.max(0.01, scale)})`,
          filter: `drop-shadow(0 0 ${glowR}px rgba(100,160,255,${frame < 10 ? 0 : glowA}))`,
        }}
      />
      <WordReveal
        text="Think faster."
        delay={72}
        per={4}
        style={{
          marginTop: 42,
          fontSize: 48,
          fontFamily: theme.font,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'rgba(255,255,255,0.95)',
        }}
      />
    </AbsoluteFill>
  );
};
