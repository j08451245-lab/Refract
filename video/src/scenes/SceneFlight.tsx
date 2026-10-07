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
import {WordReveal} from '../design/fx';
import {ClickRipple, Cursor, cursorAt} from '../components/Cursor';

// Scene 5 (360f): one continuous camera flight through floating glass cards
// on a violet stage — orbit, rack focus, kinetic text moments, and a glowing
// CTA pill the cursor clicks to finish. No cuts.
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const STARS = (() => {
  const rnd = mulberry(42);
  return Array.from({length: 70}).map(() => ({
    x: rnd() * 1920,
    y: rnd() * 1080,
    r: 1 + rnd() * 2.2,
    d: 0.15 + rnd() * 0.85,
    p: rnd() * Math.PI * 2,
  }));
})();

const expo = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -9 * t));

const Card: React.FC<{
  src: string;
  w: number;
  baseX: number;
  baseY: number;
  depth: number;
  f: number;
  glow?: string;
}> = ({src, w, baseX, baseY, depth, f, glow}) => {
  const travel = 1000;
  const x = baseX + (0.5 - f) * travel * depth;
  const y = baseY + Math.sin((f + depth) * Math.PI) * 40 * depth;
  const scale = (0.72 + depth * 0.42) * (1 + (f - 0.5) * 0.22 * depth);
  const rotY = -14 + f * 12;
  // rack focus follows the flight
  const focus = 0.15 + f * 0.75;
  const blur = Math.min(9, Math.abs(depth - focus) * 11);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, perspective: 1400,
        opacity: 1,
      }}
    >
      <div
        style={{
          transform: `rotateX(7deg) rotateY(${rotY}deg) scale(${scale})`,
          transformStyle: 'preserve-3d',
          filter: `blur(${blur.toFixed(2)}px) drop-shadow(0 30px 70px rgba(20,5,50,0.8)) drop-shadow(0 0 45px ${glow ?? 'rgba(139,92,246,0.35)'})`,
          borderRadius: 22,
          border: '1px solid rgba(196,181,253,0.35)',
          overflow: 'hidden',
        }}
      >
        <Img src={src} style={{width: '100%', display: 'block'}} />
      </div>
    </div>
  );
};

const Kinetic: React.FC<{text: string; at: number; dur: number; size?: number}> = ({
  text,
  at,
  dur,
  size = 92,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > dur) return null;
  const inn = expo(Math.min(1, local / 26));
  const outt = 1 - expo(Math.min(1, Math.max(0, (local - dur + 26) / 26)));
  const o = Math.min(inn, outt);
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center',
        opacity: o, filter: `blur(${(1 - Math.min(inn, outt)) * 12}px)`,
        transform: `translateY(${(1 - inn) * 40}px)`,
        fontSize: size, fontFamily: theme.font, fontWeight: 300,
        letterSpacing: '0.06em', color: '#fff',
        textShadow: '0 0 60px rgba(167,139,250,0.8)',
      }}
    >
      {text}
    </div>
  );
};

export const SceneFlight: React.FC<{
  private: string;
  day: string;
  memory: string;
}> = ({private: pvt, day, memory}) => {
  const frame = useCurrentFrame();
  const f = expo(Math.min(1, Math.max(0, frame / 359)));

  const pos = cursorAt(
    [
      {f: 0, x: 1700, y: 950},
      {f: 285, x: 960, y: 640, bow: -90},
      {f: 312, x: 934, y: 664},
      {f: 322, x: 960, y: 640},
    ],
    frame,
  );

  // CTA pill: far/small/blurred → center sharp
  const ctaT = expo(Math.min(1, Math.max(0, (frame - 200) / 120)));
  const ctaScale = 0.55 + ctaT * 0.45;
  const ctaBlur = (1 - ctaT) * 8;
  const ctaY = 760 - ctaT * 120;
  const clicked = frame >= 322;
  const flash = clicked ? Math.max(0, 1 - (frame - 322) / 14) : 0;

  return (
    <AbsoluteFill style={{background: '#0d0518', overflow: 'hidden'}}>
      {frame >= 60 && frame < 74 && <Audio src={staticFile('whoosh.wav')} volume={0.4} />}
      {frame >= 180 && frame < 194 && <Audio src={staticFile('whoosh.wav')} volume={0.4} />}
      {frame >= 319 && frame < 322 && <Audio src={staticFile('click.wav')} volume={0.7} />}
      {frame >= 250 && frame < 286 && <Audio src={staticFile('shimmer.wav')} volume={0.4} />}

      {/* violet nebula */}
      <div style={{position: 'absolute', width: 1500, height: 1500, borderRadius: '50%',
        left: -400 + f * 200, top: -600, filter: 'blur(90px)',
        background: 'radial-gradient(circle, rgba(109,40,217,0.5), transparent 62%)'}} />
      <div style={{position: 'absolute', width: 1100, height: 1100, borderRadius: '50%',
        right: -350 - f * 150, bottom: -500, filter: 'blur(100px)',
        background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 62%)'}} />

      {/* star dust with parallax + twinkle */}
      {STARS.map((s, i) => (
        <div key={i} style={{position: 'absolute',
          left: s.x + (0.5 - f) * 320 * s.d, top: s.y,
          width: s.r * 2, height: s.r * 2, borderRadius: '50%',
          background: '#fff', opacity: 0.25 + 0.45 * Math.abs(Math.sin(frame / 24 + s.p)) * s.d}} />
      ))}

      {/* card field: far → near */}
      <Card src={memory} w={620} baseX={-260} baseY={120} depth={0.22} f={f} />
      <Card src={pvt} w={640} baseX={240} baseY={560} depth={0.45} f={f} />
      <Card src={day} w={660} baseX={1050} baseY={130} depth={0.62} f={f}
        glow="rgba(96,165,250,0.4)" />
      <Card src={memory} w={560} baseX={1330} baseY={620} depth={0.85} f={f}
        glow="rgba(192,132,252,0.45)" />

      <Kinetic text="Invisible to every software." at={70} dur={110} />
      <Kinetic text="Think in the moment." at={195} dur={105} size={84} />

      {/* glowing CTA pill */}
      <div style={{position: 'absolute', left: 0, right: 0, top: ctaY, display: 'flex', justifyContent: 'center',
        opacity: frame < 200 ? 0 : 1, filter: `blur(${ctaBlur.toFixed(2)}px)`}}>
        <div style={{fontSize: 34, fontFamily: theme.font, fontWeight: 700, color: '#fff',
          background: clicked ? '#1f7a3d' : 'linear-gradient(180deg,#7c5cff,#5b34f0)',
          padding: '24px 72px', borderRadius: 999, transform: `scale(${ctaScale})`,
          boxShadow: `0 0 ${60 + flash * 120}px rgba(139,92,246,${0.75}), 0 18px 60px rgba(0,0,0,0.6)`,
          border: '1px solid rgba(255,255,255,0.35)'}}>
          {clicked ? '✓ Session started' : 'Start Refract — Free'}
        </div>
      </div>

      {frame >= 280 && (
        <>
          <Cursor x={pos.x - 8} y={pos.y - 4} scale={1.7} trail />
          {frame >= 322 && frame < 342 && <ClickRipple x={960} y={640} at={322} />}
        </>
      )}

      <div style={{position: 'absolute', left: 90, bottom: 70, opacity: 0.85}}>
        <WordReveal text="Your launcher, in flight." delay={20} per={4}
          style={{fontSize: 34, fontFamily: theme.font, fontWeight: 600, color: 'rgba(255,255,255,0.9)'}} />
      </div>
    </AbsoluteFill>
  );
};
