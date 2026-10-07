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
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

// Scene 6 (330f): the invisible overlay in action — cursor clicks Ask,
// the answer types out live, then the end card rises with the CTA.
const Q = 'What is the strongest counter-argument?';
const A1 = 'High margin, slow growth — versus low margin, fast growth.';
const A2 = 'Pick the game you can win twice.';

export const OverlayFinale: React.FC<{app: string; logo: string}> = ({
  app,
  logo,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const panelIn = spring({frame, fps, config: {damping: 17, stiffness: 90}});
  const panelY = interpolate(panelIn, [0, 1], [1080, 0]);

  const qChars = Math.floor(
    interpolate(frame, [25, 105], [0, Q.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const a1o = interpolate(frame, [175, 195], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const a2o = interpolate(frame, [215, 235], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pos = cursorAt(
    [
      {f: 0, x: 300, y: 950},
      {f: 130, x: 1330, y: 560},
      {f: 175, x: 1330, y: 560},
      {f: 210, x: 1620, y: 280},
    ],
    frame,
  );
  const clicked = frame >= 150;

  // end card rises from 258
  const cardIn = spring({frame: frame - 258, fps, config: {damping: 16, stiffness: 80}});
  const cardY = interpolate(cardIn, [0, 1], [760, 0]);
  const dimBg = interpolate(frame, [258, 290], [0, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {frame >= 150 && frame < 153 ? (
        <Audio src={staticFile('click.wav')} volume={0.7} />
      ) : null}
      {frame >= 174 && frame < 180 ? (
        <Audio src={staticFile('pop.wav')} volume={0.5} />
      ) : null}
      {frame >= 214 && frame < 220 ? (
        <Audio src={staticFile('pop.wav')} volume={0.5} />
      ) : null}
      {frame >= 258 && frame < 272 ? (
        <Audio src={staticFile('whoosh.wav')} volume={0.5} />
      ) : null}

      {/* blurred launcher behind */}
      <Img
        src={app}
        style={{
          position: 'absolute',
          left: 210,
          top: 105,
          width: 1500,
          borderRadius: 18,
          filter: 'blur(10px) brightness(0.55)',
        }}
      />

      {/* overlay panel */}
      <div
        style={{
          position: 'absolute',
          left: 410,
          top: 220,
          width: 1100,
          borderRadius: 24,
          background: 'rgba(12,14,22,0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow:
            '0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(90,150,255,0.15)',
          transform: `translateY(${Math.max(0, panelY)}px) scale(${interpolate(panelIn, [0, 1], [0.94, 1])})`,
          padding: '34px 44px 40px',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />
          ))}
          <div style={{marginLeft: 12, fontSize: 24, color: 'rgba(255,255,255,0.55)', fontWeight: 500}}>
            Refract Overlay — invisible to everyone else
          </div>
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 34,
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            minHeight: 52,
          }}
        >
          {Q.slice(0, qChars)}
          {qChars < Q.length && <span style={{opacity: 0.6 + 0.4 * Math.sin(frame / 3)}}>▍</span>}
        </div>
        <div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16}}>
          <div style={{fontSize: 29, color: 'rgba(160,200,255,0.95)', opacity: a1o}}>{A1}</div>
          <div style={{fontSize: 29, color: 'rgba(255,255,255,0.92)', fontWeight: 600, opacity: a2o}}>{A2}</div>
        </div>
        <div style={{marginTop: 34, display: 'flex', justifyContent: 'flex-end'}}>
          <div
            style={{
              fontSize: 27,
              fontWeight: 700,
              color: '#fff',
              background: clicked ? '#1f7a3d' : 'linear-gradient(180deg,#3b82f6,#2563eb)',
              padding: '14px 44px',
              borderRadius: 999,
              boxShadow: '0 8px 30px rgba(59,130,246,0.45)',
            }}
          >
            {clicked ? '✓ Answered' : 'Ask'}
          </div>
        </div>
      </div>

      <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.6} />
      {frame >= 150 && frame < 172 ? (
        <ClickRipple x={1330} y={560} at={150} />
      ) : null}

      {/* dim + end card */}
      <div
        style={{position: 'absolute', inset: 0, background: '#000', opacity: dimBg, pointerEvents: 'none'}}
      />
      {frame >= 258 && (
        <div
          style={{
            position: 'absolute',
            left: 610,
            top: 240,
            width: 700,
            borderRadius: 28,
            background: 'rgba(14,16,26,0.96)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 40px 140px rgba(0,0,0,0.8), 0 0 100px rgba(90,150,255,0.22)',
            transform: `translateY(${Math.max(0, cardY)}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '56px 40px 48px',
          }}
        >
          <Img src={logo} style={{width: 150, height: 150}} />
          <div style={{marginTop: 22, fontSize: 56, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em'}}>
            Refract
          </div>
          <div style={{marginTop: 8, fontSize: 30, color: 'rgba(255,255,255,0.6)'}}>
            refract.software
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: 30,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
              padding: '18px 64px',
              borderRadius: 999,
              boxShadow: '0 10px 40px rgba(59,130,246,0.5)',
            }}
          >
            Get Refract — Free
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
