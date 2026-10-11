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

// Act 3 (330f): black stage. The real overlay, large and centered.
// Cursor clicks Ask. One answer line fades in. One line of type.
const PW = 1240;
const PX = (1920 - PW) / 2;
const PY = 300;
const SC = PW / 1400;
const SEND = {x: PX + 1310 * SC, y: PY + 475 * SC};

export const ActOverlay: React.FC<{empty: string; asked: string}> = ({empty, asked}) => {
  const frame = useCurrentFrame();

  const inn = interpolate(frame, [0, 55], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const askedOn = frame >= 150;

  const pos = cursorAt(
    [
      {f: 20, x: 300, y: 950},
      {f: 150, x: SEND.x, y: SEND.y, bow: -70},
      {f: 195, x: SEND.x, y: SEND.y},
      {f: 245, x: 1700, y: 800, bow: 60},
    ],
    frame,
  );

  const ans = interpolate(frame, [205, 250], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const line = interpolate(frame, [70, 120], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
      {frame >= 192 && frame < 195 && <Audio src={staticFile('click.wav')} volume={0.6} />}
      <div style={{position: 'absolute', left: PX, top: PY, width: PW,
        filter: 'drop-shadow(0 30px 90px rgba(0,0,0,0.8))'}}>
        <Img src={askedOn ? asked : empty} style={{width: '100%', display: 'block'}} />
      </div>
      {ans > 0 && (
        <div style={{position: 'absolute', left: (1920 - 980) / 2, top: PY + 585, width: 980,
          opacity: ans, fontFamily: theme.font, textAlign: 'center'}}>
          <div style={{fontSize: 34, color: 'rgba(255,255,255,0.95)', fontWeight: 500,
            letterSpacing: '-0.01em'}}>
            High margin, slow growth — versus low margin, fast growth.
          </div>
        </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 88, textAlign: 'center',
        opacity: line, fontSize: 40, fontFamily: theme.font, fontWeight: 400,
        letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.75)'}}>
        Invisible to everyone else.
      </div>
      {frame >= 60 && <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.5} />}
      {frame >= 195 && frame < 215 && <ClickRipple x={SEND.x} y={SEND.y} at={195} />}
    </AbsoluteFill>
  );
};
