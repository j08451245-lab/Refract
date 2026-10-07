import React from 'react';
import {AbsoluteFill, Audio, Composition, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {LogoReveal} from './scenes/LogoReveal';
import {SiteRise} from './scenes/SiteRise';
import {SiteTour} from './scenes/SiteTour';
import {DesktopReveal} from './scenes/DesktopReveal';
import {LauncherTour} from './scenes/LauncherTour';
import {OverlayFinale} from './scenes/OverlayFinale';

const FPS = 30;
const T = 12; // transition overlap frames

export const Hero: React.FC = () => {
  return (
    <Composition
      id="Hero"
      component={HeroVideo}
      // 160+130+300+130+360+330 sequences; 12f transitions overlap
      // (shared frames), so total = 1410 - 5*12 = 1350.
      durationInFrames={1350}
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
      {/* quiet ambient bed under the whole film */}
      <Audio src={staticFile('pad.wav')} volume={0.32} loop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={160}>
          <LogoReveal logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <SiteRise shot={staticFile('site-hero.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={300}>
          <SiteTour tall={staticFile('site-tall.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <DesktopReveal site={staticFile('site-hero.png')} app={staticFile('app.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={360}>
          <LauncherTour app={staticFile('app.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={330}>
          <OverlayFinale app={staticFile('app.png')} logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
