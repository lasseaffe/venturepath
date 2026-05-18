import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';
import GpxImportDialogV2 from './GpxImportDialog.v2.jsx';
import { tracksToLegPatch, deriveClimateFromTrack, buildCostEntryForTrack, cacheTrackForTactical } from '../../services/trackEmitters.js';
import { ADD_TRACK } from '../../store/slices/tracks.js';
import { useExpedition } from '../../context/ExpeditionContext.jsx';
import { exportLegsToGpx, downloadGpx } from '../../utils/gpxExporter';

export default function GpxPanel() {
  const { trip, legs, dispatch, addLeg, replaceLegs } = useTripStore();
  const { nominate } = useExpedition();
  const fileInputRef = useRef(null);

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingTrack, setPendingTrack] = useState(null);
  const [multiTrackWarning, setMultiTrackWarning] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  function flashSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleExport() {
    if (legs.length === 0) {
      setError('No legs to export — add stops to your itinerary first.');
      return;
    }
    setError(null);
    setExporting(true);
    try {
      const gpx = await exportLegsToGpx(legs, trip);
      if (!gpx) throw new Error('Export failed — no geocodable stops found.');
      downloadGpx(gpx, trip.name);
      flashSuccess(`↓ ${trip.name}.gpx downloaded`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const tracks = parseGpxToTracks(text);
      const track = tracks[0] ?? null;
      if (!track) throw new Error('GPX file contains no usable tracks.');
      setPendingTrack(track);
      setMultiTrackWarning(tracks.length > 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.gpx')) handleFile(file);
    else setError('Please drop a .gpx file.');
  }

  function handleConfirm(mode) {
    if (!pendingTrack) return;
    dispatch({ type: ADD_TRACK, payload: pendingTrack });
    const legPatch = tracksToLegPatch(pendingTrack);
    if (legPatch) {
      if (mode === 'replace-with-leg') {
        dispatch({ type: 'REPLACE_LEGS', payload: [legPatch] });
      } else {
        dispatch({ type: 'ADD_LEG', payload: legPatch });
      }
    }
    // Climate → PackingManifest
    const climate = deriveClimateFromTrack(pendingTrack);
    if (climate) {
      dispatch({ type: 'UPDATE_MANIFEST_SETTINGS', payload: { climate: climate.climateBand } });
    }

    // Cost → LedgerWorkbench nomination pool
    const costEntry = buildCostEntryForTrack(pendingTrack);
    if (costEntry) nominate(costEntry);

    // Track → TacticalMode offline cache (fire-and-forget)
    cacheTrackForTactical(pendingTrack);

    flashSuccess('Track imported as Leg');
    setPendingTrack(null);
    setMultiTrackWarning(false);
  }

  return (
    <>
      <div style={{
        display: 'flex', gap: 10, alignItems: 'stretch',
        border: '1px solid #1a1f24', borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {/* Export side */}
        <button
          onClick={handleExport}
          disabled={exporting}
          title="Export itinerary as .gpx"
          style={{
            flex: '0 0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '12px 20px',
            background: 'transparent',
            border: 'none', borderRight: '1px solid #1a1f24',
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          <div style={{
            fontSize: 18,
            color: exporting ? '#484440' : '#E67E22',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}>
            ↓
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: exporting ? '#484440' : '#8A8680',
            whiteSpace: 'nowrap',
          }}>
            {exporting ? 'EXPORTING…' : 'EXPORT GPX'}
          </div>
        </button>

        {/* Import drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '12px 16px',
            cursor: importing ? 'wait' : 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: importing ? '#484440' : '#F2EDE8',
          }}>
            {importing ? 'PARSING…' : '↑ IMPORT GPX'}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: '#484440', textAlign: 'center',
          }}>
            {importing ? 'reading file…' : 'drop .gpx or click to browse'}
          </div>
        </div>

        {/* Status pill */}
        {(successMsg || error) && (
          <div style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center',
            padding: '0 14px', borderLeft: '1px solid #1a1f24',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.04em',
              color: successMsg ? '#5C9A6A' : '#C03030',
              maxWidth: 180,
            }}>
              {successMsg ?? error}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingTrack && (
          <GpxImportDialogV2
            track={pendingTrack}
            multiTrackWarning={multiTrackWarning}
            onConfirm={handleConfirm}
            onCancel={() => { setPendingTrack(null); setMultiTrackWarning(false); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
