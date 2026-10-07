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
import {Callout} from '../components/Cursor';
import {WordReveal} from '../design/fx';

// Scene 3 (300f): three jump-cut beats across the homepage — hero,
// "undetectable", people-search — whip-panned between. No dead scroll.
const BEATS = [
  {y: 0, dur: 96}, // hero
  {y: 3350, dur: 96}, // Poof. Completely undetectable
  {y: 1700, dur: 108}, // gradient art + people search
];
const WHIP = 8;

function expo(t: number) {
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
}

const Beat: React.FC<{
  tall: string;
  y: number;
  start: number;
  dur: number;
  first: boolean;
  last: boolean;
  children?: React.ReactNode;
}> = ({tall, y, start, dur, first, last, children}) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  if (local < 0 || local >= dur) return null;

  // whip out at the end / whip in at the start
  const outT = last ? 0 : interpolate(local, [dur - WHIP, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const inT = first ? 0 : interpolate(local, [0, WHIP], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = -outT * outT * 560 + inT * inT * 560;
  const blur = Math.max(outT, inT) * 13;

  // slow push inside the beat
  const pushT = Math.min(1, Math.max(0, local / dur));
  const scale = 1 + expo(pushT) * 0.045;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Img
        src={tall}
        style={{
          position: 'absolute', top: -y, left: 0, width: 1920,
          transform: `translateX(${x}px) scale(${scale})`,
          transformOrigin: '50% 40%',
          filter: `blur(${blur}px) saturate(1.05)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export const SiteTour: React.FC<{tall: string}> = ({tall}) => {
  const frame = useCurrentFrame();
  const b0 = 0;
  const b1 = BEATS[0].dur;
  const b2 = b1 + BEATS[1].dur;
  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {[b1 - 3, b2 - 3].map((f) =>
        frame >= f && frame < f + 14 ? (
          <Audio key={f} src={staticFile('whoosh.wav')} volume={0.5} />
        ) : null,
      )}
      <Beat tall={tall} y={BEATS[0].y} start={b0} dur={BEATS[0].dur} first last={false}>
        <div style={{position: 'absolute', left: 90, bottom: 90,
          background: 'rgba(8,10,18,0.72)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, padding: '20px 30px'}}>
          <WordReveal text="Invisible by design." delay={8} per={4}
            style={{fontSize: 44, fontFamily: theme.font, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff'}} />
        </div>
      </Beat>
      <Beat tall={tall} y={BEATS[1].y} start={b1} dur={BEATS[1].dur} first={false} last={false}>
        <Callout x={1130} y={200} at={b1 + 14}>
          Invisible to every software
        </Callout>
      </Beat>
      <Beat tall={tall} y={BEATS[2].y} start={b2} dur={BEATS[2].dur} first={false} last>
        <Callout x={250} y={760} at={b2 + 14}>
          Knows your day before it starts
        </Callout>
      </Beat>
    </AbsoluteFill>
  );
};
