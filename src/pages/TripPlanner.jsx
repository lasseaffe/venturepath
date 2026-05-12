import { useState, useEffect, useRef, useMemo } from 'react';
import StickyNav from '../components/layout/StickyNav';
import ToastContainer from '../components/ui/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import NewTripModal from '../components/trip/NewTripModal';
import { useTripStore } from '../store/useTripStore';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../hooks/useLabels';
import AppShell from '../components/layout/AppShell';
import TransitMap from '../components/itinerary/TransitMap';
import TimelinePath from '../components/itinerary/TimelinePath';
import RouteMap from '../components/itinerary/RouteMap';
import LegGuide from '../components/itinerary/LegGuide';
import KanbanBoard from '../components/itinerary/KanbanBoard';
import LedgerWorkbench from '../components/itinerary/ledger/LedgerWorkbench';
import PackingManifest from '../components/logistics/PackingManifest';
import PublicTransport from '../components/logistics/PublicTransport';
import VehicleSearch from '../components/logistics/VehicleSearch';
import PackingEngine from '../components/logistics/PackingEngine';
import AccommodationSearch from '../components/logistics/AccommodationSearch';
import MustSee from '../components/discovery/MustSee';
import LocalFlavor from '../components/discovery/LocalFlavor';
import BasecampScout from '../components/discovery/BasecampScout';
import VentureVault from '../components/discovery/VentureVault';
import LaunchSequence from '../components/ui/LaunchSequence';
import TacticalMode from '../components/ui/TacticalMode';
import PioneerChat from '../components/social/PioneerChat';
import ArchitectProfile from '../components/social/ArchitectProfile';
import BudgetLoom from '../components/itinerary/BudgetLoom';
import BentoPacker from '../components/logistics/BentoPacker';
import ElevationStrip from '../components/itinerary/ElevationStrip';
import GpxPanel from '../components/itinerary/GpxPanel';
import LegHud from '../components/logistics/LegHud';
import VibeCheck from '../components/discovery/VibeCheck';
import SafetyTicker from '../components/logistics/SafetyTicker';
import ARGhostTours from '../components/ar/ARGhostTours';
import { DESTINATION_CENTERS, DESTINATION_HEROES, normalizeHero } from '../utils/destinationEngine';
import { searchAttractions, searchFood } from '../utils/osmEngine.js';
import DiscoveryMap from '../components/discovery/DiscoveryMap.jsx';
import InspirePanel from '../components/inspire/InspirePanel';
import SettingsPanel from '../components/settings/SettingsPanel';
import { CalendarStrip } from '../components/layout/CalendarStrip';
import { DayLoopPanel } from '../components/itinerary/DayLoopPanel';
import { CascadeConfirmSheet } from '../components/itinerary/CascadeConfirmSheet';
import { AddStopFlow } from '../components/itinerary/AddStopFlow';
import { onStopAdded } from '../utils/homebaseEngine';
import { LegLens } from '../components/legLens/LegLens.jsx';
import { hydrateLeg } from '../utils/legIntelligence/index.js';
import GatheringsHub from '../components/gatherings/GatheringsHub';
import GatheringDetail from '../components/gatherings/GatheringDetail';
import { useTripGatherings } from '../lib/gatherings/useGatherings';
import { useAuth } from '../context/AuthContext';
import { createGathering as apiCreateGathering } from '../lib/gatherings/api';
import { CampMetaEditor } from '../components/logistics/CampMetaEditor';
import { emitLegConfirmed, emitCampPitched, emitExpeditionLogged } from '../utils/streakEmitter.js';
import { emitCrossApp } from '../utils/crossAppEmitter.js';

