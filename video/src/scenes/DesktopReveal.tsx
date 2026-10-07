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

// Scene 4 (130f): the site sinks away blurred; a deep stage fades in
// and the launcher window rises with a soft floor shadow.
export const DesktopReveal: React.FC<{site: string; app: string}> = ({
  site,
  app,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // outgoing site: sink + blur + dim (first 45f)
  const sink = interpolate(frame, [0, 45], [0, 700], {
    extrapolateRight: 'clamp',
  });
  const sinkBlur = interpolate(frame, [0, 45], [0, 18], {
    extrapolateRight: 'clamp',
  });
  const sinkDim = interpolate(frame, [0, 45], [1, 0], {
    extrapolateRight: 'clamp',
  });

  // stage fades in behind
  const stage = interpolate(frame, [15, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // launcher window rises (starts 35f)
  const rise = spring({frame: frame - 35, fps, config: {damping: 19, stiffness: 60}});
  const wy = interpolate(rise, [0, 1], [1080, 0]);
  const shadow = interpolate(rise, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      <Audio src={staticFile('whoosh.wav')} volume={0.55} />
      <Img
        src={site}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateY(${sink}px)`,
          filter: `blur(${sinkBlur}px)`,
          opacity: sinkDim,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: stage,
          background:
            'radial-gradient(1200px 700px at 50% 30%, #1b2740 0%, #0a0f1e 55%, #05070d 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 210,
          top: 105,
          width: 1500,
          transform: `translateY(${Math.max(0, wy)}px)`,
          opacity: stage,
        }}
      >
        <Img
          src={app}
          style={{
            width: '100%',
            borderRadius: 18,
            boxShadow: `0 ${60 * shadow}px ${120 * shadow}px rgba(0,0,0,${0.65 * shadow}), 0 0 ${90 * shadow}px rgba(80,140,255,${0.18 * shadow})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
