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

// Scene 2 (130f): the site rises fluidly from below — blur to sharp,
// gentle scale settle, light sweep across the top edge.
export const SiteRise: React.FC<{shot: string}> = ({shot}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const rise = spring({frame: frame - 6, fps, config: {damping: 20, stiffness: 62}});
  const y = interpolate(rise, [0, 1], [1080, 0]);
  const blur = interpolate(frame, [6, 48], [16, 0], {extrapolateRight: 'clamp'});
  const scale = interpolate(rise, [0, 1], [1.07, 1]);
  const sheen = interpolate(frame, [20, 70], [-300, 2200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      <Audio src={staticFile('whoosh.wav')} volume={0.55} />
      <Img
        src={shot}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateY(${Math.max(0, y)}px) scale(${scale})`,
          filter: `blur(${Math.max(0, blur)}px)`,
        }}
      />
      {/* travelling light sheen */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          bottom: -200,
          left: sheen,
          width: 220,
          transform: 'rotate(12deg)',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