function TripHeroImage({ destination, heroImageUrl }) {
  const [bleedOpacity, setBleedOpacity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftPos, setDraftPos] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const heroRef = useRef(null);
  const dragOrigin = useRef(null);

  const { heroImagePositions, setHeroImagePosition } = useTripStore();

  const city = destination?.split(',')[0]?.trim() ?? '';
  const key = destination?.split(',')[0]?.trim().toLowerCase().replace(/[^a-z]/g, '') ?? '';
  const candidates = heroImageUrl
    ? [normalizeHero(heroImageUrl)]
    : (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default).map(normalizeHero);
  const total = candidates.length;
  const imgSrc = candidates[imgIndex].url;
  const savedPos = heroImagePositions[imgSrc] ?? { x: 50, y: 40 };
  const displayPos = draftPos ?? savedPos;

  // Photo picker filter
  const allPhotos = (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default).map(normalizeHero);
  const pickerResults = searchQuery.trim() === ''
    ? allPhotos
    : allPhotos.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.tags.some(t => t.includes(q))
          || p.credit.toLowerCase().includes(q)
          || p.source.includes(q);
      });

  useEffect(() => {
    const main = heroRef.current?.closest('main');
    if (!main) return;
    function onScroll() {
      const heroH = heroRef.current?.offsetHeight ?? 340;
      const ratio = Math.max(0, Math.min(1, 1 - main.scrollTop / (heroH * 0.7)));
      setBleedOpacity(ratio);
    }
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  function prev(e) { e.stopPropagation(); setImgIndex(i => (i - 1 + total) % total); }
  function next(e) { e.stopPropagation(); setImgIndex(i => (i + 1) % total); }

  function startDrag(e) {
    if (!editing) return;
    e.preventDefault();
    const pos = draftPos ?? savedPos;
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, startX: pos.x, startY: pos.y };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
  }
  function onDrag(e) {
    if (!dragOrigin.current || !heroRef.current) return;
    // Edit mode uses 130% img size → 30% overflow in both axes.
    // Sensitivity = 1:1 with overflow pixels so drag feels direct.
    const cw = heroRef.current.clientWidth;
    const ch = heroRef.current.clientHeight || 340;
    const x = Math.max(0, Math.min(100,
      dragOrigin.current.startX - ((e.clientX - dragOrigin.current.mouseX) / (cw * 0.3)) * 100
    ));
    const y = Math.max(0, Math.min(100,
      dragOrigin.current.startY - ((e.clientY - dragOrigin.current.mouseY) / (ch * 0.3)) * 100
    ));
    setDraftPos({ x, y });
  }
  function stopDrag() {
    dragOrigin.current = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
  }

  const chevronBase = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(14,16,18,0.55)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(217,197,178,0.18)',
    color: '#D9C5B2', cursor: 'pointer',
    transition: 'opacity 0.18s ease, background 0.15s ease',
    opacity: hovered && !editing ? 1 : 0,
    zIndex: 10,
  };

  return (
    <>
      <div
        ref={heroRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative', height: 340, overflow: 'hidden', flexShrink: 0 }}
      >
        <img
          key={imgSrc}
          src={imgSrc}
          alt={city}
          onMouseDown={startDrag}
          style={editing ? {
            // 130% × 130% creates 30% overflow in both axes so objectPosition X can work.
            // left/top map the 0-100 position range to the 0-30% overflow range.
            position: 'absolute',
            width: '130%', height: '130%',
            objectFit: 'cover',
            left: `${-(displayPos.x / 100) * 30}%`,
            top: `${-(displayPos.y / 100) * 30}%`,
            display: 'block', cursor: 'grab', userSelect: 'none',
          } : {
            width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${displayPos.x}% ${displayPos.y}%`,
            display: 'block', transition: 'opacity 0.3s ease',
            cursor: 'default', userSelect: 'none',
          }}
        />

        {/* Scroll-driven bottom bleed */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, var(--bg) 100%)',
          opacity: bleedOpacity, transition: 'opacity 0.08s linear', pointerEvents: 'none',
        }} />

        {/* Edit mode dashed border */}
        {editing && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11,
            border: '2px dashed rgba(230,126,34,0.7)', boxSizing: 'border-box',
          }} />
        )}

        {/* Pencil — enter edit mode */}
        {!editing && (
          <button
            onClick={e => { e.stopPropagation(); setDraftPos(savedPos); setEditing(true); }}
            aria-label="Adjust image position"
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 12,
              width: 30, height: 30, borderRadius: 7,
              background: 'rgba(14,16,18,0.65)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(217,197,178,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: hovered ? 1 : 0,
              transition: 'opacity 0.18s ease', color: '#D9C5B2',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Chevron — previous */}
        {total > 1 && (
          <button onClick={prev} style={{ ...chevronBase, left: 14 }} aria-label="Previous photo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Chevron — next */}
        {total > 1 && (
          <button onClick={next} style={{ ...chevronBase, right: 14 }} aria-label="Next photo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Dot indicators */}
        {total > 1 && !editing && (
          <div style={{
            position: 'absolute', bottom: 14, right: 20,
            display: 'flex', gap: 5, alignItems: 'center',
            opacity: bleedOpacity * (hovered ? 1 : 0.55),
            transition: 'opacity 0.18s ease',
          }}>
            {candidates.map((photo, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                aria-label={photo.credit ? `Photo by ${photo.credit}` : `Photo ${i + 1}`}
                style={{
                  width: i === imgIndex ? 18 : 6, height: 6,
                  borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer',
                  background: i === imgIndex ? '#E67E22' : 'rgba(217,197,178,0.45)',
                  transition: 'width 0.2s ease, background 0.2s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Destination label */}
        <div style={{
          position: 'absolute', bottom: 16, left: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(217,197,178,0.7)',
          opacity: bleedOpacity, transition: 'opacity 0.08s linear',
        }}>
          {city}
        </div>
      </div>

      {/* Edit toolbar */}
      {editing && (
        <div style={{
          display: 'flex', gap: 8, padding: '8px 14px',
          background: 'rgba(14,16,18,0.95)', borderBottom: '1px solid rgba(217,197,178,0.1)',
          alignItems: 'center',
        }}>
          <button
            onClick={() => { setEditing(false); setDraftPos(null); setSearching(false); }}
            style={{ background: 'transparent', border: '1px solid rgba(217,197,178,0.2)', borderRadius: 6, padding: '4px 12px', color: '#888', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}
          >
            Cancel
          </button>
          <div style={{ flex: 1 }} />
          {allPhotos.length >= 2 && (
            <button
              onClick={() => { setSearchQuery(city.toLowerCase()); setSearching(s => !s); }}
              style={{ background: 'transparent', border: '1px solid #E67E22', borderRadius: 6, padding: '4px 12px', color: '#E67E22', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}
            >
              🔍 Change photo
            </button>
          )}
          <button
            onClick={() => {
              const p = draftPos ?? savedPos;
              setHeroImagePosition(imgSrc, p.x, p.y);
              setEditing(false);
              setDraftPos(null);
              setSearching(false);
            }}
            style={{ background: '#E67E22', border: 'none', borderRadius: 6, padding: '4px 14px', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em', fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      )}

      {/* Photo picker panel */}
      {editing && searching && (
        <div style={{ background: 'rgba(10,9,8,0.97)', borderBottom: '1px solid rgba(217,197,178,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, padding: '8px 14px 6px' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${city} photos…`}
              style={{
                flex: 1, background: '#1c1a17', border: '1px solid rgba(217,197,178,0.15)',
                borderRadius: 6, padding: '5px 10px', color: '#D9C5B2',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 14px 10px', overflowX: 'auto' }}>
            {pickerResults.length === 0 && (
              <span style={{ color: '#555', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", padding: '8px 0' }}>
                No photos match "{searchQuery}"
              </span>
            )}
            {pickerResults.map((photo, i) => (
              <div
                key={photo.url}
                onClick={() => {
                  const idx = candidates.findIndex(c => c.url === photo.url);
                  if (idx >= 0) setImgIndex(idx);
                  setDraftPos({ x: 50, y: 40 });
                  setSearching(false);
                }}
                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
              >
                <img
                  src={`${photo.url.split('?')[0]}?auto=compress&cs=tinysrgb&w=200&h=120&fit=crop`}
                  alt={photo.credit || `Photo ${i + 1}`}
                  style={{
                    width: 90, height: 58, objectFit: 'cover', borderRadius: 5, display: 'block',
                    border: photo.url === imgSrc ? '2px solid #E67E22' : '2px solid transparent',
                    transition: 'border-color 0.15s ease',
                  }}
                />
                <span style={{
                  position: 'absolute', bottom: 3, left: 3,
                  background: 'rgba(0,0,0,0.65)', borderRadius: 3,
                  padding: '1px 4px', fontSize: '0.55rem',
                  fontFamily: "'JetBrains Mono', monospace", color: '#D9C5B2',
                  letterSpacing: '.04em', textTransform: 'uppercase',
                }}>
                  {photo.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function TripPlanner({ onBackToDashboard, onOpenMoodboard }) {
  const { architect } = useAuth();
  const { trip, legs, stays, pois, dayLoops, manifestSettings, cloning,
          addStopToDayLoop, addDayLoop, setTripPlanningMode, dispatch,
          addWaypoint, updateWaypoint, setLegMeta, replaceLegRoute } = useTripStore();
  const destinationId = trip.destination?.split(',')[0].toLowerCase().replace(/[^a-z]/g, '') ?? 'default';
  const mapCenter = DESTINATION_CENTERS[destinationId] ?? DESTINATION_CENTERS.default;
  const { theme } = useTheme();
  const labels = useLabels();
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('vp_last_tab') ?? 'transport'
  );
  const discoveryRef     = useRef(null);
  const discoveryFetched = useRef(false);

  // Trip ID: use trip name as stable client-side identifier
  const tripId = trip?.name ?? null;
  const { items: tripGatherings, loading: gatheringsLoading, reload: reloadGatherings } = useTripGatherings(tripId);
  const [openGatheringId, setOpenGatheringId] = useState(null);

  const completion = useMemo(() => ({
    transport:     legs.some(l => l.status === 'confirmed'),
    accommodation: stays.length > 0,
    discovery:     pois.length > 0 || attractions.length > 0,
    gatherings:    tripGatherings.length > 0,
    itinerary:     dayLoops.some(dl => (dl.stopIds?.length ?? 0) > 0),
    logistics:     (manifestSettings?.items?.length ?? 0) > 0,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [legs, stays, pois, attractions, tripGatherings, dayLoops, manifestSettings]);
  const [tacticalMode, setTacticalMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [inspireOpen, setInspireOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeLegId, setActiveLegId] = useState(null);
  const [legLensOpen, setLegLensOpen] = useState(false);
  const [attractions, setAttractions]               = useState([]);
  const [food, setFood]                             = useState([]);
  const [attractionsLoading, setAttractionsLoading] = useState(false);
  const [foodLoading, setFoodLoading]               = useState(false);
  const [attractionCategory, setAttractionCategory] = useState('all');
  const [foodCategory, setFoodCategory]             = useState('all');
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pendingPreviews, setPendingPreviews] = useState(null);
  const [showAddStop, setShowAddStop] = useState(false);

  // Auto-create DayLoops when a Stay with valid checkin/checkout is added
  const seenStayIds = useRef(new Set());
  useEffect(() => {
    stays.forEach(stay => {
      if (seenStayIds.current.has(stay.id)) return;
      seenStayIds.current.add(stay.id);
      if (!stay.checkin || !stay.checkout) return;
      const checkin = new Date(stay.checkin);
      const checkout = new Date(stay.checkout);
      if (isNaN(checkin) || isNaN(checkout) || checkin >= checkout) return;
      for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().slice(0, 10);
        const alreadyExists = dayLoops.some(dl => dl.date === date && dl.homebaseStayId === stay.id);
        if (!alreadyExists) {
          addDayLoop({ date, homebaseStayId: stay.id });
        }
      }
    });
  }, [stays, dayLoops, addDayLoop]);

  // Persist active tab across refreshes
  useEffect(() => {
    localStorage.setItem('vp_last_tab', activeTab);
  }, [activeTab]);

  // Lazy-fetch discovery data when the Discovery tab becomes active
  useEffect(() => {
    if (activeTab !== 'discovery' || !trip?.destination) return;
    if (discoveryFetched.current) return;
    discoveryFetched.current = true;
    const city = trip.destination.split(',')[0].trim();
    setAttractionsLoading(true);
    searchAttractions(city, attractionCategory)
      .then(setAttractions)
      .finally(() => setAttractionsLoading(false));
    setFoodLoading(true);
    searchFood(city, foodCategory)
      .then(setFood)
      .finally(() => setFoodLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trip?.destination]);

  // Refetch when category filters change, but only if initial fetch already ran
  useEffect(() => {
    if (!discoveryFetched.current || !trip?.destination) return;
    const city = trip.destination.split(',')[0].trim();
    setAttractionsLoading(true);
    searchAttractions(city, attractionCategory)
      .then(setAttractions)
      .finally(() => setAttractionsLoading(false));
  }, [attractionCategory]);

  useEffect(() => {
    if (!discoveryFetched.current || !trip?.destination) return;
    const city = trip.destination.split(',')[0].trim();
    setFoodLoading(true);
    searchFood(city, foodCategory)
      .then(setFood)
      .finally(() => setFoodLoading(false));
  }, [foodCategory]);

  function handleDiscoveryPinClick(id) {
    setSelectedDiscoveryId(id);
    document.getElementById(`discovery-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleLegHydrate(legId) {
    const leg = legs.find(l => l.id === legId);
    if (!leg) return;
    const { legMeta, waypoints: wps } = await hydrateLeg(leg);
    if (legMeta) setLegMeta(legId, legMeta);
    wps.forEach(wp => addWaypoint(legId, wp));
  }

  function handleVariantSelect(legId, variant) {
    const leg = legs.find(l => l.id === legId);
    if (!leg?.legMeta?.routeVariants) return;
    const chosen = leg.legMeta.routeVariants.find(v => v.variant === variant);
    if (!chosen) return;
    // Update activeVariant in legMeta and replace route
    setLegMeta(legId, { ...leg.legMeta, activeVariant: variant });
    replaceLegRoute(legId, { durationH: chosen.durationH, distanceKm: chosen.distanceKm });
  }

  function handleWaypointConfirm(waypointId) {
    const leg = legs.find(l => (l.waypoints ?? []).some(w => w.id === waypointId));
    if (!leg) return;
    updateWaypoint(leg.id, waypointId, { status: 'confirmed' });
    emitLegConfirmed({ legId: leg.id });
  }

  function handleWaypointBook(waypointId) {
    const leg = legs.find(l => (l.waypoints ?? []).some(w => w.id === waypointId));
    if (!leg) return;
    updateWaypoint(leg.id, waypointId, { status: 'confirmed', bookingRef: `booking-${Date.now()}` });
    emitLegConfirmed({ legId: leg.id });
  }

  // Phase 5: expedition_logged emission + WC context push on trip name change
  useEffect(() => {
    if (!trip?.name) return;
    emitExpeditionLogged({ tripName: trip.name });
    const campNights = stays
      .filter(s => ['camp', 'wild', 'shelter'].includes(s.kind))
      .map(s => ({
        date: s.checkin ?? null,
        firePermitted: s.campMeta?.fireRules?.permitted ?? true,
        waterTreatRequired: s.campMeta?.waterSource?.treatRequired ?? false,
      }));
    const fuelStops = legs.flatMap(l =>
      (l.legMeta?.fuelPlan?.stops ?? []).map(stop => ({ name: stop.name, coords: stop.coords, legId: l.id }))
    );
    emitCrossApp('http://localhost:3002/api/cross-app/expedition-context', {
      tripName: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      destination: trip.destination,
      fuelStops,
      campNights,
    });
  }, [trip?.name]);

  // Phase 5: camp_pitched emission when a new camp/wild/shelter stay is added
  const prevStayCountRef = useRef(stays.length);
  useEffect(() => {
    if (stays.length > prevStayCountRef.current) {
      const newStay = stays[stays.length - 1];
      if (newStay && ['camp', 'wild', 'shelter'].includes(newStay.kind)) {
        emitCampPitched({ stayId: newStay.id });
      }
    }
    prevStayCountRef.current = stays.length;
  }, [stays.length]);

  function handleWaypointDismiss(waypointId) {
    const leg = legs.find(l => (l.waypoints ?? []).some(w => w.id === waypointId));
    if (!leg) return;
    updateWaypoint(leg.id, waypointId, { status: 'skipped' });
  }

  if (tacticalMode) {
    return <TacticalMode onExit={() => setTacticalMode(false)} />;
  }

  if (profileOpen) {
    return <ArchitectProfile onClose={() => setProfileOpen(false)} />;
  }

  return (
    <>
      {!launched && <LaunchSequence cloning={cloning} onComplete={() => setLaunched(true)} />}

      <div className={`transition-opacity duration-700 ${launched ? 'opacity-100' : 'opacity-0'}`}>
        <AppShell
          activeView="select"
          onNavigate={key => {
            if (key === 'dashboard' || key === 'select') onBackToDashboard();
            if (key === 'profile')  setProfileOpen(true);
            if (key === 'inspire')  setInspireOpen(true);
            if (key === 'tactical') setTacticalMode(true);
            if (key === 'settings') setSettingsOpen(true);
          }}
        >
          {/* Destination hero image — scroll-driven bleed fade */}
          <TripHeroImage destination={trip.destination} heroImageUrl={trip.heroImageUrl} />

          {/* Journey stepper — replaces old 7-section scroll nav */}
          <StickyNav activeTab={activeTab} onTabChange={setActiveTab} completion={completion} />

          {/* Trip header bar */}
          <header
            className="border-b px-6 py-4 flex items-center justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div>
              <div className="label-tag mb-0.5">{labels.activeMission}</div>
              <button
                onClick={() => setEditTripOpen(true)}
                className="font-editorial text-xl text-left hover:underline decoration-dotted"
                style={{ color: 'var(--text-primary)' }}
                title="Click to edit trip"
              >
                {trip.name}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>{trip.destination}</span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {trip.status}
              </span>
              {/* Planning mode switcher */}
              <div style={{ display: 'flex', border: '1px solid rgba(242,237,232,0.1)', borderRadius: 2, overflow: 'hidden', marginLeft: 8 }}>
                {['manual', 'semi', 'full'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTripPlanningMode(mode)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.52rem',
                      padding: '4px 10px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      border: 'none',
                      background: trip.planningMode === mode
                        ? mode === 'full' ? 'rgba(92,154,106,0.15)' : mode === 'semi' ? 'rgba(230,126,34,0.15)' : '#181A1C'
                        : 'transparent',
                      color: trip.planningMode === mode
                        ? mode === 'full' ? '#5C9A6A' : mode === 'semi' ? 'var(--accent)' : '#8A8680'
                        : '#484440',
                      borderRight: mode !== 'full' ? '1px solid rgba(242,237,232,0.07)' : 'none',
                    }}
                  >
                    {mode === 'semi' ? 'Semi ●' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <AnimatePresence>
            {editTripOpen && (
              <NewTripModal
                initialData={trip}
                onClose={() => setEditTripOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Trip stats bar */}
          <div
            className="px-6 py-3 border-b flex flex-wrap gap-6"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-raised)' }}
          >
            <Stat label="Departure" value={trip.startDate} />
            <Stat label="Return"    value={trip.endDate} />
            <Stat label="Duration"  value={`${trip.days} days`} />
            <Stat label="Climate"   value={trip.climate} />

            {/* XA-1 + XA-2: Cross-app links to What's Cooking */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {trip.destination && (() => {
                const city = trip.destination.split(',')[0].trim();
                const WC = import.meta.env.VITE_WC_URL || 'http://localhost:3002';
                return (<>
                  <a
                    href={`${WC}/discover?cuisine=${encodeURIComponent(city)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 rounded border transition-colors hover:bg-[#E67E22]/10"
                    style={{ borderColor: 'rgba(230,126,34,0.3)', color: '#D9C5B2' }}
                    title="Explore local cuisine at destination in What's Cooking"
                  >
                    🍜 Explore {city} recipes
                  </a>
                  {trip.startDate && trip.endDate && (
                    <a
                      href={`${WC}/plans/new?from=${trip.startDate}&to=${trip.endDate}&destination=${encodeURIComponent(city)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 rounded border transition-colors hover:bg-[#E67E22]/10"
                      style={{ borderColor: 'rgba(230,126,34,0.3)', color: '#D9C5B2' }}
                      title="Plan meals for this expedition in What's Cooking"
                    >
                      📅 Plan meals for trip
                    </a>
                  )}
                </>);
              })()}
            </div>
          </div>

          {/* CalendarStrip — persistent above all tabs */}
          <CalendarStrip
            trip={trip}
            dayLoops={dayLoops}
            stays={stays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* ── Tab panels — only active tab renders ── */}

          {activeTab === 'transport' && (
            <div className="space-y-4" style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <div style={{ flex: '0 0 70%', position: 'relative', minHeight: 320 }}>
                  <RouteMap
                    style={{ height: 320 }}
                    selectedDate={selectedDate}
                    dayLoops={dayLoops}
                    stays={stays}
                    pois={pois}
                    gatherings={tripGatherings}
                    onGatheringOpen={setOpenGatheringId}
                  />
                  <AnimatePresence>
                    {activeLegId && (
                      <LegHud
                        leg={legs.find(l => l.id === activeLegId)}
                        onClose={() => setActiveLegId(null)}
                      />
                    )}
                  </AnimatePresence>
                  {legs.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {legs.filter(l => l.status === 'confirmed').map(l => (
                        <button
                          key={l.id}
                          onClick={() => {
                            if (activeLegId === l.id) {
                              setActiveLegId(null);
                              setLegLensOpen(false);
                            } else {
                              setActiveLegId(l.id);
                              setLegLensOpen(true);
                            }
                          }}
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9, letterSpacing: '0.08em',
                            padding: '3px 10px', borderRadius: 2,
                            border: `1px solid ${activeLegId === l.id ? '#E67E22' : '#2a2f36'}`,
                            background: activeLegId === l.id ? 'rgba(230,126,34,0.12)' : 'transparent',
                            color: activeLegId === l.id ? '#E67E22' : '#8A8680',
                            cursor: 'pointer',
                          }}
                        >
                          {activeLegId === l.id ? '■ STOP' : `▶ LEG ${l.id}`} {l.to}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <TimelinePath gatherings={tripGatherings} />
                </div>
                {legLensOpen && activeLegId && (() => {
                  const nextCampStay = stays.find(s => ['camp', 'wild', 'shelter'].includes(s.kind)) ?? null;
                  return (
                    <LegLens
                      leg={legs.find(l => l.id === activeLegId) ?? null}
                      nextStay={nextCampStay}
                      onVariantSelect={handleVariantSelect}
                      onWaypointConfirm={handleWaypointConfirm}
                      onWaypointBook={handleWaypointBook}
                      onWaypointDismiss={handleWaypointDismiss}
                      onHydrate={handleLegHydrate}
                      onClose={() => { setLegLensOpen(false); setActiveLegId(null); }}
                    />
                  );
                })()}
              </div>
              <GpxPanel />
              <ElevationStrip />
              <SafetyTicker destinationId={destinationId} center={mapCenter} zoom={8} />
              <PublicTransport destination={trip.destination} />
            </div>
          )}

          {activeTab === 'accommodation' && (
            <div className="max-w-2xl space-y-4" style={{ padding: '24px 24px 0' }}>
              <AccommodationSearch destination={trip.destination} />
              {stays.filter(s => ['camp','wild','shelter'].includes(s.kind)).length > 0 && (
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Camp Configuration
                  </div>
                  {stays
                    .filter(s => ['camp','wild','shelter'].includes(s.kind))
                    .map(s => <CampMetaEditor key={s.id} stay={s} />)
                  }
                </div>
              )}
            </div>
          )}

          {activeTab === 'discovery' && (
            <div ref={discoveryRef} className="space-y-4" style={{ padding: '24px 24px 0' }}>
              <DiscoveryMap
                attractionPins={attractions}
                foodPins={food}
                selectedId={selectedDiscoveryId}
                onPinClick={handleDiscoveryPinClick}
                destinationKey={destinationId}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <MustSee
                  attractions={attractions}
                  loading={attractionsLoading}
                  selectedId={selectedDiscoveryId}
                  onCategoryChange={setAttractionCategory}
                  onSelect={handleDiscoveryPinClick}
                />
                <LocalFlavor
                  food={food}
                  loading={foodLoading}
                  selectedId={selectedDiscoveryId}
                  onCategoryChange={setFoodCategory}
                  onSelect={handleDiscoveryPinClick}
                />
                <VibeCheck destinationId={trip.destination?.split(',')[0].trim() ?? destinationId} tripName={trip.name} />
                <ARGhostTours destinationId={destinationId} center={mapCenter} />
                <BasecampScout destination={trip.destination} />
              </div>
            </div>
          )}

          {activeTab === 'gatherings' && (
            <div style={{ padding: '0' }}>
              <GatheringsHub
                items={tripGatherings}
                loading={gatheringsLoading}
                tripId={tripId}
                onCreate={async (input) => {
                  if (!architect?.id) return { error: new Error('Sign in to create Gatherings.') };
                  const result = await apiCreateGathering(input, { convenerId: architect.id });
                  if (!result.error) reloadGatherings();
                  return result;
                }}
                onReload={reloadGatherings}
              />
            </div>
          )}

          {openGatheringId && (
            <GatheringDetail
              gatheringId={openGatheringId}
              onClose={() => setOpenGatheringId(null)}
              onDeleted={() => { setOpenGatheringId(null); reloadGatherings(); }}
            />
          )}

          {activeTab === 'itinerary' && (
            <div className="space-y-6" style={{ padding: '24px 24px 0' }}>
              {selectedDate ? (() => {
                const dayLoop = dayLoops.find(dl => dl.date === selectedDate);
                const stay    = stays.find(s => s.id === dayLoop?.homebaseStayId);
                const dayPois = (dayLoop?.stopIds ?? []).map(id => pois.find(p => p.id === id)).filter(Boolean);
                return dayLoop ? (
                  <div>
                    <DayLoopPanel
                      dayLoop={dayLoop}
                      stay={stay}
                      pois={dayPois}
                      onAddStop={() => setShowAddStop(true)}
                    />
                    {showAddStop && (
                      <div style={{ padding: 8 }}>
                        <AddStopFlow
                          dayLoopId={dayLoop.id}
                          homebaseCoords={stay?.coords ?? [0, 0]}
                          onAdd={(stop) => {
                            addStopToDayLoop(dayLoop.id, stop);
                            const updatedStops = [...dayPois, stop];
                            const effectiveMode = dayLoop.planningMode ?? trip.planningMode ?? 'semi';
                            const result = onStopAdded({ dayLoop, stop, homebaseCoords: stay?.coords ?? [0, 0], allStops: updatedStops, mode: effectiveMode, dispatch });
                            if (effectiveMode === 'semi' && result?.previews) {
                              setPendingPreviews({ previews: result.previews, stopName: stop.name });
                            }
                            setShowAddStop(false);
                          }}
                          onClose={() => setShowAddStop(false)}
                        />
                      </div>
                    )}
                    {pendingPreviews && (
                      <div style={{ padding: 8 }}>
                        <CascadeConfirmSheet
                          previews={pendingPreviews.previews}
                          stopName={pendingPreviews.stopName}
                          onApply={() => setPendingPreviews(null)}
                          onDiscard={() => setPendingPreviews(null)}
                          dispatch={dispatch}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', padding: 12 }}>
                    No day loop for {selectedDate}. Add a Stay with check-in/check-out dates covering this night first.
                  </p>
                );
              })() : null}
              <LedgerWorkbench />
              <KanbanBoard tripName={trip.name} destination={trip.destination} />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2"><TransitMap /></div>
                <div className="lg:col-span-3"><LegGuide /></div>
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-4" style={{ padding: '24px 24px 0' }}>
              <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
              <BudgetLoom />
            </div>
          )}
        </AppShell>
      </div>

      {/* Global InspirePanel overlay */}
      <InspirePanel
        open={inspireOpen}
        dayLabel={trip.destination}
        onClose={() => setInspireOpen(false)}
        onAddBlock={() => setInspireOpen(false)}
      />

      {/* PioneerChat overlay */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 right-6 z-30 w-96"
          >
            <PioneerChat onClose={() => setChatOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLaunchWizard={() => {
          setSettingsOpen(false);
          window.location.assign('/expedition/new/welcome');
        }}
        onOpenMoodboard={() => {
          setSettingsOpen(false);
          onOpenMoodboard?.();
        }}
      />
      <ToastContainer />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="label-tag">{label}</div>
      <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
