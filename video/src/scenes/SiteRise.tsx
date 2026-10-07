import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Scene 2: the site rises fluidly from below the frame — blur to sharp,
// slight overshoot settle, full-bleed.
export const SiteRise: React.FC<{shot: string}> = ({shot}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const rise = spring({frame, fps, config: {damping: 22, stiffness: 70}});
  const y = interpolate(rise, [0, 1], [1080, 0]);
  const blur = interpolate(frame, [0, 40], [14, 0], {
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(rise, [0, 1], [1.06, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: '#050507'}}>
      <Img
        src={shot}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateY(${y}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
