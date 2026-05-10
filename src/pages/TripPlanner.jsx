import { useState } from 'react';
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
import FlightScout from '../components/logistics/FlightScout';
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
import VibeCheck from '../components/discovery/VibeCheck';
import SafetyPulse from '../components/logistics/SafetyPulse';
import ARGhostTours from '../components/ar/ARGhostTours';
import InspirePanel from '../components/inspire/InspirePanel';
import JourneyTab from '../components/journey/JourneyTab';

export default function TripPlanner({ onBackToDashboard }) {
  const { trip, legs, manifestSettings, cloning } = useTripStore();
  const { theme } = useTheme();
  const labels = useLabels();
  const [launched, setLaunched] = useState(false);
  const [tab, setTab] = useState('OVERVIEW');
  const [tacticalMode, setTacticalMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [inspireOpen, setInspireOpen] = useState(false);

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

          {/* JOURNEY tab — full-height, no p-6 padding */}
          {tab === 'JOURNEY' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <JourneyTab />
            </div>
          )}

          {/* Tab content */}
          {tab !== 'JOURNEY' && <div className="p-6">
            {tab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 space-y-4">
                  <RouteMap />
                  <TimelinePath />
                  <SafetyPulse destinationId="patagonia" center={[-51.6, -72.7]} zoom={8} />
                </div>
                <div className="space-y-4">
                  <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
                </div>
              </div>
            )}

            {tab === 'ITINERARY' && (
              <div className="space-y-6">
                <LedgerWorkbench />
                <KanbanBoard tripName={trip.name} />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2"><TransitMap /></div>
                  <div className="lg:col-span-3"><LegGuide /></div>
                </div>
                <BudgetLoom />
              </div>
            )}

            {tab === 'FLIGHTS' && (
              <div className="max-w-2xl space-y-4">
                <FlightScout destination={trip.destination} />
              </div>
            )}

            {tab === 'STAYS' && (
              <div className="max-w-2xl space-y-4">
                <AccommodationSearch />
              </div>
            )}

            {tab === 'LOGISTICS' && (
              <div className="space-y-4 max-w-5xl">
                <BentoPacker climate={manifestSettings.climate} days={manifestSettings.days} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
                  </div>
                  <PackingEngine />
                </div>
                <VehicleSearch distanceKm={legs.reduce((s, l) => s + l.distanceKm, 0)} />
              </div>
            )}

            {tab === 'DISCOVERY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <VibeCheck destinationId={trip.destination} tripName={trip.name} />
                <ARGhostTours destinationId="patagonia" center={[-50.97, -73.0]} />
                <MustSee destination={trip.destination} />
                <LocalFlavor destination={trip.destination} />
                <BasecampScout destination={trip.destination} />
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
