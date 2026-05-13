import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useExpeditionList } from '../../hooks/useExpeditionList';
import NewTripModal from './NewTripModal';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import ReframableImage from '../shared/ReframableImage';
import ImageAttribution from '../ui/ImageAttribution';
import ReportButton from '../inspire/ReportButton';
import AppShell from '../layout/AppShell';

// ── Trip-type detection ────────────────────────────────────────────────────────
const CITY_KEYWORDS = ['hamburg', 'berlin', 'paris', 'london', 'tokyo', 'new york', 'rome', 'amsterdam', 'barcelona', 'madrid', 'lisbon', 'vienna', 'prague', 'warsaw', 'budapest', 'city', 'downtown', 'metro', 'lille', 'flensburg'];
const BEACH_KEYWORDS = ['beach', 'island', 'coast', 'bay', 'cancun', 'maldives', 'hawaii', 'bali', 'phuket', 'ibiza', 'santorini', 'caribbean', 'riviera'];
const MOUNTAIN_KEYWORDS = ['patagonia', 'alps', 'himalaya', 'rockies', 'andes', 'dolomites', 'summit', 'peak', 'mountain', 'trek', 'trail', 'torres'];
const DESERT_KEYWORDS = ['desert', 'sahara', 'arizona', 'dubai', 'marrakech', 'namibia', 'wadi'];

function detectTripType(destination = '', climate = '') {
  const d = destination.toLowerCase();
  if (BEACH_KEYWORDS.some(k => d.includes(k)) || climate === 'tropical') return 'beach';
  if (MOUNTAIN_KEYWORDS.some(k => d.includes(k)) || climate === 'alpine' || climate === 'arctic') return 'mountain';
  if (DESERT_KEYWORDS.some(k => d.includes(k)) || climate === 'desert') return 'desert';
  if (CITY_KEYWORDS.some(k => d.includes(k))) return 'city';
  return 'city';
}

// ── Seed Pro-Paths shown in the hero carousel when no expeditions exist ────────
const SEED_PROPATHS = [
  { id: 'seed-1', destination: 'Patagonia, Argentina', name: 'Torres del Paine Circuit', days: 12, legs: 8, type: 'mountain', tagline: 'Wind-sculpted granite towers at the end of the world.' },
  { id: 'seed-2', destination: 'Kyoto, Japan', name: 'Ancient Capitals Route', days: 9, legs: 6, type: 'city', tagline: 'Temples, bamboo groves and bullet-train legs.' },
  { id: 'seed-3', destination: 'Sahara, Morocco', name: 'Desert Crossing Pro-Path', days: 7, legs: 5, type: 'desert', tagline: 'Dunes, camel legs and starlit bivouacs.' },
];

// ── Icons ──────────────────────────────────────────────────────────────────────
const TripIcons = {
  city: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="4" y="14" width="5" height="14" fill={color} opacity="0.9"/>
      <rect x="11" y="8" width="6" height="20" fill={color}/>
      <rect x="19" y="12" width="5" height="16" fill={color} opacity="0.85"/>
      <rect x="26" y="17" width="3" height="11" fill={color} opacity="0.7"/>
      <rect x="1"  y="17" width="3" height="11" fill={color} opacity="0.6"/>
    </svg>
  ),
  mountain: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="16,3 28,28 4,28" fill={color} opacity="0.9"/>
      <polygon points="8,14 18,28 2,28" fill={color} opacity="0.5"/>
    </svg>
  ),
  beach: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="12" r="6" fill={color} opacity="0.9"/>
      <path d="M4 26 Q10 22 16 26 Q22 30 28 26" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  desert: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M2 24 Q8 16 14 22 Q20 28 26 20 L30 24 L30 30 L2 30 Z" fill={color} opacity="0.6"/>
      <path d="M18 8 L20 14 L18 12 L18 22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const TRIP_TYPE_LABELS = {
  city: 'City Expedition',
  mountain: 'Alpine Trek',
  beach: 'Coastal Route',
  desert: 'Desert Circuit',
};

