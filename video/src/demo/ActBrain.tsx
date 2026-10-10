import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../design/theme';
import {BgMesh, Entrance, WordReveal} from '../design/fx';

// Act 4 — Brain (360f = 12s).
// Bento grid on aurora mesh. Three capabilities, staggered.
// Stillness + stagger = premium. No camera move here; the grid does the work.
const CARDS = [
  {
    n: '01',
    title: 'Hears everything',
    body: 'Dual-channel capture. Their audio and your mic, separately — no room noise, no leaks.',
    chip: 'RUST · ZERO-COPY · <500MS',
  },
  {
    n: '02',
    title: 'Remembers everything',
    body: 'Every meeting indexed on your machine. Ask across all of history — “what did John say about the API?”',
    chip: 'LOCAL RAG · SQLITE-VEC',
  },
  {
    n: '03',
    title: 'Reasons with anything',
    body: 'Gemini, GPT, Claude, Groq — or fully offline with Ollama. Your keys, your models, your machine.',
    chip: 'BYOK · $0 TO START',
  },
];

export const ActBrain: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [10, 50], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const proof = interpolate(frame, [220, 260], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <BgMesh />
      {frame >= 2 && frame < 5 && <Audio src={staticFile('whoosh.wav')} volume={0.22} />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 140px',
        }}
      >
        <div
          style={{
            opacity: head,
            fontSize: 26,
            fontFamily: theme.font,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: theme.colors.accent,
          }}
        >
          NOT A WRAPPER — A SYSTEM
        </div>
        <WordReveal
          text="An intelligence system, not a chatbot."
          delay={22}
          per={3}
          config={theme.spring.settle}
          style={{
            marginTop: 18,
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: '#fff',
            fontFamily: theme.font,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        />
        <div style={{display: 'flex', gap: 28, marginTop: 56, width: '100%', maxWidth: 1560}}>
          {CARDS.map((c, i) => (
            <Entrance key={c.n} delay={95 + i * 30} rise={48} config={theme.spring.settle}>
              <div
                style={{
                  flex: 1,
                  minHeight: 480,
                  background: 'rgba(13,18,32,0.82)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 28,
                  padding: '44px 40px 36px',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
                  fontFamily: theme.font,
                }}
              >
                <div style={{fontSize: 24, fontWeight: 600, letterSpacing: '0.22em', color: theme.colors.accent}}>
                  {c.n}
                </div>
                <div style={{marginTop: 14, fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff'}}>
                  {c.title}
                </div>
                <div style={{marginTop: 14, fontSize: 27, lineHeight: 1.45, color: 'rgba(244,246,251,0.72)'}}>
                  {c.body}
                </div>
                <div
                  style={{
                    marginTop: 26,
                    display: 'inline-block',
                    fontSize: 19,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(91,156,255,0.35)',
                    background: 'rgba(91,156,255,0.1)',
                    borderRadius: 999,
                    padding: '10px 20px',
                  }}
                >
                  {c.chip}
                </div>
              </div>
            </Entrance>
          ))}
        </div>
        <div
          style={{
            opacity: proof,
            marginTop: 40,
            fontSize: 26,
            fontFamily: theme.font,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '-0.01em',
          }}
        >
          7 personas · Screen + slide OCR · Speaker labels · Fully offline capable
        </div>
      </div>
    </AbsoluteFill>
  );
};
