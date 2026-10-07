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

// Scene 6 (330f): the REAL overlay — captured from the running app.
// Empty panel rises, cursor clicks the real input, match-cut to the
// asked state (pixel-identical), cursor sends, answer card springs in,
// end card closes the film.
const A1 = 'High margin, slow growth — versus low margin, fast growth.';
const A2 = 'Pick the game you can win twice.';

// panel geometry: crop is 1440x660, displayed at 1100 wide
const PW = 1100;
const PX = (1920 - PW) / 2;
const PY = 240;
const SC = PW / 1400; // crop css scale (dev px / 2)
const INPUT = {x: PX + 705 * SC, y: PY + 285 * SC};
const SEND = {x: PX + 1310 * SC, y: PY + 475 * SC};

export const OverlayFinale: React.FC<{
  app: string;
  empty: string;
  asked: string;
  logo: string;
}> = ({app, empty, asked, logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const inhale = interpolate(frame, [0, 8], [1, 0.965], {
    easing: theme.ease.in,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const t = Math.min(1, Math.max(0, (frame - 8) / 46));
  const panelE = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
  const panelY = (1 - panelE) * 1080;

  // match-cut: empty -> asked right after the "typing" ticks
  const askedOn = frame >= 145;

  const pos = cursorAt(
    [
      {f: 0, x: 300, y: 950},
      {f: 105, x: INPUT.x, y: INPUT.y, bow: 70},
      {f: 140, x: INPUT.x, y: INPUT.y},
      {f: 175, x: SEND.x, y: SEND.y, bow: -60},
      {f: 200, x: SEND.x, y: SEND.y},
      {f: 235, x: 1620, y: 280, bow: -50},
    ],
    frame,
  );

  // answer card springs below the real panel
  const ansP = spring({frame: frame - 222, fps, config: theme.spring.snappy});

  // end card
  const ct = Math.min(1, Math.max(0, (frame - 262) / 30));
  const ctE = ct <= 0 ? 0 : ct >= 1 ? 1 : 1 - Math.pow(2, -8 * ct);
  const cardO = interpolate(frame, [262, 274], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dimBg = interpolate(frame, [262, 294], [0, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardBreathe = 1 + Math.sin((frame - 296) / 30) * 0.006;
  const title = 'Refract';

  return (
    <AbsoluteFill style={{backgroundColor: '#0d0518', overflow: 'hidden'}}>
      {frame >= 45 && frame < 48 && <Audio src={staticFile('thump.wav')} volume={0.5} />}
      {frame >= 112 && frame < 115 && <Audio src={staticFile('click.wav')} volume={0.7} />}
      {[124, 131, 138].map((f) =>
        frame >= f && frame < f + 2 ? (
          <Audio key={f} src={staticFile('click.wav')} volume={0.35} />
        ) : null,
      )}
      {frame >= 207 && frame < 210 && <Audio src={staticFile('click.wav')} volume={0.7} />}
      {frame >= 228 && frame < 234 && <Audio src={staticFile('pop.wav')} volume={0.5} />}
      {frame >= 259 && frame < 273 && <Audio src={staticFile('whoosh.wav')} volume={0.5} />}

      <div style={{position: 'absolute', width: 1400, height: 1400, borderRadius: '50%',
        left: 260, top: -650, filter: 'blur(90px)',
        background: 'radial-gradient(circle, rgba(109,40,217,0.4), transparent 62%)'}} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${inhale})`}}>
        <Img src={app} style={{position: 'absolute', left: 210, top: 105, width: 1500,
          borderRadius: 18, filter: 'blur(10px) brightness(0.55) saturate(1.05)'}} />
      </div>

      {/* the real overlay */}
      <div style={{position: 'absolute', left: PX, top: PY + Math.max(0, panelY), width: PW,
        filter: 'drop-shadow(0 40px 100px rgba(0,0,0,0.65))'}}>
        <Img src={askedOn ? asked : empty} style={{width: '100%', display: 'block'}} />
      </div>

      <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.6} />
      {frame >= 115 && frame < 135 && <ClickRipple x={INPUT.x} y={INPUT.y} at={115} />}
      {frame >= 210 && frame < 230 && <ClickRipple x={SEND.x} y={SEND.y} at={210} />}

      {/* answer card in matching glass */}
      {ansP > 0 && (
        <div style={{position: 'absolute', left: 510, top: PY + 504 + 26, width: 900,
          borderRadius: 20, background: 'rgba(12,14,22,0.92)', backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(90,150,255,0.12)',
          padding: '28px 38px', fontFamily: theme.font,
          opacity: ansP, transform: `translateY(${interpolate(ansP, [0, 1], [30, 0])}px)`,
        }}>
          <div style={{fontSize: 27, color: 'rgba(160,200,255,0.95)'}}>{A1}</div>
          <div style={{marginTop: 12, fontSize: 27, color: 'rgba(255,255,255,0.92)', fontWeight: 600}}>{A2}</div>
        </div>
      )}

      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dimBg}} />
      {frame >= 262 && (
        <div style={{position: 'absolute', left: 610, top: 240, width: 700, borderRadius: 28,
          background: 'rgba(14,16,26,0.96)', border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 40px 140px rgba(0,0,0,0.8), 0 0 100px rgba(124,92,246,0.3)',
          opacity: cardO, transform: `scale(${((1.22 - ctE * 0.22) * cardBreathe).toFixed(4)})`,
          transformOrigin: '50% 50%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '56px 40px 48px', fontFamily: theme.font}}>
          <Img src={logo} style={{width: 150, height: 150, filter: 'drop-shadow(0 0 50px rgba(139,92,246,0.55))'}} />
          <div style={{marginTop: 22, display: 'flex', fontSize: 58, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em'}}>
            {title.split('').map((ch, i) => {
              const p = spring({frame: frame - 278 - i * 2, fps, config: theme.spring.snappy});
              return (
                <span key={i} style={{display: 'inline-block', opacity: Math.max(0, p),
                  transform: `translateY(${interpolate(Math.max(0, p), [0, 1], [26, 0])}px)`}}>{ch}</span>
              );
            })}
          </div>
          <div style={{marginTop: 10, fontSize: 30, color: 'rgba(255,255,255,0.6)',
            letterSpacing: `${interpolate(frame, [292, 326], [0.08, 0.01], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}em`}}>
            refract.software
          </div>
          <Entrance delay={306} rise={26}>
            <div style={{marginTop: 34, fontSize: 30, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(180deg,#7c5cff,#5b34f0)', padding: '18px 64px',
              borderRadius: 999, boxShadow: '0 10px 40px rgba(124,92,246,0.55)'}}>
              Get Refract — Free
            </div>
          </Entrance>
        </div>
      )}
    </AbsoluteFill>
  );
};
