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

// Act 1 (180f): black. One second of silence. Logo fades in slowly.
// One deep hit. Tagline once. Nothing else.
export const ActLogo: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [30, 90], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = 0.92 + appear * 0.08;
  const tag = interpolate(frame, [100, 140], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 28 && frame < 31 && <Audio src={staticFile('thump.wav')} volume={0.85} />}
      <div style={{opacity: appear, transform: `scale(${scale})`, display: 'flex',
        flexDirection: 'column', alignItems: 'center'}}>
        <Img src={logo} style={{width: 260, height: 260}} />
        <div style={{marginTop: 44, fontSize: 44, fontFamily: theme.font, fontWeight: 400,
          letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.92)', opacity: tag}}>
          Think faster.
        </div>
      </div>
    </AbsoluteFill>
  );
};
