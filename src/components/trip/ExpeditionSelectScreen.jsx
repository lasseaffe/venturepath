import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useExpeditionList } from '../../hooks/useExpeditionList';
import NewTripModal from './NewTripModal';

// ── Trip-type detection from destination text ──────────────────────────────────
const CITY_KEYWORDS = ['hamburg', 'berlin', 'paris', 'london', 'tokyo', 'new york', 'rome', 'amsterdam', 'barcelona', 'madrid', 'lisbon', 'vienna', 'prague', 'warsaw', 'budapest', 'city', 'downtown', 'metro'];
const BEACH_KEYWORDS = ['beach', 'island', 'coast', 'bay', 'cancun', 'maldives', 'hawaii', 'bali', 'phuket', 'ibiza', 'santorini', 'caribbean', 'riviera'];
const MOUNTAIN_KEYWORDS = ['patagonia', 'alps', 'himalaya', 'rockies', 'andes', 'dolomites', 'summit', 'peak', 'mountain', 'trek', 'trail', 'torres'];
const DESERT_KEYWORDS = ['desert', 'sahara', 'arizona', 'dubai', 'marrakech', 'namibia', 'wadi'];

function detectTripType(destination = '', climate = '') {
  const d = destination.toLowerCase();
  if (BEACH_KEYWORDS.some(k => d.includes(k)) || climate === 'tropical') return 'beach';
  if (MOUNTAIN_KEYWORDS.some(k => d.includes(k)) || climate === 'alpine' || climate === 'arctic') return 'mountain';
  if (DESERT_KEYWORDS.some(k => d.includes(k)) || climate === 'desert') return 'desert';
  if (CITY_KEYWORDS.some(k => d.includes(k))) return 'city';
  return 'city'; // default
}

// ── Tactical SVG icons (monochrome, geometric, no emojis) ─────────────────────
const TripIcons = {
  city: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="5" height="14" fill={color} opacity="0.9"/>
      <rect x="11" y="8" width="6" height="20" fill={color}/>
      <rect x="19" y="12" width="5" height="16" fill={color} opacity="0.85"/>
      <rect x="26" y="17" width="3" height="11" fill={color} opacity="0.7"/>
      <rect x="1"  y="17" width="3" height="11" fill={color} opacity="0.6"/>
      <rect x="6"  y="17" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="6"  y="21" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="13" y="11" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="13" y="15" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="13" y="19" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="16" y="11" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="16" y="15" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="21" y="15" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
      <rect x="21" y="19" width="1.5" height="2" fill="var(--bg)" opacity="0.8"/>
    </svg>
  ),
  mountain: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,3 28,28 4,28" fill={color} opacity="0.9"/>
      <polygon points="8,14 18,28 2,28" fill={color} opacity="0.5"/>
      <polygon points="14,7 19,14 12,14" fill="var(--bg)" opacity="0.3"/>
    </svg>
  ),
  beach: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="12" r="6" fill={color} opacity="0.9"/>
      <line x1="16" y1="2" x2="16" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="19" x2="16" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="23" y1="12" x2="26" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 26 Q10 22 16 26 Q22 30 28 26" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  desert: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 24 Q8 16 14 22 Q20 28 26 20 L30 24 L30 30 L2 30 Z" fill={color} opacity="0.6"/>
      <path d="M2 22 Q8 14 14 20 Q20 26 26 18 L30 22" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M18 8 L20 14 L18 12 L18 22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 12 L15 10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 14 L21 12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Hero image URL from destination name (Unsplash Source) ────────────────────
function getHeroUrl(destination = '', tripType = 'city') {
  const clean = encodeURIComponent(destination.split(',')[0].trim());
  // Using picsum for reliable fallback; use Unsplash source with destination keyword
  return `https://source.unsplash.com/featured/800x400?${clean},${tripType},travel`;
}

