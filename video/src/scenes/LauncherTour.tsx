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

// Scene 5 (360f): the cursor tours the launcher — three stops with
// click ripples, zoom punches and callouts. Real app screenshot.
const SHOT_W = 1589;
const DISP_W = 1500;
const OX = 210;
const OY = 105;
const S = DISP_W / SHOT_W;
const vx = (x: number) => OX + x * S;
const vy = (y: number) => OY + y * S;

const STOPS = [
  {x: vx(1180), y: vy(145), click: 72}, // Start Refract
  {x: vx(1180), y: vy(460), click: 168}, // Connect calendar
  {x: vx(450), y: vy(930), click: 266}, // Start a session
];

export const LauncherTour: React.FC<{app: string}> = ({app}) => {
  const frame = useCurrentFrame();

  const pos = cursorAt(
    [
      {f: 0, x: 300, y: 950},
      {f: 55, x: STOPS[0].x, y: STOPS[0].y},
      {f: 120, x: STOPS[0].x, y: STOPS[0].y},
      {f: 150, x: STOPS[1].x, y: STOPS[1].y},
      {f: 215, x: STOPS[1].x, y: STOPS[1].y},
      {f: 248, x: STOPS[2].x, y: STOPS[2].y},
      {f: 310, x: STOPS[2].x, y: STOPS[2].y},
      {f: 345, x: 1620, y: 150},
    ],
    frame,
  );

  // slow push-in + punch on each click
  const base = interpolate(frame, [0, 359], [1, 1.1]);
  const punch = STOPS.reduce(
    (a, s) => a + 0.045 * Math.exp(-Math.pow((frame - s.click) / 12, 2)),
    0,
  );
  const zoom = base + punch;

  return (
    <AbsoluteFill style={{backgroundColor: '#050507', overflow: 'hidden'}}>
      {STOPS.map((s) =>
        frame >= s.click && frame < s.click + 3 ? (
          <Audio key={s.click} src={staticFile('click.wav')} volume={0.7} />
        ) : null,
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px 700px at 50% 30%, #1b2740 0%, #0a0f1e 55%, #05070d 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: OX,
          top: OY,
          width: DISP_W,
          transform: `scale(${zoom})`,
          transformOrigin: '50% 45%',
        }}
      >
        <Img
          src={app}
          style={{
            width: '100%',
            borderRadius: 18,
            boxShadow:
              '0 60px 120px rgba(0,0,0,0.65), 0 0 90px rgba(80,140,255,0.18)',
          }}
        />
      </div>
      {/* cursor lives in screen space: counter-scale so it stays constant size */}
      <div
        style={{
          position: 'absolute',
          left: (pos.x - 960) * zoom + 960,
          top: (pos.y - 540) * zoom + 540,
        }}
      >
        <Cursor x={-8} y={-4} scale={1.6} />
      </div>
      {STOPS.map((s) =>
        frame >= s.click && frame < s.click + 22 ? (
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
