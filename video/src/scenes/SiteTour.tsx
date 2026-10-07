import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Callout} from '../components/Cursor';

// Scene 3 (300f): choreographed scroll down the homepage —
// eased glides with holds, callout chips, whooshes on each move.
const MAX_Y = 7876 - 1080; // tall shot minus viewport

export const SiteTour: React.FC<{tall: string}> = ({tall}) => {
  const frame = useCurrentFrame();

  const y = interpolate(
    frame,
    [0, 40, 110, 145, 215, 250, 298],
    [0, 0, -2050, -2050, -4300, -4300, -MAX_Y],
  );
  const scale = interpolate(frame, [0, 298], [1, 1.03]);

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {[38, 143, 248].map((f) =>
        frame >= f && frame < f + 14 ? (
          <Audio key={f} src={staticFile('whoosh.wav')} volume={0.4} />
        ) : null,
      )}
      <Img
        src={tall}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          transform: `translateY(${y}px) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      />
      <Callout x={120} y={180} at={8}>
        The invisible assistant
      </Callout>
      <Callout x={1150} y={620} at={118}>
        Built for high-stakes moments
      </Callout>
      <Callout x={700} y={780} at={253}>
        Free to start
      </Callout>
    </AbsoluteFill>
  );
};
