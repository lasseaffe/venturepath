"use client";
import { OnboardingEngine } from './OnboardingEngine';
import { hfOnboardingConfig } from '@/config/holyflex.onboarding.config';

export function OnboardingProvider() {
  return <OnboardingEngine config={hfOnboardingConfig} />;
}
