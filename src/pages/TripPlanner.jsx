import { useState, useEffect } from 'react';
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
import SafetyPulse from '../components/logistics/SafetyPulse';
import ARGhostTours from '../components/ar/ARGhostTours';
import { DESTINATION_CENTERS } from '../utils/destinationEngine';
import { searchAttractions, searchFood } from '../utils/osmEngine.js';
import DiscoveryMap from '../components/discovery/DiscoveryMap.jsx';
import InspirePanel from '../components/inspire/InspirePanel';
import SettingsPanel from '../components/settings/SettingsPanel';

export default function TripPlanner({ onBackToDashboard, onOpenMoodboard }) {
  const { trip, legs, manifestSettings, cloning } = useTripStore();
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
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === 'OVERVIEW' && (
              <div className="space-y-4">
                <div style={{ position: 'relative' }}>
                  <RouteMap />
                  <AnimatePresence>
                    {activeLegId && (
                      <LegHud
                        leg={legs.find(l => l.id === activeLegId)}
                        onClose={() => setActiveLegId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                {/* Active leg quick-launch strip */}
                {legs.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {legs.filter(l => l.status === 'confirmed').map(l => (
                      <button
                        key={l.id}
                        onClick={() => setActiveLegId(activeLegId === l.id ? null : l.id)}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          letterSpacing: '0.08em',
                          padding: '3px 10px',
                          borderRadius: 2,
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
                <GpxPanel />
                <ElevationStrip />
                <TimelinePath />
                <SafetyPulse destinationId={destinationId} center={mapCenter} zoom={8} />
              </div>
            )}

            {tab === 'ITINERARY' && (
              <div className="space-y-6">
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
                <AccommodationSearch />
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
                  <VibeCheck destinationId={destinationId} tripName={trip.name} />
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
