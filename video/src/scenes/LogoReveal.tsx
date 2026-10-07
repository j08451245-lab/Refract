import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Scene 1: premium logo reveal on near-black.
// Logo springs in with a soft blue glow; tagline rises underneath.
export const LogoReveal: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({frame, fps, config: {damping: 18, stiffness: 90}});
  const glow = interpolate(frame, [0, 45, 120], [0, 1, 0.55], {
    extrapolateRight: 'clamp',
  });
  const tagOpacity = interpolate(frame, [55, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [55, 90], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050507',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={logo}
        style={{
          width: 300,
          height: 300,
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 ${90 * glow}px rgba(80,140,255,${0.55 * glow}))`,
        }}
      />
      <div
        style={{
          marginTop: 36,
          fontSize: 44,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'rgba(255,255,255,0.92)',
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}
      >
        Think faster.
      </div>
    </AbsoluteFill>
  );
};
