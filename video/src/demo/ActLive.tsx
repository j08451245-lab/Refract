import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../design/theme';
import {Entrance, WordReveal} from '../design/fx';
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

// Act 3 — Live (420f = 14s).
// Black stage. Real overlay centered. Cursor asks, transcript lands,
// answer streams word-by-word, latency chip pulses. One take, no cuts.
const PW = 1240;
const PX = (1920 - PW) / 2;
const PY = 285;
const SC = PW / 1400;
const SEND = {x: PX + 1310 * SC, y: PY + 475 * SC};

const TRANSCRIPT: Array<{speaker: string; text: string; at: number}> = [
  {speaker: 'INTERVIEWER', text: 'How do you think about high margin versus fast growth?', at: 95},
  {speaker: 'REFRACT · LISTENING', text: 'Dual-channel capture · system + mic · live', at: 150},
];

export const ActLive: React.FC<{empty: string; asked: string}> = ({empty, asked}) => {
  const frame = useCurrentFrame();

  const inn = interpolate(frame, [0, 50], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Seam cut as a quick dissolve, not a hard swap — velocity-matched feel.
  const askedMix = interpolate(frame, [168, 180], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // press-release-spring: cursor depresses with the target on click.
  const dip = interpolate(frame, [190, 200, 215], [1.5, 1.3, 1.5], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pos = cursorAt(
    [
      {f: 20, x: 300, y: 950},
      {f: 160, x: SEND.x, y: SEND.y, bow: -70},
      {f: 200, x: SEND.x, y: SEND.y},
      {f: 260, x: 1700, y: 800, bow: 60},
    ],
    frame,
  );

  const line = interpolate(frame, [40, 90], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Latency dot breathes: 1s period.
  const pulse = 0.55 + 0.45 * Math.sin((frame / 30) * Math.PI * 2);
  const chip = interpolate(frame, [232, 262], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
      {frame >= 197 && frame < 200 && <Audio src={staticFile('click.wav')} volume={0.6} />}
      {frame >= 2 && frame < 5 && <Audio src={staticFile('whoosh.wav')} volume={0.22} />}

      {/* kicker */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: line,
          fontSize: 26,
          fontFamily: theme.font,
          fontWeight: 600,
          letterSpacing: '0.3em',
          color: theme.colors.accent,
        }}
      >
        LIVE · INVISIBLE OVERLAY
      </div>

      {/* overlay panel — empty crossfades into asked on click */}
      <div
        style={{
          position: 'absolute',
          left: PX,
          top: PY,
          width: PW,
          filter: 'drop-shadow(0 30px 90px rgba(0,0,0,0.8))',
        }}
      >
        <Img src={empty} style={{width: '100%', display: 'block'}} />
        {askedMix > 0 && (
          <Img
            src={asked}
            style={{width: '100%', display: 'block', position: 'absolute', inset: 0, opacity: askedMix}}
          />
        )}
      </div>

      {/* transcript lines stagger above the panel — compact, never touching */}
      {TRANSCRIPT.map((t, li) => (
        <Entrance key={t.speaker} delay={t.at} rise={22} config={theme.spring.settle}>
          <div
            style={{
              position: 'absolute',
              left: (1920 - 1040) / 2,
              top: li === 0 ? 122 : 192,
              width: 1040,
              textAlign: 'center',
              fontFamily: theme.font,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '0.18em',
                color: t.speaker.startsWith('REFRACT') ? theme.colors.accent : 'rgba(255,255,255,0.55)',
              }}
            >
              {t.speaker}
            </span>
            <div style={{fontSize: 27, color: 'rgba(255,255,255,0.92)', fontWeight: 500, letterSpacing: '-0.01em', marginTop: 4}}>
              {t.text}
            </div>
          </div>
        </Entrance>
      ))}

      {/* streaming answer */}
      {frame >= 218 && (
        <div
          style={{
            position: 'absolute',
            left: (1920 - 980) / 2,
            top: PY + 520,
            width: 980,
            fontFamily: theme.font,
            textAlign: 'center',
          }}
        >
          <WordReveal
            text="High margin, slow growth — versus low margin, fast growth."
            delay={218}
            per={2}
            config={theme.spring.settle}
            style={{
              fontSize: 34,
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              justifyContent: 'center',
            }}
          />
        </div>
      )}

      {/* latency chip */}
      <div
        style={{
          position: 'absolute',
          left: (1920 - 470) / 2,
          top: PY + 624,
          width: 470,
          opacity: chip,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontFamily: theme.font,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          color: '#fff',
          background: 'rgba(20,26,40,0.82)',
          border: '1px solid rgba(91,156,255,0.4)',
          borderRadius: 999,
          padding: '12px 26px',
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#34d399',
            opacity: 0.4 + pulse * 0.6,
            boxShadow: '0 0 14px rgba(52,211,153,0.9)',
          }}
        />
        ANSWERED · &lt;500MS
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 64,
          textAlign: 'center',
          opacity: line,
          fontSize: 36,
          fontFamily: theme.font,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: 'rgba(255,255,255,0.72)',
        }}
      >
        Invisible to everyone else.
      </div>

      {frame >= 60 && frame < 265 && <Cursor x={pos.x - 8} y={pos.y - 4} scale={dip} />}
      {frame >= 200 && frame < 220 && <ClickRipple x={SEND.x} y={SEND.y} at={200} />}
    </AbsoluteFill>
  );
};
