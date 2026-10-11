import React from 'react';
import {registerRoot} from 'remotion';
import {Hero} from './Hero';
import {Demo} from './demo/Demo';
import {Teaser, TeaserVertical} from './teaser/Teaser';

const RemotionRoot: React.FC = () => {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Hero),
    React.createElement(Demo),
    React.createElement(Teaser),
    React.createElement(TeaserVertical),
  );
};

registerRoot(RemotionRoot);
