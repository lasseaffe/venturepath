import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTripStore } from '../store/useTripStore';
import TransitMap from '../components/itinerary/TransitMap';
import RouteMap from '../components/itinerary/RouteMap';
import LegGuide from '../components/itinerary/LegGuide';
import KanbanBoard from '../components/itinerary/KanbanBoard';
import LedgerWorkbench from '../components/itinerary/ledger/LedgerWorkbench';
import PackingManifest from '../components/logistics/PackingManifest';
import FlightScout from '../components/logistics/FlightScout';
import VehicleSearch from '../components/logistics/VehicleSearch';
import PackingEngine from '../components/logistics/PackingEngine';
import TimelinePath from '../components/itinerary/TimelinePath';
import MustSee from '../components/discovery/MustSee';
import LocalFlavor from '../components/discovery/LocalFlavor';
import BasecampScout from '../components/discovery/BasecampScout';
import VentureVault from '../components/discovery/VentureVault';
import LaunchSequence from '../components/ui/LaunchSequence';
import TacticalMode from '../components/ui/TacticalMode';
import PioneerChat from '../components/social/PioneerChat';
import ArchitectProfile from '../components/social/ArchitectProfile';

const TABS = ['OVERVIEW', 'ITINERARY', 'LOGISTICS', 'DISCOVERY', 'VAULT'];

export default function TripPlanner({ onBackToDashboard }) {
  const { trip, legs, manifestSettings, cloning } = useTripStore();
  const [launched, setLaunched] = useState(false);
  const [tab, setTab] = useState('OVERVIEW');
  const [tacticalMode, setTacticalMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (tacticalMode) {
    return <TacticalMode onExit={() => setTacticalMode(false)} />;
  }

  if (profileOpen) {
    return <ArchitectProfile onClose={() => setProfileOpen(false)} />;
  }

  return (
    <>
      {!launched && <LaunchSequence cloning={cloning} onComplete={() => setLaunched(true)} />}

      <div className={`min-h-screen bg-[#0E1012] transition-opacity duration-700 ${launched ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top bar */}
        <header className="border-b border-[#2a2f36] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="text-slate-500 hover:text-white font-mono text-xs mr-2"
              >
                ← DASH
              </button>
            )}
            <div className="w-6 h-6 border border-[#E67E22] rotate-45 shrink-0" />
            <span className="text-white font-mono font-bold tracking-[0.2em] text-sm uppercase">VenturePath</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500">{trip.destination}</span>
            <span className="px-2 py-0.5 border border-[#E67E22]/50 text-[#E67E22] rounded">
              {trip.status}
            </span>
            <button
              onClick={() => setTacticalMode(true)}
              className="px-2 py-0.5 border border-amber-400/40 text-amber-400 rounded hover:bg-amber-400/10 transition-colors"
              title="Tactical Mode (offline)"
            >
              ⚡ TACTICAL
            </button>
          </div>
        </header>

        {/* Mission brief */}
        <div className="px-6 py-6 border-b border-[#2a2f36]">
          <div className="label-tag mb-1">Active Mission</div>
          <h1 className="text-2xl font-editorial text-white">{trip.name}</h1>
          <div className="flex flex-wrap gap-6 mt-3 text-xs font-mono text-slate-400">
            <Stat label="DEPARTURE" value={trip.startDate} />
            <Stat label="RETURN"    value={trip.endDate} />
            <Stat label="DURATION"  value={`${trip.days} days`} />
            <Stat label="CLIMATE"   value={trip.climate} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2f36] px-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-4 text-xs font-mono tracking-widest transition-colors border-b-2 ${
                tab === t
                  ? 'border-[#E67E22] text-[#E67E22]'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="p-6 pb-28">
          {tab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3">
                <RouteMap />
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
            </div>
          )}

          {tab === 'LOGISTICS' && (
            <div className="space-y-4 max-w-5xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
                </div>
                <PackingEngine />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FlightScout destination={trip.destination} />
                <VehicleSearch distanceKm={legs.reduce((s, l) => s + l.distanceKm, 0)} />
              </div>
            </div>
          )}

          {tab === 'DISCOVERY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <MustSee destination={trip.destination} />
              <LocalFlavor destination={trip.destination} />
              <BasecampScout destination={trip.destination} />
            </div>
          )}

          {tab === 'VAULT' && (
            <VentureVault onCloneComplete={() => setTab('OVERVIEW')} />
          )}
        </main>
      </div>

      {/* PioneerChat overlay */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-20 right-6 z-30 w-96"
          >
            <PioneerChat onClose={() => setChatOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Glass Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="glass-panel px-4 py-3 flex gap-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-[10px] font-mono tracking-widest rounded transition-colors ${
                tab === t
                  ? 'text-[#E67E22] bg-[#E67E22]/10'
                  : 'text-slate-400 hover:text-[#F2C94C] hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="w-px bg-white/10 mx-1" />
          <button
            onClick={() => setChatOpen(c => !c)}
            className={`px-3 py-2 text-[10px] font-mono tracking-widest rounded transition-colors ${
              chatOpen ? 'text-[#E67E22] bg-[#E67E22]/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            CHAT
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            className="px-3 py-2 text-[10px] font-mono tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            ME
          </button>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="label-tag text-[10px]">{label}</div>
      <div className="text-white mt-0.5">{value}</div>
    </div>
  );
}
