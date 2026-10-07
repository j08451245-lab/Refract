import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Callout, ClickRipple, Cursor, cursorAt} from '../components/Cursor';
import {BgMesh} from '../design/fx';

// Scene 5 (360f): match-cut from the reveal, then the cursor tours the
// launcher — anticipation pull-backs before every click, arcs, motion-blur
// trail, zoom punches, staggered callouts.
const SHOT_W = 1589;
const DISP_W = 1500;
const OX = 210;
const OY = 105;
const S = DISP_W / SHOT_W;
const vx = (x: number) => OX + x * S;
const vy = (y: number) => OY + y * S;

const STOPS = [
  {x: vx(1180), y: vy(145), click: 72},
  {x: vx(1180), y: vy(460), click: 168},
  {x: vx(450), y: vy(930), click: 266},
];

export const LauncherTour: React.FC<{app: string}> = ({app}) => {
  const frame = useCurrentFrame();

  const pos = cursorAt(
    [
      {f: 0, x: 300, y: 950},
      {f: 48, x: STOPS[0].x - 60, y: STOPS[0].y + 44, bow: 60},
      // anticipation: wind up away, then strike
      {f: 62, x: STOPS[0].x - 26, y: STOPS[0].y + 20},
      {f: 72, x: STOPS[0].x, y: STOPS[0].y},
      {f: 118, x: STOPS[0].x, y: STOPS[0].y},
      {f: 144, x: STOPS[1].x - 120, y: STOPS[1].y - 60, bow: -70},
      {f: 158, x: STOPS[1].x - 26, y: STOPS[1].y + 20},
      {f: 168, x: STOPS[1].x, y: STOPS[1].y},
      {f: 214, x: STOPS[1].x, y: STOPS[1].y},
      {f: 240, x: STOPS[2].x + 130, y: STOPS[2].y - 80, bow: 80},
      {f: 256, x: STOPS[2].x - 26, y: STOPS[2].y + 20},
      {f: 266, x: STOPS[2].x, y: STOPS[2].y},
      {f: 310, x: STOPS[2].x, y: STOPS[2].y},
      {f: 345, x: 1620, y: 150, bow: 50},
    ],
    frame,
  );

  const base = interpolate(frame, [0, 359], [1, 1.1]);
  const punch = STOPS.reduce(
    (a, s) => a + 0.045 * Math.exp(-Math.pow((frame - s.click) / 12, 2)),
    0,
  );
  const zoom = base + punch;
  // idle breathing on the window
  const breathe = 1 + Math.sin(frame / 26) * 0.004;

  const fast =
    frame < 48 || (frame > 118 && frame < 144) || (frame > 214 && frame < 240);

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {STOPS.map((s) =>
        frame >= s.click - 3 && frame < s.click ? (
          <Audio key={s.click} src={staticFile('click.wav')} volume={0.7} />
        ) : null,
      )}
      <BgMesh />
      <div
        style={{
          position: 'absolute', left: OX, top: OY, width: DISP_W,
          transform: `scale(${zoom * breathe})`, transformOrigin: '50% 45%',
        }}
      >
        <Img
          src={app}
          style={{
            width: '100%', borderRadius: 18,
            boxShadow: '0 60px 120px rgba(0,0,0,0.65), 0 0 90px rgba(80,140,255,0.18)',
            filter: 'saturate(1.05)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: (pos.x - 960) * zoom + 960,
          top: (pos.y - 540) * zoom + 540,
        }}
      >
        <Cursor x={-8} y={-4} scale={1.6} trail={fast} />
      </div>
      {STOPS.map((s) =>
        frame >= s.click && frame < s.click + 20 ? (
          <ClickRipple
            key={s.click}
            x={(s.x - 960) * zoom + 960}
            y={(s.y - 540) * zoom + 540}
            at={s.click}
          />
        ) : null,
      )}
      <Callout x={880} y={120} at={78}>
        One click starts a session
      </Callout>
      <Callout x={880} y={420} at={174}>
        Calendar in one click
      </Callout>
      <Callout x={760} y={700} at={272}>
        Memory that writes itself
      </Callout>
    </AbsoluteFill>
  );
};
