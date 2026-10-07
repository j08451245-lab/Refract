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
import {theme} from '../design/theme';
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';
import {Entrance} from '../design/fx';

// Scene 6 (330f): inhale, overlay rises expo, question types, answers
// stagger-blur in, Ask flips to Answered, CTA scales through with
// kinetic letters. Breathing hold to the end.
const Q = 'What is the strongest counter-argument?';
const A1 = 'High margin, slow growth — versus low margin, fast growth.';
const A2 = 'Pick the game you can win twice.';

export const OverlayFinale: React.FC<{app: string; logo: string}> = ({app, logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // inhale: bg scales down 6f before the panel releases (anticipation)
  const inhale = interpolate(frame, [0, 8], [1, 0.965], {
    easing: theme.ease.in,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = Math.min(1, Math.max(0, (frame - 8) / 46));
  const panelE = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
  const panelY = (1 - panelE) * 1080;

  const qChars = Math.floor(
    interpolate(frame, [30, 110], [0, Q.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const typing = qChars < Q.length;

  const pos = cursorAt(
    [
      {f: 0, x: 300, y: 950},
      {f: 128, x: 1330, y: 560, bow: 60},
      {f: 142, x: 1304, y: 580},
      {f: 152, x: 1330, y: 560},
      {f: 196, x: 1330, y: 560},
      {f: 230, x: 1620, y: 280, bow: -50},
    ],
    frame,
  );
  const answered = frame >= 152;

  // CTA scale-through entrance
  const ct = Math.min(1, Math.max(0, (frame - 256) / 30));
  const ctE = ct <= 0 ? 0 : ct >= 1 ? 1 : 1 - Math.pow(2, -8 * ct);
  const cardScale = 1.22 - ctE * 0.22;
  const cardO = interpolate(frame, [256, 268], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dimBg = interpolate(frame, [256, 288], [0, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardBreathe = 1 + Math.sin((frame - 290) / 30) * 0.006;

  const title = 'Refract';

  return (
    <AbsoluteFill style={{backgroundColor: '#0d0518', overflow: 'hidden'}}>
      {frame >= 5 && frame < 8 && <Audio src={staticFile('thump.wav')} volume={0.5} />}
      {frame >= 149 && frame < 152 && <Audio src={staticFile('click.wav')} volume={0.7} />}
      {frame >= 172 && frame < 178 && <Audio src={staticFile('pop.wav')} volume={0.5} />}
      {frame >= 212 && frame < 218 && <Audio src={staticFile('pop.wav')} volume={0.5} />}
      {frame >= 253 && frame < 267 && <Audio src={staticFile('whoosh.wav')} volume={0.5} />}

      <div style={{position: 'absolute', width: 1400, height: 1400, borderRadius: '50%',
        left: 260, top: -650, filter: 'blur(90px)', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(109,40,217,0.4), transparent 62%)'}} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${inhale})`}}>
        <Img
          src={app}
          style={{
            position: 'absolute', left: 210, top: 105, width: 1500, borderRadius: 18,
            filter: 'blur(10px) brightness(0.55) saturate(1.05)',
          }}
        />
      </div>

      {/* overlay panel */}
      <div
        style={{
          position: 'absolute', left: 410, top: 220, width: 1100, borderRadius: 24,
          background: 'rgba(12,14,22,0.9)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(90,150,255,0.15)',
          transform: `translateY(${Math.max(0, panelY)}px) scale(${0.94 + panelE * 0.06})`,
          padding: '34px 44px 40px',
          fontFamily: theme.font,
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
        <div style={{marginTop: 30, fontSize: 34, color: '#fff', fontWeight: 600, letterSpacing: '-0.01em', minHeight: 52}}>
          {Q.slice(0, qChars)}
          {typing && <span style={{opacity: 0.5 + 0.5 * Math.sin(frame / 3)}}>▍</span>}
        </div>
        <div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16}}>
          {[A1, A2].map((a, i) => {
            const at = 176 + i * 40;
            const p = spring({frame: frame - at, fps, config: theme.spring.snappy});
            if (p <= 0) return <div key={i} style={{minHeight: 40}} />;
            return (
              <div
                key={i}
                style={{
                  fontSize: 29, color: i === 0 ? 'rgba(160,200,255,0.95)' : 'rgba(255,255,255,0.92)',
                  fontWeight: i === 1 ? 600 : 400, opacity: p,
                  filter: `blur(${interpolate(p, [0, 1], [8, 0])}px)`,
                  transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)`,
                }}
              >
                {a}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 34, display: 'flex', justifyContent: 'flex-end'}}>
          <div
            style={{
              fontSize: 27, fontWeight: 700, color: '#fff',
              background: answered ? '#1f7a3d' : 'linear-gradient(180deg,#3b82f6,#2563eb)',
              padding: '14px 44px', borderRadius: 999,
              boxShadow: answered ? '0 8px 30px rgba(31,122,61,0.45)' : '0 8px 30px rgba(59,130,246,0.45)',
              transform: answered ? 'scale(1)' : 'scale(1)',
            }}
          >
            {answered ? '✓ Answered' : 'Ask'}
          </div>
        </div>
      </div>

      <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.6} />
      {frame >= 152 && frame < 172 && <ClickRipple x={1330} y={560} at={152} />}

      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dimBg}} />
      {frame >= 256 && (
        <div
          style={{
            position: 'absolute', left: 610, top: 240, width: 700, borderRadius: 28,
            background: 'rgba(14,16,26,0.96)', border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 40px 140px rgba(0,0,0,0.8), 0 0 100px rgba(90,150,255,0.22)',
            opacity: cardO, transform: `scale(${(cardScale * cardBreathe).toFixed(4)})`,
            transformOrigin: '50% 50%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '56px 40px 48px', fontFamily: theme.font,
          }}
        >
          <Img src={logo} style={{width: 150, height: 150, filter: 'drop-shadow(0 0 50px rgba(100,160,255,0.5))'}} />
          <div style={{marginTop: 22, display: 'flex', fontSize: 58, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em'}}>
            {title.split('').map((ch, i) => {
              const p = spring({frame: frame - 272 - i * 2, fps, config: theme.spring.snappy});
              return (
                <span key={i} style={{display: 'inline-block', opacity: Math.max(0, p),
                  transform: `translateY(${interpolate(Math.max(0, p), [0, 1], [26, 0])}px)`}}>
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{marginTop: 10, fontSize: 30, color: 'rgba(255,255,255,0.6)',
            letterSpacing: `${interpolate(frame, [286, 320], [0.08, 0.01], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}em`}}>
            refract.software
          </div>
          <Entrance delay={300} rise={26}>
            <div style={{marginTop: 34, fontSize: 30, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(180deg,#3b82f6,#2563eb)', padding: '18px 64px',
              borderRadius: 999, boxShadow: '0 10px 40px rgba(59,130,246,0.5)'}}>
              Get Refract — Free
            </div>
          </Entrance>
        </div>
      )}
    </AbsoluteFill>
  );
};
