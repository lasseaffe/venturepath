import { useState, useEffect, useRef } from 'react';
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
import { DESTINATION_CENTERS } from '../utils/destinationEngine';
import { searchAttractions, searchFood } from '../utils/osmEngine.js';
import DiscoveryMap from '../components/discovery/DiscoveryMap.jsx';
import InspirePanel from '../components/inspire/InspirePanel';
import SettingsPanel from '../components/settings/SettingsPanel';
import { CalendarStrip } from '../components/layout/CalendarStrip';
import { DayLoopPanel } from '../components/itinerary/DayLoopPanel';
import { CascadeConfirmSheet } from '../components/itinerary/CascadeConfirmSheet';
import { AddStopFlow } from '../components/itinerary/AddStopFlow';
import { onStopAdded } from '../utils/homebaseEngine';

export default function TripPlanner({ onBackToDashboard, onOpenMoodboard }) {
  const { trip, legs, stays, pois, dayLoops, manifestSettings, cloning,
          addStopToDayLoop, addDayLoop, setTripPlanningMode, dispatch } = useTripStore();
  const destinationId = trip.destination?.split(',')[0].toLowerCase().replace(/[^a-z]/g, '') ?? 'default';
  const mapCenter = DESTINATION_CENTERS[destinationId] ?? DESTINATION_CENTERS.patagonia;
  const { theme } = useTheme();
  const labels = useLabels();
  const [launched, setLaunched] = useState(false);
  const [tab, setTab] = useState('OVERVIEW');
  const [tacticalMode, setTacticalMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [inspireOpen, setInspireOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeLegId, setActiveLegId] = useState(null);
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

  useEffect(() => {
    if (tab !== 'DISCOVERY' || !trip?.destination) return;
    const city = trip.destination.split(',')[0].trim();
    setAttractionsLoading(true);
    searchAttractions(city, attractionCategory)
      .then(setAttractions)
      .finally(() => setAttractionsLoading(false));
  }, [tab, trip?.destination, attractionCategory]);

  useEffect(() => {
    if (tab !== 'DISCOVERY' || !trip?.destination) return;
    const city = trip.destination.split(',')[0].trim();
    setFoodLoading(true);
    searchFood(city, foodCategory)
      .then(setFood)
      .finally(() => setFoodLoading(false));
  }, [tab, trip?.destination, foodCategory]);

  function handleDiscoveryPinClick(id) {
    setSelectedDiscoveryId(id);
    document.getElementById(`discovery-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
          activeTab={tab}
          onTabChange={setTab}
          onOpenProfile={() => setProfileOpen(true)}
          onBackToDashboard={onBackToDashboard}
          onOpenChat={() => setChatOpen(true)}
          onOpenInspire={() => setInspireOpen(true)}
          onOpenTactical={() => setTacticalMode(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        >
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

          {/* CalendarStrip — always visible */}
          <CalendarStrip
            trip={trip}
            dayLoops={dayLoops}
            stays={stays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Tab content */}
          <div className="p-6">
            {tab === 'OVERVIEW' && (
  <div className="space-y-3">
    {/* Row 1: Map (70%) + Path timeline (30%) */}
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: '0 0 70%', position: 'relative', minHeight: 320 }}>
        <RouteMap style={{ height: 320 }} />
        <AnimatePresence>
          {activeLegId && (
            <LegHud
              leg={legs.find(l => l.id === activeLegId)}
              onClose={() => setActiveLegId(null)}
            />
          )}
        </AnimatePresence>
        {/* Leg quick-launch strip */}
        {legs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {legs.filter(l => l.status === 'confirmed').map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLegId(activeLegId === l.id ? null : l.id)}
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
      {/* Path timeline — right column */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TimelinePath />
      </div>
    </div>

    {/* Row 2: GPX + Elevation full width */}
    <GpxPanel />
    <ElevationStrip />

    {/* Row 3: Safety ticker */}
    <SafetyTicker destinationId={destinationId} center={mapCenter} zoom={8} />
  </div>
)}

            {tab === 'ITINERARY' && (
              <div className="space-y-6">
                {/* DayLoopPanel: shown when a CalendarStrip date is selected */}
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
                              const result = onStopAdded({
                                dayLoop,
                                stop,
                                homebaseCoords: stay?.coords ?? [0, 0],
                                allStops: updatedStops,
                                mode: effectiveMode,
                                dispatch,
                              });
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
                <BudgetLoom />
              </div>
            )}

            {tab === 'PUBLIC TRANSPORT' && (
              <div className="max-w-2xl space-y-4">
                <PublicTransport destination={trip.destination} />
              </div>
            )}

            {tab === 'STAYS' && (
              <div className="max-w-2xl space-y-4">
                <AccommodationSearch destination={trip.destination} />
              </div>
            )}

            {tab === 'LOGISTICS' && (
              <div className="space-y-4">
                <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
              </div>
            )}

            {tab === 'DISCOVERY' && (
              <div className="space-y-4">
                <DiscoveryMap
                  attractionPins={attractions}
                  foodPins={food}
                  selectedId={selectedDiscoveryId}
                  onPinClick={handleDiscoveryPinClick}
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

            {tab === 'VAULT' && (
              <VentureVault onCloneComplete={() => setTab('OVERVIEW')} />
            )}
          </div>
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
