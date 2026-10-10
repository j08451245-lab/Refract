import React from 'react';
import {registerRoot} from 'remotion';
import {Hero} from './Hero';
import {Demo} from './demo/Demo';

const RemotionRoot: React.FC = () => {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Hero),
    React.createElement(Demo),
  );
};

registerRoot(RemotionRoot);
