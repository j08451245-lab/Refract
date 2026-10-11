import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../design/theme';
import {Bloom, SweepText, WordReveal} from '../design/fx';

// Act 1 — Hook (150f @30fps = 5s).
// Black stage. Kicker, two-line kinetic headline, one sub.
// Discipline: words land staggered, then HOLD. Nothing else moves.
export const ActHook: React.FC = () => {
  const frame = useCurrentFrame();

  const kicker = interpolate(frame, [8, 34], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rule = interpolate(frame, [30, 70], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sub = interpolate(frame, [86, 116], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Bloom delay={30} peak={0.3} size={1000} />
      {/* deep punctuation as the accent line lands */}
      {frame >= 102 && frame < 105 && <Audio src={staticFile('thump.wav')} volume={0.7} />}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 120px'}}>
        <div
          style={{
            opacity: kicker,
            fontSize: 26,
            fontFamily: theme.font,
            fontWeight: 600,
            letterSpacing: '0.32em',
            color: theme.colors.accent,
          }}
        >
          REFRACT — LIVE MEETING COPILOT
        </div>
        <div
          style={{
            marginTop: 26,
            width: 120,
            height: 3,
            borderRadius: 2,
            background: theme.colors.accent,
            transform: `scaleX(${rule})`,
            transformOrigin: 'center',
            opacity: rule,
          }}
        />
        <WordReveal
          text="Meetings move fast."
          delay={34}
          per={4}
          config={theme.spring.settle}
          style={{
            marginTop: 34,
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: '#fff',
            fontFamily: theme.font,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        />
        <div style={{display: 'flex', marginTop: 6}}>
          <SweepText
            text="Refract thinks faster."
            delay={62}
            per={4}
            sweepFrames={130}
            style={{
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              fontFamily: theme.font,
              justifyContent: 'center',
              textAlign: 'center',
            }}
          />
        </div>
        <div
          style={{
            opacity: sub,
            marginTop: 30,
            fontSize: 32,
            fontFamily: theme.font,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.62)',
          }}
        >
          Real-time answers. Invisible overlay. Private by design.
        </div>
      </div>
    </AbsoluteFill>
  );
};
