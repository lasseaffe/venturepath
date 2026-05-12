import { Identity } from './moodboard/sections/Identity';
import { ColorPalette } from './moodboard/sections/ColorPalette';
import { Typography } from './moodboard/sections/Typography';
import { SpacingRadii } from './moodboard/sections/SpacingRadii';
import { ComponentSamples } from './moodboard/sections/ComponentSamples';
import { PatternsAndModes } from './moodboard/sections/PatternsAndModes';
import { VoiceAndTone } from './moodboard/sections/VoiceAndTone';
import { DoDont } from './moodboard/sections/DoDont';
import { Iconography } from './moodboard/sections/Iconography';
import { Motion } from './moodboard/sections/Motion';
import { ChangeLogPreview } from './moodboard/sections/ChangeLogPreview';

const TOC = [
  { id: 'identity',   label: 'Identity' },
  { id: 'color',      label: 'Color' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing',    label: 'Spacing & Radii' },
  { id: 'components', label: 'Components' },
  { id: 'modes',      label: 'Patterns & Modes' },
  { id: 'voice',      label: 'Voice & Tone' },
  { id: 'dodont',     label: "Do / Don't" },
  { id: 'icons',      label: 'Iconography' },
  { id: 'motion',     label: 'Motion' },
  { id: 'changelog',  label: 'Change Log' },
];

// APPLE-RISK note: This view satisfies VP minimum-functionality (Apple 4.2) —
// three+ interactive elements: theme cycle, motion replay buttons, ledger
// navigation, plus live mode switching. Voice section enumerates the VP-1
// vocabulary contract from APPLE_COMPLIANCE.md.
export default function Moodboard({ onBackToDashboard }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>
              VenturePath · Living Design Spec
            </p>
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="text-[10px] uppercase"
                style={{ color: 'var(--text-secondary)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.2em' }}
              >
                ← Basecamp
              </button>
            )}
          </div>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.05 }}>
            Modern Nomad
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
            Reads from the same CSS variables, fonts, and themes the rest of VenturePath uses. If something here looks wrong, the live design system is wrong — fix it there, and this view updates.
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          <nav className="hidden lg:block sticky top-10 self-start">
            <p className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>Contents</p>
            <ul className="space-y-1">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-[12px] hover:underline" style={{ color: 'var(--text-primary)' }}>
                    <span className="mr-2" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>§{String(i + 1).padStart(2, '0')}</span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Identity />
            <ColorPalette />
            <Typography />
            <SpacingRadii />
            <ComponentSamples />
            <PatternsAndModes />
            <VoiceAndTone />
            <DoDont />
            <Iconography />
            <Motion />
            <ChangeLogPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
