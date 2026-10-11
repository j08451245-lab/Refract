import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {theme} from '../design/theme';
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

// Act 2 (300f): the launcher fills the frame. One slow push-in.
// One line. One click on Start Refract. Silence otherwise.
export const ActLauncher: React.FC<{app: string}> = ({app}) => {
  const frame = useCurrentFrame();

  const inn = interpolate(frame, [0, 50], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // one slow majestic push over the whole act
  const push = 1 + interpolate(frame, [0, 299], [0, 0.06], {
    easing: theme.ease.inOut,
  });

  const line = interpolate(frame, [60, 110], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // single click choreography: cursor drifts in, clicks Start Refract, leaves
  const shut = {x: 1426, y: 117}; // Start Refract button, fullscreen-cover coords
  const pos = cursorAt(
    [
      {f: 0, x: 1750, y: 900},
      {f: 130, x: shut.x, y: shut.y, bow: -60},
      {f: 165, x: shut.x, y: shut.y},
      {f: 230, x: 1780, y: 880, bow: 60},
    ],
    frame,
  );
  const onScreen = frame >= 40 && frame < 235;

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
      {frame >= 162 && frame < 165 && <Audio src={staticFile('click.wav')} volume={0.6} />}
      <Img
        src={app}
        style={{width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${push})`, filter: 'saturate(1.03)'}}
      />
      <div style={{position: 'absolute', left: 110, bottom: 92, opacity: line,
        fontSize: 52, fontFamily: theme.font, fontWeight: 500,
        letterSpacing: '-0.02em', color: '#fff',
        textShadow: '0 2px 24px rgba(0,0,0,0.6)'}}>
        Your day, already prepared.
      </div>
      {onScreen && <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.5} />}
      {frame >= 165 && frame < 185 && <ClickRipple x={shut.x} y={shut.y} at={165} />}
    </AbsoluteFill>
  );
};
