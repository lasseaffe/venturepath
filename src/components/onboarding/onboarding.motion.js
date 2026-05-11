// src/components/onboarding/onboarding.motion.js

export const MOTION_PRESETS = {
  smooth: {
    cardVariants: {
      initial:  { opacity: 0, y: 18 },
      animate:  { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
      exit:     { opacity: 0, y: -12, transition: { duration: 0.4 } },
    },
    cardHover:  { y: -2 },
    cardSelect: { y: -2 },
    stepTransition: { type: 'tween', duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
  snappy: {
    cardVariants: {
      initial:  { opacity: 0, scale: 0.88 },
      animate:  { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
      exit:     { opacity: 0, scale: 0.94, transition: { duration: 0.15 } },
    },
    cardHover:  { scale: 1.03 },
    cardSelect: { scale: 1.06 },
    stepTransition: { type: 'spring', stiffness: 350, damping: 30 },
  },
  terminal: {
    // framer-motion drives screen transitions only; cards use CSS steps()
    cardVariants: {
      initial:  { opacity: 0 },
      animate:  { opacity: 1, transition: { duration: 0.05 } },
      exit:     { opacity: 0, transition: { duration: 0.05 } },
    },
    cardHover:  {},
    cardSelect: {},
    stepTransition: { type: 'tween', duration: 0.08 },
    // Apply CSS class 'vp-terminal-card' to cards: transition: all 0.12s steps(3, end)
  },
}
