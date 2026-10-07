import {Easing} from 'remotion';

// Refract film design system — Linear/Raycast discipline:
// expo-out for entrances, tight palette with ONE blue accent,
// staggered choreography, holds before cuts.
export const theme = {
  colors: {
    bg: '#05070d',
    bgLift: '#0a0f1e',
    ink: '#f4f6fb',
    inkDim: 'rgba(244,246,251,0.62)',
    accent: '#5b9cff',
    accentDeep: '#2563eb',
  },
  spring: {
    snappy: {damping: 16, stiffness: 170},
    smooth: {damping: 20, stiffness: 80},
    heavy: {damping: 22, stiffness: 55},
  },
  ease: {
    // expo-out: fast attack, long confident settle — the premium standard
    out: Easing.bezier(0.16, 1, 0.3, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    inOut: Easing.bezier(0.65, 0, 0.35, 1),
  },
  font: 'Inter, system-ui, sans-serif',
} as const;
