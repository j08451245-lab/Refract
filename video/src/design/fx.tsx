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
// Drift halved per doctrine: background shimmer only, never a sightline push.
export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 26;
  const d2 = Math.cos(frame / 70) * 22;
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
// `config` defaults to snappy (Hero); Demo passes theme.spring.settle
// per the smooth-over-bouncy doctrine.
export const Entrance: React.FC<{
  delay?: number;
  rise?: number;
  config?: {damping: number; stiffness: number};
  children: React.ReactNode;
}> = ({delay = 0, rise = 44, config, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: config ?? theme.spring.snappy});
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
  config?: {damping: number; stiffness: number};
  style?: React.CSSProperties;
}> = ({text, delay = 0, per = 3, config, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.24em', ...style}}>
      {text.split(' ').map((word, i) => {
        const p = spring({
          frame: frame - delay - i * per,
          fps,
          config: config ?? theme.spring.snappy,
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

// hyperframes-animation: ambient-glow-bloom — un-triggered soft radial glow
// that blooms behind a hero and holds. Peak ≤ ~0.35, finite, deterministic.
export const Bloom: React.FC<{
  delay?: number;
  peak?: number;
  size?: number;
  color?: string;
}> = ({delay = 0, peak = 0.32, size = 900, color = '91,156,255'}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [delay, delay + 60], [0, peak], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        left: `calc(50% - ${size / 2}px)`,
        top: `calc(42% - ${size / 2}px)`,
        background: `radial-gradient(circle, rgba(${color},${o}), transparent 62%)`,
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}
    />
  );
};

// hyperframes-animation: gradient-text-sweep — a highlight travels THROUGH
// held letterforms (background-clip:text + oversized background position
// tween). Glyphs never move; the sweep is a pure function of frame.
export const SweepText: React.FC<{
  text: string;
  delay?: number;
  per?: number;
  sweepFrames?: number;
  config?: {damping: number; stiffness: number};
  style?: React.CSSProperties;
}> = ({text, delay = 0, per = 3, sweepFrames = 130, config, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sweep = interpolate(frame, [delay, delay + sweepFrames], [0, 100], {
    easing: theme.ease.inOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.24em', ...style}}>
      {text.split(' ').map((word, i) => {
        const p = spring({
          frame: frame - delay - i * per,
          fps,
          config: config ?? theme.spring.settle,
        });
        if (p <= 0) return <span key={i} style={{opacity: 0}}>{word}</span>;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              backgroundImage: `linear-gradient(100deg, #5b9cff 20%, #d6e6ff 50%, #5b9cff 80%)`,
              backgroundSize: '220% 100%',
              backgroundPosition: `${100 - sweep}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
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
