import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {theme} from './theme';

// ---- Film finish: grade + grain + vignette (exact order matters) ----

export const Grade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{backgroundColor: theme.colors.accent, mixBlendMode: 'soft-light', opacity: 0.16}}
    />
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.14), transparent 26%, transparent 70%, rgba(0,0,0,0.26))',
      }}
    />
  </AbsoluteFill>
);

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.055}) => {
  const frame = useCurrentFrame();
  // stepped position: holds like real film instead of swimming every frame
  const step = Math.floor(frame / 2);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        backgroundImage: NOISE,
        backgroundSize: '220px',
        backgroundPosition: `${(step * 37) % 220}px ${(step * 91) % 220}px`,
        opacity,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.24}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, transparent 54%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

// Aurora mesh ground — never a flat background.
export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 60;
  const d2 = Math.cos(frame / 70) * 50;
  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          borderRadius: '50%',
          top: -500,
          left: -320 + d1,
          filter: 'blur(60px)',
          background: `radial-gradient(circle, ${theme.colors.accentDeep}55, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          bottom: -450,
          right: -280 - d2,
          filter: 'blur(80px)',
          background: 'radial-gradient(circle, rgba(124,92,255,0.20), transparent 65%)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---- Motion vocabulary ----

// The workhorse: fade + rise + settle. Exits are faster than entrances.
export const Entrance: React.FC<{
  delay?: number;
  rise?: number;
  children: React.ReactNode;
}> = ({delay = 0, rise = 44, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: theme.spring.snappy});
  if (p <= 0) return null;
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [rise, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
      }}
    >
      {children}
    </div>
  );
};

// Kinetic type: word-by-word blur-in + rise. The single biggest upgrade
// over static fades.
export const WordReveal: React.FC<{
  text: string;
  delay?: number;
  per?: number;
  style?: React.CSSProperties;
}> = ({text, delay = 0, per = 3, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.24em', ...style}}>
      {text.split(' ').map((word, i) => {
        const p = spring({
          frame: frame - delay - i * per,
          fps,
          config: theme.spring.snappy,
        });
        if (p <= 0) return <span key={i} style={{opacity: 0}}>{word}</span>;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              filter: `blur(${interpolate(p, [0, 1], [10, 0])}px)`,
              transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Ken Burns shell for stills: slow push + drift so no shot ever sits dead.
export const KenBurns: React.FC<{
  src: string;
  from?: number;
  to?: number;
  drift?: number;
  style?: React.CSSProperties;
}> = ({src, from = 1, to = 1.07, drift = -18, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [from, to], {
    easing: theme.ease.inOut,
  });
  const dx = interpolate(frame, [0, durationInFrames], [0, drift], {
    easing: theme.ease.inOut,
  });
  return (
    <Img
      src={src}
      style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${dx}px)`, ...style}}
    />
  );
};

// Scene exit wrapper: everything leaves faster than it entered.
export const Exit: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const y = interpolate(frame, [durationInFrames - 12, durationInFrames - 2], [0, -46], {
    easing: theme.ease.in,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const o = interpolate(frame, [durationInFrames - 12, durationInFrames - 2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <div style={{transform: `translateY(${y}px)`, opacity: o}}>{children}</div>;
};
