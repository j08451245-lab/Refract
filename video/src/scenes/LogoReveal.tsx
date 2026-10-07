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

// Scene 1 (160f): premium logo reveal on near-black.
// Spring entrance, breathing glow, tagline with tracking settle,
// vignette + fine grain for a filmic finish.
export const LogoReveal: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({frame, fps, config: {damping: 14, stiffness: 80}});
  const breathe = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * 0.5);
  const glowR = 70 + breathe * 50;
  const glowA = 0.4 + breathe * 0.25;
  const tagOpacity = interpolate(frame, [60, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [60, 100], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagTracking = interpolate(frame, [60, 110], [0.12, -0.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{backgroundColor: '#050507', alignItems: 'center', justifyContent: 'center'}}
    >
      <Audio src={staticFile('shimmer.wav')} volume={0.6} />
      <Img
        src={logo}
        style={{
          width: 300,
          height: 300,
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 ${glowR}px rgba(90,150,255,${glowA}))`,
        }}
      />
      <div
        style={{
          marginTop: 40,
          fontSize: 46,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          letterSpacing: `${tagTracking}em`,
          color: 'rgba(255,255,255,0.94)',
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}
      >
        Think faster.
      </div>
      {/* vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