const HERO_GRADIENTS = {
  city:     'linear-gradient(135deg, #1a2035 0%, #2d3a5c 40%, #1a2840 70%, #0e1520 100%)',
  mountain: 'linear-gradient(135deg, #0d1f1a 0%, #1a3328 40%, #243d2a 70%, #0f2420 100%)',
  beach:    'linear-gradient(135deg, #0d1e35 0%, #1a3250 40%, #1e4060 70%, #0e2640 100%)',
  desert:   'linear-gradient(135deg, #2a1a0d 0%, #3d2810 40%, #4a3218 70%, #261805 100%)',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M9.5 1.5L11.5 3.5L4 11H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="2" y="3.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="1" y1="3.5" x2="12" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5" y1="1.5" x2="8" y2="1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5" y1="6" x2="5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Hero carousel (auto-advancing, used when expeditions exist) ────────────────
function HeroCarousel({ expeditions, onLoad }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const count = Math.min(expeditions.length, 5);
  const active = expeditions[activeIdx % count];
  const tripType = detectTripType(active?.trip?.destination, active?.trip?.climate);
  const destination = active?.trip?.destination ?? '';
  const storageKey = `hero:${active?.id ?? destination}`;

  // Auto-advance every 5s
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  return (
    <div className="relative w-full" style={{ height: '55vh', minHeight: 320 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={active?.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ReframableImage
            query={destination}
            type="city"
            storageKey={storageKey}
            height="100%"
            style={{ height: '100%' }}
            showChevrons={false}
          >
            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.15) 0%, rgba(14,16,18,0.75) 100%)' }}
            />

            {/* Trip-type badge */}
            <div className="absolute top-5 left-6 flex items-center gap-1.5 px-2.5 py-1 rounded"
              style={{ background: 'rgba(14,16,18,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {(() => { const Icon = TripIcons[tripType] ?? TripIcons.city; return <Icon size={14} color="#E67E22" />; })()}
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: '0.6rem', color: '#E67E22' }}>
                {TRIP_TYPE_LABELS[tripType]}
              </span>
            </div>

            {/* Content bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6" style={{ zIndex: 5 }}>
              <p className="font-mono text-xs mb-1" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {destination}
              </p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', lineHeight: 1.15, margin: 0 }}>
                {active?.trip?.name ?? 'Untitled Expedition'}
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem' }}>
                  {active?.trip?.days ?? 0}d · {formatDate(active?.trip?.startDate)}
                </span>
                <button
                  onClick={() => onLoad(active)}
                  className="px-4 py-1.5 rounded font-mono font-semibold text-xs transition-colors"
                  style={{ background: '#E67E22', color: '#0E1012', letterSpacing: '0.08em' }}
                >
                  OPEN EXPEDITION →
                </button>
              </div>
            </div>

            {/* Dot indicators */}
            {count > 1 && (
              <div className="absolute bottom-6 right-6 flex gap-1.5" style={{ zIndex: 10 }}>
                {Array.from({ length: count }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      width: idx === activeIdx ? 20 : 6,
                      height: 4,
                      borderRadius: 2,
                      background: idx === activeIdx ? '#E67E22' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'width 0.25s ease, background 0.25s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </ReframableImage>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Seed hero (shown when no expeditions; shows Pro-Path inspirations) ─────────
function SeedHero({ onCreateNew }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = SEED_PROPATHS[activeIdx];
  const tripType = active.type;

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % SEED_PROPATHS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full" style={{ height: '55vh', minHeight: 320 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ReframableImage
            query={active.destination}
            type={tripType}
            storageKey={`seed:${active.id}`}
            height="100%"
            style={{ height: '100%' }}
            showChevrons={false}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.1) 0%, rgba(14,16,18,0.8) 100%)' }}
            />

            {/* PRO-PATH badge */}
            <div className="absolute top-5 left-6 flex items-center gap-1.5 px-2.5 py-1 rounded"
              style={{ background: 'rgba(14,16,18,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {(() => { const Icon = TripIcons[tripType] ?? TripIcons.city; return <Icon size={14} color="#E67E22" />; })()}
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: '0.6rem', color: '#E67E22' }}>
                Pro-Path · {TRIP_TYPE_LABELS[tripType]}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6" style={{ zIndex: 5 }}>
              <p className="font-mono text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {active.destination}
              </p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', lineHeight: 1.15, margin: 0 }}>
                {active.name}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                {active.tagline}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
                  {active.days}d · {active.legs} legs
                </span>
                <button
                  onClick={onCreateNew}
                  className="px-4 py-1.5 rounded font-mono font-semibold text-xs transition-colors"
                  style={{ background: '#E67E22', color: '#0E1012', letterSpacing: '0.08em' }}
                >
                  ✦ PLAN YOUR OWN →
                </button>
              </div>
            </div>

            {/* Dots */}
            <div className="absolute bottom-6 right-6 flex gap-1.5" style={{ zIndex: 10 }}>
              {SEED_PROPATHS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  style={{
                    width: idx === activeIdx ? 20 : 6,
                    height: 4,
                    borderRadius: 2,
                    background: idx === activeIdx ? '#E67E22' : 'rgba(255,255,255,0.3)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'width 0.25s ease, background 0.25s ease',
                  }}
                />
              ))}
            </div>
          </ReframableImage>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Snap-scroll expedition card ────────────────────────────────────────────────
function ExpeditionCard({ exp, onLoad, onEdit, onDelete }) {
  const destination = exp.trip?.destination ?? '';
  const climate     = exp.trip?.climate ?? '';
  const tripType    = detectTripType(destination, climate);
  const Icon        = TripIcons[tripType] ?? TripIcons.city;
  const storageKey  = `card:${exp.id}`;
  const { image: destImage } = useDestinationImage(destination, 'city', 0);

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={() => onLoad(exp)}
      className="group relative flex-shrink-0 rounded-2xl cursor-pointer overflow-hidden"
      style={{
        width: 260,
        scrollSnapAlign: 'start',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Hero image */}
      <ReframableImage
        query={destination}
        type="city"
        storageKey={storageKey}
        height={150}
        showAttribution={false}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.05) 0%, rgba(14,16,18,0.55) 100%)' }}
        />

        {/* Type badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded"
          style={{ background: 'rgba(14,16,18,0.72)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Icon size={12} color="#E67E22" />
          <span className="font-mono uppercase" style={{ fontSize: '0.55rem', color: '#E67E22', letterSpacing: '0.08em' }}>
            {TRIP_TYPE_LABELS[tripType]}
          </span>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ zIndex: 15 }}>
          <button
            onClick={e => onEdit(exp, e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(14,16,18,0.72)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            <PencilIcon />
          </button>
          <button
            onClick={e => onDelete(exp.id, e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(14,16,18,0.72)', color: 'var(--status-alert)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            <TrashIcon />
          </button>
          {destImage?.url && (
            <ReportButton
              cityId={destination}
              cityName={destination}
              country=""
              imageUrl={destImage.url}
              imageAttribution={destImage}
            />
          )}
        </div>

        {/* Destination label */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5" style={{ zIndex: 5 }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.9)', margin: 0, lineHeight: 1.2 }}>
            {destination || '—'}
          </p>
        </div>
      </ReframableImage>

      {/* Card body */}
      <div className="px-3.5 pt-2.5 pb-3.5">
        <h3 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-editorial, serif)' }}>
          {exp.trip?.name ?? 'Untitled expedition'}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 font-mono flex-wrap" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          <span>{exp.trip?.days ?? 0}d</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{formatDate(exp.trip?.startDate)}</span>
          {exp.legs?.length > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{exp.legs.length} leg{exp.legs.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="font-mono px-2 py-0.5 rounded uppercase"
            style={{ background: 'rgba(230,126,34,0.12)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.25)', fontSize: '0.58rem', letterSpacing: '0.1em' }}
          >
            {exp.trip?.status ?? 'PLANNING'}
          </span>
          <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>
            {exp.savedAt ? new Date(exp.savedAt).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Ember hover ring */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: 'inset 0 0 0 1.5px rgba(230,126,34,0.4)' }}
      />
    </motion.div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ExpeditionSelectScreen({ onEnter, onBackToDashboard, onOpenVault, onOpenProfile, onOpenExpeditions }) {
  const { loadExpedition } = useTripStore();
  const { expeditions, saveExpedition, deleteExpedition } = useExpeditionList();
  const [showNew, setShowNew]         = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const scrollRef = useRef(null);

  const hasExpeditions = expeditions.length > 0;

  function handleLoad(exp) {
    loadExpedition(exp);
    onEnter(exp.id);
  }

  function handleNew() { setEditTarget(null); setShowNew(true); }

  function handleEdit(exp, e) {
    e.stopPropagation();
    setEditTarget(exp);
    setShowNew(true);
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    setConfirmDelete(id);
  }

  function confirmDeleteExpedition() {
    deleteExpedition(confirmDelete);
    setConfirmDelete(null);
  }

  function handleCreated(newId) {
    setShowNew(false);
    setEditTarget(null);
    if (newId) onEnter(newId);
  }

  return (
    <AppShell
      activeView="select"
      onNavigate={(key) => {
        if (key === 'dashboard') onBackToDashboard?.();
        else if (key === 'vault') onOpenVault?.();
        else if (key === 'profile') onOpenProfile?.();
      }}
    >
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto" style={{ color: 'var(--text-primary)' }}>

        {/* ── Hero carousel ───────────────────────────────────────────────── */}
        {hasExpeditions
          ? <HeroCarousel expeditions={expeditions} onLoad={handleLoad} />
          : <SeedHero onCreateNew={handleNew} />
        }

        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <div>
            <h1 className="font-editorial text-xl" style={{ color: 'var(--text-primary)' }}>
              {hasExpeditions ? 'My Expeditions' : 'Start Your First Expedition'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {hasExpeditions
                ? `${expeditions.length} expedition${expeditions.length !== 1 ? 's' : ''} · scroll to browse`
                : 'Build your route, squad, and gear in minutes.'}
            </p>
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors flex-shrink-0"
            style={{ background: 'var(--cta)', fontSize: '0.8rem' }}
          >
            + New expedition
          </button>
        </div>

        {/* ── Horizontal snap-scroll card row ────────────────────────────── */}
        {hasExpeditions ? (
          <div
            ref={scrollRef}
            className="flex gap-4 pb-6 px-6"
            style={{
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollPaddingLeft: 24,
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <AnimatePresence>
              {expeditions.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                >
                  <ExpeditionCard
                    exp={exp}
                    onLoad={handleLoad}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* + New card at end of row */}
            <div
              onClick={handleNew}
              className="flex-shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
              style={{
                width: 200,
                height: 260,
                scrollSnapAlign: 'start',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ fontSize: 28, color: '#E67E22', marginBottom: 8 }}>+</span>
              <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                New expedition
              </span>
            </div>
          </div>
        ) : (
          /* Empty state CTA block */
          <div className="mx-6 mb-6 p-6 rounded-xl border text-center"
            style={{ borderColor: 'rgba(230,126,34,0.2)', background: 'rgba(230,126,34,0.05)' }}
          >
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
              Ready to launch?
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Let the guided briefing walk you through destination, squad, itinerary, budget, and gear.
            </p>
            <button
              onClick={handleNew}
              className="px-5 py-2 rounded font-mono font-semibold text-sm transition-colors"
              style={{ background: '#E67E22', color: '#0E1012' }}
            >
              ✦ Plan with Guide
            </button>
          </div>
        )}

      </div>

      {/* ── New / Edit modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNew && (
          <NewTripModal
            initialData={editTarget?.trip ?? null}
            expeditionId={editTarget?.id ?? null}
            onClose={() => { setShowNew(false); setEditTarget(null); }}
            onCreated={handleCreated}
            onSaveExpedition={saveExpedition}
            currentExpedition={editTarget}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirm overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-editorial text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                Delete expedition?
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                This cannot be undone. All legs, objectives, and settings will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteExpedition}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--status-alert)', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
