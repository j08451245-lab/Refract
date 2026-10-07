import React from 'react';
import {AbsoluteFill, Composition, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {LogoReveal} from './scenes/LogoReveal';
import {SiteRise} from './scenes/SiteRise';

const FPS = 30;

export const Hero: React.FC = () => {
  return (
    <Composition
      id="Hero"
      component={HeroVideo}
      durationInFrames={300}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

// Scene 1: logo reveal (0-150) -> Scene 2: site rises (135-300, 15f overlap fade)
const HeroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#050507'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <LogoReveal logo={staticFile('logo.png')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: 15})}
        />
        <TransitionSeries.Sequence durationInFrames={165}>
          <SiteRise shot={staticFile('site-hero.png')} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
