import React from 'react';
import {AbsoluteFill, Audio, Composition, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {loadFont} from '@remotion/google-fonts/Inter';
import {fade} from '@remotion/transitions/fade';
import {LogoReveal} from './scenes/LogoReveal';
import {DesktopReveal} from './scenes/DesktopReveal';
import {SceneFlight} from './scenes/SceneFlight';
import {OverlayFinale} from './scenes/OverlayFinale';
import {Grade, Grain, Vignette} from './design/fx';

loadFont('normal', {weights: ['500', '600', '700']});

const FPS = 30;
const T = 12;

export const Hero: React.FC = () => {
  return (
    <Composition
      id="Hero"
      component={HeroVideo}
      // sequences 160+130+360+330; 12f fades overlap: total = 980 - 3*10 = 950.
      durationInFrames={950}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

const HeroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#050507'}}>
      <Audio src={staticFile('music-mornings.mp3')} volume={0.42} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={160}>
          <LogoReveal logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <DesktopReveal app={staticFile('app.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={360}>
          <SceneFlight
            private={staticFile('cards/card-private.png')}
            day={staticFile('cards/card-day.png')}
            memory={staticFile('cards/card-memory.png')}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={330}>
          <OverlayFinale
            app={staticFile('app.png')}
            empty={staticFile('overlay-panel.png')}
            asked={staticFile('overlay-asked-crop.png')}
            logo={staticFile('logo.png')}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {/* film finish, always on top: grade, grain, vignette */}
      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
