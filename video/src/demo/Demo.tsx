import React from 'react';
import {AbsoluteFill, Audio, Composition, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {ActHook} from './ActHook';
import {ActProduct} from './ActProduct';
import {ActLive} from './ActLive';
import {ActBrain} from './ActBrain';
import {ActClose} from './ActClose';
import {Grade, Grain, Vignette} from '../design/fx';

const FPS = 30;
const T = 14; // slow dissolves only — one transition language for the whole film

// Refract product demo — 50s @30fps.
// 150 + 270 + 420 + 360 + 300 = 1500 frames of sequences,
// minus 4 x 14f dissolve overlap = 1444 frames total.
export const Demo: React.FC = () => {
  return (
    <Composition
      id="Demo"
      component={DemoVideo}
      durationInFrames={1444}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* original score: chord-per-act bed, exact film duration, no loop */}
      <Audio src={staticFile('score.wav')} volume={0.9} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <ActHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={270}>
          <ActProduct app={staticFile('launcher-dark.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={420}>
          <ActLive empty={staticFile('overlay-real-empty.png')} asked={staticFile('overlay-real-asked.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={360}>
          <ActBrain />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <ActClose logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Grade />
      <Grain opacity={0.04} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};
