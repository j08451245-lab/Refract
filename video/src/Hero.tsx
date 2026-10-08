import React from 'react';
import {AbsoluteFill, Audio, Composition, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {loadFont} from '@remotion/google-fonts/Inter';
import {fade} from '@remotion/transitions/fade';
import {ActLogo} from './scenes/ActLogo';
import {ActLauncher} from './scenes/ActLauncher';
import {ActOverlay} from './scenes/ActOverlay';
import {ActEnd} from './scenes/ActEnd';
import {Grade, Grain, Vignette} from './design/fx';

loadFont('normal', {weights: ['400', '500', '600']});

const FPS = 30;
const T = 14; // slow dissolves only

export const Hero: React.FC = () => {
  return (
    <Composition
      id="Hero"
      component={HeroVideo}
      // Apple minimal: 180+300+330+270, slow dissolves overlap.
      durationInFrames={1050}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

const HeroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* near-silence bed: quiet pad under everything */}
      <Audio src={staticFile('pad.wav')} volume={0.22} loop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <ActLogo logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <ActLauncher app={staticFile('app.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={330}>
          <ActOverlay
            empty={staticFile('overlay-panel.png')}
            asked={staticFile('overlay-asked-crop.png')}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={270}>
          <ActEnd logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Grade />
      <Grain opacity={0.04} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};
