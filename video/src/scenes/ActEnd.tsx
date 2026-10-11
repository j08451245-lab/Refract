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

// Act 4 (270f): end card on black. Logo, name, one button. One shimmer.
// Long hold.
export const ActEnd: React.FC<{logo: string}> = ({logo}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [0, 60], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, 60], [30, 0], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 55 && frame < 91 && <Audio src={staticFile('shimmer.wav')} volume={0.4} />}
      <div style={{opacity: inn, transform: `translateY(${rise}px)`, display: 'flex',
        flexDirection: 'column', alignItems: 'center'}}>
        <Img src={logo} style={{width: 170, height: 170}} />
        <div style={{marginTop: 26, fontSize: 64, fontFamily: theme.font, fontWeight: 600,
          letterSpacing: '-0.02em', color: '#fff'}}>
          Refract
        </div>
        <div style={{marginTop: 10, fontSize: 28, fontFamily: theme.font,
          color: 'rgba(255,255,255,0.55)'}}>
          refract.software
        </div>
        <div style={{marginTop: 40, fontSize: 30, fontFamily: theme.font, fontWeight: 600,
          color: '#fff', background: '#1d1d1f', padding: '20px 70px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)'}}>
          Get Refract — Free
        </div>
      </div>
    </AbsoluteFill>
  );
};