const TRIP_TYPE_LABELS = {
  city: 'City Expedition',
  mountain: 'Alpine Trek',
  beach: 'Coastal Route',
  desert: 'Desert Circuit',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Tactical SVG pencil icon
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M9.5 1.5L11.5 3.5L4 11H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

// Tactical SVG trash icon
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

function ExpeditionCard({ exp, i, tripType, Icon, heroUrl, onLoad, onEdit, onDelete }) {
  const [imgError, setImgError] = useState(false);
  const fallbackGradients = {
    city:     'linear-gradient(135deg, #1a2035 0%, #2d3a5c 50%, #1e2d40 100%)',
    mountain: 'linear-gradient(135deg, #0d1f1a 0%, #1a3328 50%, #0f2420 100%)',
    beach:    'linear-gradient(135deg, #0d1e35 0%, #1a3250 50%, #0e2640 100%)',
    desert:   'linear-gradient(135deg, #2a1a0d 0%, #3d2810 50%, #261805 100%)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => onLoad(exp)}
      className="group relative rounded-2xl cursor-pointer overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Hero image with breathing animation */}
      <div
        className="relative overflow-hidden"
        style={{ height: 160 }}
      >
        {!imgError ? (
          <motion.img
            src={heroUrl}
            alt={exp.trip?.destination ?? ''}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="w-full h-full"
            style={{ background: fallbackGradients[tripType] ?? fallbackGradients.city }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.1) 0%, rgba(14,16,18,0.55) 100%)' }}
        />

        {/* Trip-type badge top-left */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            background: 'rgba(14,16,18,0.72)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ color: 'var(--cta)', display: 'flex' }}>
            <Icon size={14} color="var(--cta)" />
          </span>
          <span
            className="text-xs font-mono tracking-wider uppercase"
            style={{ color: 'var(--cta)', letterSpacing: '0.08em', fontSize: '0.6rem' }}
          >
            {TRIP_TYPE_LABELS[tripType]}
          </span>
        </div>

        {/* Action buttons top-right */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={e => onEdit(exp, e)}
            title="Edit expedition details"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(14,16,18,0.72)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <PencilIcon />
          </button>
          <button
            onClick={e => onDelete(exp.id, e)}
            title="Delete expedition"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(14,16,18,0.72)',
              color: 'var(--status-alert)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <TrashIcon />
          </button>
        </div>

        {/* Destination name overlaid on bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <p
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', fontSize: '0.6rem' }}
          >
            {exp.trip?.destination ?? '—'}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3 pb-4">
        <h2
          className="font-semibold text-base leading-tight truncate"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-editorial, serif)' }}
        >
          {exp.trip?.name ?? 'Untitled expedition'}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }}>
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

        <div className="mt-3 flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded font-mono tracking-wider uppercase"
            style={{
              background: 'rgba(230,126,34,0.12)',
              color: 'var(--cta)',
              border: '1px solid rgba(230,126,34,0.25)',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
            }}
          >
            {exp.trip?.status ?? 'PLANNING'}
          </span>
          <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            {exp.savedAt ? new Date(exp.savedAt).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Ember glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: 'inset 0 0 0 1.5px rgba(230,126,34,0.4)' }}
      />
    </motion.div>
  );
}

export default function ExpeditionSelectScreen({ onEnter }) {
  const { trip, legs, objectives, manifestSettings, loadExpedition } = useTripStore();
  const { expeditions, saveExpedition, deleteExpedition } = useExpeditionList();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // expedition id being edited
  const [confirmDelete, setConfirmDelete] = useState(null);

  function handleLoad(exp) {
    loadExpedition(exp);
    onEnter(exp.id);
  }

  function handleNew() {
    setEditTarget(null);
    setShowNew(true);
  }

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

  // Called by NewTripModal when a new trip is created or edited.
  // newId is the expedition id that was saved to the list.
  function handleCreated(newId) {
    setShowNew(false);
    setEditTarget(null);
    if (newId) onEnter(newId);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-5 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="font-editorial text-2xl" style={{ color: 'var(--text-primary)' }}>
            My Expeditions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Select an expedition to continue planning, or start a new one.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--cta)' }}
        >
          + New expedition
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        {expeditions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-4xl mb-3">🗺️</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No saved expeditions yet
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
              Create your first one and start planning.
            </p>
            <button
              onClick={handleNew}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: 'var(--cta)' }}
            >
              + New expedition
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {expeditions.map((exp, i) => {
                const tripType = detectTripType(exp.trip?.destination, exp.trip?.climate);
                const Icon = TripIcons[tripType] ?? TripIcons.city;
                const heroUrl = getHeroUrl(exp.trip?.destination ?? '', tripType);
                return (
                  <ExpeditionCard
                    key={exp.id}
                    exp={exp}
                    i={i}
                    tripType={tripType}
                    Icon={Icon}
                    heroUrl={heroUrl}
                    onLoad={handleLoad}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* First-time Architect prompt */}
      {(!expeditions || expeditions.length === 0) && (
        <div className="mx-6 mb-6 p-6 bg-[#141820] border border-[#E67E22]/20 rounded-lg text-center">
          <p className="text-white text-sm font-semibold mb-1">First expedition?</p>
          <p className="text-[#D9C5B2] text-xs mb-4">
            Let us guide you through the full briefing — destination, squad, itinerary, budget, and gear.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push('/expedition/new/welcome')}
              className="px-5 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold text-sm rounded hover:bg-[#d4711f] transition-colors"
            >
              ✦ Plan with Guide
            </button>
          </div>
        </div>
      )}

      {/* New / Edit trip modal */}
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

      {/* Delete confirm */}
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
                This cannot be undone. All legs, objectives, and settings for this expedition will be permanently removed.
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
    </div>
  );
}
