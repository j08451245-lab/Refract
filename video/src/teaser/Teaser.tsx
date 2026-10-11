import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {theme} from '../design/theme';
import {Bloom, SweepText, WordReveal} from '../design/fx';
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

const FPS = 30;
const T = 10; // teaser pace: snappier dissolves than the 48s film

// 15s cutdown: T1 hook 120f + T2 product 180f + T3 close 170f = 470f
// minus 2x10f dissolve overlap = 450f = 15.00s exact.
export const Teaser: React.FC = () => (
  <Composition id="Teaser" component={() => <TeaserVideo v={false} />} durationInFrames={450} fps={FPS} width={1920} height={1080} defaultProps={{}} />
);

export const TeaserVertical: React.FC = () => (
  <Composition id="TeaserVertical" component={() => <TeaserVideo v={true} />} durationInFrames={450} fps={FPS} width={1080} height={1920} defaultProps={{}} />
);

// ---- T1: hook condensed (120f) ----
const T1: React.FC<{v: boolean}> = ({v}) => {
  const frame = useCurrentFrame();
  const W = v ? 1080 : 1920;
  const H = v ? 78 : 96;
  const kicker = interpolate(frame, [6, 26], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rule = interpolate(frame, [22, 52], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{backgroundColor: '#000', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 92 && frame < 95 && <Audio src={staticFile('thump.wav')} volume={0.7} />}
      <Bloom delay={20} peak={0.3} size={v ? 700 : 1000} />
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `0 ${v ? 60 : 120}px`}}>
        <div style={{opacity: kicker, fontSize: v ? 22 : 26, fontFamily: theme.font, fontWeight: 600, letterSpacing: '0.32em', color: theme.colors.accent, textAlign: 'center'}}>
          REFRACT — LIVE MEETING COPILOT
        </div>
        <div style={{marginTop: 26, width: 120, height: 3, borderRadius: 2, background: theme.colors.accent, transform: `scaleX(${rule})`, transformOrigin: 'center', opacity: rule}} />
        <WordReveal text="Meetings move fast." delay={26} per={4} config={theme.spring.settle}
          style={{marginTop: 34, fontSize: H, fontWeight: 600, letterSpacing: '-0.03em', color: '#fff', fontFamily: theme.font, justifyContent: 'center', textAlign: 'center', width: W - (v ? 120 : 240)}} />
        <div style={{display: 'flex', marginTop: 6}}>
          <SweepText text="Refract thinks faster." delay={48} per={4} sweepFrames={70}
            style={{fontSize: H, fontWeight: 600, letterSpacing: '-0.03em', fontFamily: theme.font, justifyContent: 'center', textAlign: 'center', width: W - (v ? 120 : 240)}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- T2: product zoom-click compressed (180f) ----
const OFF_X = 337.2; // measured Start Refract center (1297.2, 98.25), CSS px
const OFF_Y = -441.75;
const ZOOM = 2.0;

const T2: React.FC<{v: boolean; app: string}> = ({v, app}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [0, 35], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const settle = 0.985 + inn * 0.015;
  const zin = interpolate(frame, [15, 70], [0, 1], {
    easing: theme.ease.inOut, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const zout = interpolate(frame, [120, 160], [0, 1], {
    easing: theme.ease.inOut, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  if (!v) {
    const p = zin * (1 - zout);
    const scale = 1 + (ZOOM - 1) * p;
    const pos = cursorAt(
      [
        {f: 0, x: 1750, y: 900},
        {f: 88, x: 960, y: 540, bow: -60},
        {f: 100, x: 960, y: 540},
        {f: 160, x: 1780, y: 880, bow: 60},
      ],
      frame,
    );
    const dip = interpolate(frame, [88, 98, 112], [1.5, 1.28, 1.5], {
      easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
        {frame >= 95 && frame < 98 && <Audio src={staticFile('click.wav')} volume={0.6} />}
        {frame >= 2 && frame < 5 && <Audio src={staticFile('whoosh.wav')} volume={0.28} />}
        <div style={{width: '100%', height: '100%', transformOrigin: '50% 50%', transform: `scale(${settle * scale})`, willChange: 'transform'}}>
          <div style={{width: '100%', height: '100%', transform: `translate(${-OFF_X * p}px, ${-OFF_Y * p}px)`, willChange: 'transform'}}>
            <Img src={app} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.03)'}} />
          </div>
        </div>
        {frame >= 25 && frame < 165 && <Cursor x={pos.x - 8} y={pos.y - 4} scale={dip} />}
        {frame >= 98 && frame < 118 && <ClickRipple x={960} y={540} at={98} />}
      </AbsoluteFill>
    );
  }

  // Vertical: single-wrapper viewport move over the tall crop
  // (math lives in VerticalPlate, next to the markup it drives).
  return (
    <VerticalPlate frame={frame} app={app} inn={inn} zin={zin} zout={zout} />
  );
};

// Helper kept outside JSX so the viewport math stays reviewable.
function p2(zin: number, zout: number) {
  return zin * (1 - zout);
}

const VerticalPlate: React.FC<{frame: number; app: string; inn: number; zin: number; zout: number}> = ({frame, app, inn, zin, zout}) => {
  const BS = 1920 / 1080;
  const BX = 1297.2;
  const BY = 98.25;
  const CX = 648;
  const CY = 780;
  // transform-origin 0 0: screen = plate * s + t. Lock button to (CX, CY).
  const s = BS * (1 + 0.07 * p2(zin, zout));
  const tx = CX - BX * s;
  const ty = CY - BY * s;
  const pos = cursorAt(
    [
      {f: 0, x: 980, y: 1700},
      {f: 88, x: CX, y: CY, bow: -60},
      {f: 100, x: CX, y: CY},
      {f: 160, x: 950, y: 1650, bow: 60},
    ],
    frame,
  );
  const dip = interpolate(frame, [88, 98, 112], [1.5, 1.28, 1.5], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden', opacity: inn}}>
      {frame >= 95 && frame < 98 && <Audio src={staticFile('click.wav')} volume={0.6} />}
      {frame >= 2 && frame < 5 && <Audio src={staticFile('whoosh.wav')} volume={0.28} />}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`, willChange: 'transform'}}>
        <Img src={app} style={{width: 1920, height: 1080, filter: 'saturate(1.03)'}} />
      </div>
      {frame >= 25 && frame < 165 && <Cursor x={pos.x - 8} y={pos.y - 4} scale={dip} />}
      {frame >= 98 && frame < 118 && <ClickRipple x={CX} y={CY} at={98} />}
    </AbsoluteFill>
  );
};

// ---- T3: close condensed (170f) ----
const T3: React.FC<{v: boolean; logo: string}> = ({v, logo}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [0, 45], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rise = interpolate(frame, [0, 45], [30, 0], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const priv = interpolate(frame, [8, 40], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const sweep = interpolate(frame, [70, 120], [-250, 450], {
    easing: theme.ease.inOut, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const micro = interpolate(frame, [105, 135], [0, 1], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{backgroundColor: '#000', alignItems: 'center', justifyContent: 'center'}}>
      {frame >= 50 && frame < 86 && <Audio src={staticFile('shimmer.wav')} volume={0.4} />}
      {frame >= 6 && frame < 9 && <Audio src={staticFile('thump.wav')} volume={0.5} />}
      <Bloom delay={15} peak={0.28} size={v ? 700 : 800} />
      <div style={{opacity: inn, transform: `translateY(${rise}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `0 ${v ? 40 : 0}px`}}>
        <div style={{opacity: priv, fontSize: v ? 22 : 26, fontFamily: theme.font, fontWeight: 600, letterSpacing: '0.3em', color: theme.colors.accent, textAlign: 'center'}}>
          PRIVATE BY ARCHITECTURE
        </div>
        <Img src={logo} style={{width: 150, height: 150, marginTop: 24}} />
        <div style={{marginTop: 20, fontSize: 64, fontFamily: theme.font, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff'}}>
          Refract
        </div>
        <div style={{marginTop: 8, fontSize: 28, fontFamily: theme.font, color: 'rgba(255,255,255,0.55)'}}>
          refract.software
        </div>
        <div style={{position: 'relative', overflow: 'hidden', marginTop: 36, fontSize: 30, fontFamily: theme.font, fontWeight: 600, color: '#fff', background: '#1d1d1f', padding: '20px 70px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)'}}>
          <span>Get Refract — Free</span>
          <span style={{position: 'absolute', top: 0, bottom: 0, left: sweep - 60, width: 120, background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent)', transform: 'skewX(-12deg)'}} />
        </div>
        <div style={{opacity: micro, marginTop: 22, fontSize: 24, fontFamily: theme.font, color: 'rgba(255,255,255,0.5)', textAlign: 'center'}}>
          Free to start · Bring your own key · $0 vs $149/mo rivals
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TeaserVideo: React.FC<{v: boolean}> = ({v}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Audio src={staticFile('score-teaser.wav')} volume={0.9} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <T1 v={v} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={180}>
          <T2 v={v} app={staticFile('launcher-dark.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <T3 v={v} logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
