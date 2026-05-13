// VenturePath · Phase 2+3 · Gathering detail modal with social tabs
// REQUIRES UGC POLICY LINK IN APP STORE METADATA (public gatherings)
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTripStore } from '../../store/useTripStore';
import { generatePackingList } from '../../utils/packingLogic';
import {
  getGatheringBundle, setRsvp, inviteByHandle,
  claimRole, unclaimRole, deleteGathering, reportGathering,
  addGear, deleteGear, claimGear, unclaimGear, bulkAddGear,
} from '../../lib/gatherings/api';
import { resolveAccent, resolveIcon } from '../../lib/gatherings/templates';
import Beacon from './Beacon';
import GatheringChat from './GatheringChat';
import GatheringLedger from './GatheringLedger';
import ArcEditor from './ArcEditor';

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(14,16,18,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#0E1012',
    border: '1px solid rgba(255,255,255,0.12)',
    width: '100%', maxWidth: 620,
    maxHeight: '92vh', overflowY: 'auto',
    fontFamily: "'JetBrains Mono', monospace",
  },
  sectionTitle: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginBottom: 8,
  },
  section: { padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  label: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
  },
  input: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  btnSmall: (color) => ({
    background: color + '22', color, border: `1px solid ${color}55`,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '5px 10px', cursor: 'pointer',
  }),
  tabBar: {
    display: 'flex', gap: 0,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
  },
  tab: (active, accent) => ({
    flex: 1, padding: '10px 8px',
    background: 'none', border: 'none',
    borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
    color: active ? accent : 'rgba(255,255,255,0.4)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    cursor: 'pointer', fontWeight: active ? 700 : 400,
  }),
};

const RSVP_OPTIONS = [
  { value: 'yes',   label: 'YES',   color: '#4ade80' },
  { value: 'maybe', label: 'MAYBE', color: '#F2C94C' },
  { value: 'no',    label: 'NO',    color: '#ef4444' },
];

const TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'chat',     label: 'CHAT' },
  { id: 'ledger',   label: 'LEDGER' },
  { id: 'arc',      label: 'ARC' },
  { id: 'gear',     label: 'GEAR' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function GatheringDetail({ gatheringId, onClose, onDeleted }) {
  const { architect } = useAuth();
  const { manifestSettings } = useTripStore();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const [inviteHandle, setInviteHandle] = useState('');
  const [inviting, setInviting]         = useState(false);
  const [inviteMsg, setInviteMsg]       = useState(null);

  const [reportReason, setReportReason] = useState('');
  const [reportOpen, setReportOpen]     = useState(false);
  const [reporting, setReporting]       = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newGearItem, setNewGearItem] = useState('');
  const [pullingManifest, setPullingManifest] = useState(false);

  async function reload() {
    setLoading(true);
    const { data } = await getGatheringBundle(gatheringId);
    setBundle(data);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [gatheringId]);

  if (loading || !bundle) {
    return (
      <div style={S.overlay}>
        <div style={{ ...S.modal, padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.12em' }}>
          ▢▢▢ LOADING GATHERING
        </div>
      </div>
    );
  }

  const accent      = resolveAccent(bundle);
  const icon        = resolveIcon(bundle);
  const isConvener  = bundle.convener_id === architect?.id;
  const myAttendance = bundle.attendees?.find(a => a.pioneer_id === architect?.id);
  const myRsvp      = myAttendance?.rsvp_status;

  async function handleRsvp(status) {
    if (!architect?.id) return;
    await setRsvp(gatheringId, architect.id, status);
    await reload();
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteHandle.trim()) return;
    setInviting(true);
    const { error } = await inviteByHandle(gatheringId, inviteHandle.trim(), architect.id);
    setInviting(false);
    if (error) setInviteMsg({ type: 'error', text: error.message });
    else { setInviteMsg({ type: 'success', text: `@${inviteHandle} invited.` }); setInviteHandle(''); await reload(); }
  }

  async function handleClaimRole(roleId, currentAssignee) {
    if (!architect?.id) return;
    if (currentAssignee === architect.id) await unclaimRole(roleId, architect.id);
    else await claimRole(roleId, architect.id);
    await reload();
  }

  async function handleReport(e) {
    e.preventDefault();
    if (!reportReason.trim() || !architect?.id) return;
    setReporting(true);
    await reportGathering(gatheringId, architect.id, reportReason);
    setReporting(false);
    setReportOpen(false);
    setReportReason('');
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await deleteGathering(gatheringId);
    onDeleted?.();
  }

  async function handleAddGear(e) {
    e.preventDefault();
    if (!newGearItem.trim() || !isConvener) return;
    await addGear(gatheringId, newGearItem.trim());
    setNewGearItem('');
    await reload();
  }

  async function handleDeleteGear(gearId) {
    await deleteGear(gearId);
    await reload();
  }

  async function handleClaimGear(gear) {
    if (!architect?.id) return;
    if (gear.claimed_by === architect.id) await unclaimGear(gear.id, architect.id);
    else if (!gear.claimed_by) await claimGear(gear.id, architect.id);
    await reload();
  }

  async function handlePullFromManifest() {
    if (!isConvener || pullingManifest) return;
    setPullingManifest(true);
    const climate = manifestSettings?.climate ?? 'temperate';
    const days    = manifestSettings?.days ?? 7;
    const { items } = generatePackingList({ climate, days, hasChildren: manifestSettings?.hasChildren ?? false });
    // De-dupe against existing gear by lowercase label
    const existing = new Set((bundle.gear ?? []).map(g => g.item.toLowerCase()));
    const toAdd = items
      .filter(it => !existing.has((it.label ?? it.name ?? '').toLowerCase()))
      .slice(0, 30) // safety cap
      .map(it => ({
        item:      it.label ?? it.name ?? 'Unknown',
        qty:       it.qty ?? 1,
        category:  it.category ?? null,
        weight_kg: it.weight ?? null,
        source:    'packing_manifest',
      }));
    if (toAdd.length) await bulkAddGear(gatheringId, toAdd);
    setPullingManifest(false);
    await reload();
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        {/* Banner header */}
        <div style={{
          background: `linear-gradient(135deg, ${accent}33 0%, rgba(14,16,18,0) 100%)`,
          borderBottom: `1px solid ${accent}33`,
          padding: '20px 20px 16px',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', marginBottom: 2 }}>
                {bundle.title}
              </div>
              {bundle.vibe_tag && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginBottom: 4 }}>
                  "{bundle.vibe_tag}"
                </div>
              )}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                {bundle.location_label && <span>◈ {bundle.location_label}   </span>}
                <span>◷ {formatDate(bundle.starts_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Beacon (always visible) */}
        <div style={{ padding: '12px 20px 0' }}>
          <Beacon gathering={bundle} />
        </div>

        {/* RSVP (always visible if not convener) */}
        {!isConvener && (
          <div style={S.section}>
            <div style={S.sectionTitle}>YOUR RSVP</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {RSVP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleRsvp(opt.value)}
                  style={{
                    ...S.btnSmall(opt.color),
                    fontWeight: myRsvp === opt.value ? 700 : 400,
                    background: myRsvp === opt.value ? opt.color + '33' : opt.color + '11',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.id} style={S.tab(tab === t.id, accent)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {bundle.arc?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>ARC — AGENDA</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bundle.arc.map((block, i) => (
                    <div key={block.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 9, color: accent, fontWeight: 700, minWidth: 20, paddingTop: 1 }}>
                        {i + 1}.
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#fff' }}>{block.title}</div>
                        {block.note && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{block.note}</div>}
                      </div>
                      {block.duration_min && (
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                          {block.duration_min}m
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bundle.roles?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>ROLES — CLAIM YOUR POSITION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bundle.roles.map(role => {
                    const isMine = role.assigned_to === architect?.id;
                    const isTaken = role.assigned_to && !isMine;
                    return (
                      <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isMine ? accent + '66' : 'rgba(255,255,255,0.08)'}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: isMine ? accent : '#fff', fontWeight: isMine ? 700 : 400 }}>
                            {role.label}
                          </div>
                          {role.description && (
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{role.description}</div>
                          )}
                        </div>
                        {role.claimable && !isTaken && (
                          <button onClick={() => handleClaimRole(role.id, role.assigned_to)} style={S.btnSmall(isMine ? '#ef4444' : accent)}>
                            {isMine ? 'UNCLAIM' : 'CLAIM'}
                          </button>
                        )}
                        {isTaken && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>TAKEN</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bundle.attendees?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>ROSTER — {bundle.attendees.length} PIONEER{bundle.attendees.length !== 1 ? 'S' : ''}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bundle.attendees.map(a => {
                    const rsvpColor = a.rsvp_status === 'yes' ? '#4ade80' : a.rsvp_status === 'no' ? '#ef4444' : a.rsvp_status === 'maybe' ? '#F2C94C' : 'rgba(255,255,255,0.3)';
                    return (
                      <div key={a.id} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }}>
                        <span style={{ color: '#fff' }}>@{a.profile?.handle ?? '…'}</span>
                        <span style={{ marginLeft: 5, fontSize: 8, color: rsvpColor }}>{a.rsvp_status.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isConvener && (
              <div style={S.section}>
                <div style={S.sectionTitle}>INVITE BY HANDLE</div>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...S.input, flex: 1 }} value={inviteHandle} onChange={e => setInviteHandle(e.target.value)} placeholder="@handle" />
                  <button type="submit" style={S.btnSmall(accent)} disabled={inviting}>
                    {inviting ? '…' : 'INVITE'}
                  </button>
                </form>
                {inviteMsg && (
                  <div style={{ fontSize: 10, color: inviteMsg.type === 'error' ? '#ef4444' : '#4ade80', marginTop: 6 }}>
                    {inviteMsg.text}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CHAT TAB ─────────────────────────────────────── */}
        {tab === 'chat' && (
          <div style={{ padding: '12px 16px 16px' }}>
            <GatheringChat gatheringId={gatheringId} />
          </div>
        )}

        {/* ── LEDGER TAB ───────────────────────────────────── */}
        {tab === 'ledger' && (
          <div style={{ padding: '12px 16px 16px' }}>
            <GatheringLedger
              gatheringId={gatheringId}
              conveyorId={bundle.convener_id}
              gathering={bundle}
              onAdopted={reload}
            />
          </div>
        )}

        {/* ── ARC TAB ──────────────────────────────────────── */}
        {tab === 'arc' && (
          <div style={{ padding: '12px 16px 16px' }}>
            <ArcEditor
              gatheringId={gatheringId}
              isConvener={isConvener}
              roles={bundle.roles ?? []}
              onChanged={reload}
            />
          </div>
        )}

        {/* ── GEAR TAB ─────────────────────────────────────── */}
        {tab === 'gear' && (
          <div style={S.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={S.sectionTitle}>GEAR — {bundle.gear?.length ?? 0} ITEMS</div>
              {isConvener && (
                <button onClick={handlePullFromManifest} style={S.btnSmall('#E67E22')} disabled={pullingManifest}>
                  {pullingManifest ? '…' : '+ FROM PACKING MANIFEST'}
                </button>
              )}
            </div>

            {isConvener && (
              <form onSubmit={handleAddGear} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input style={{ ...S.input, flex: 1 }} value={newGearItem} onChange={e => setNewGearItem(e.target.value)} placeholder="Add a gear item…" />
                <button type="submit" style={S.btnSmall(accent)}>+ ADD</button>
              </form>
            )}

            {bundle.gear?.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>
                No gear yet. Convener — add items or pull from the packing manifest.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {bundle.gear.map(g => {
                  const isMine = g.claimed_by === architect?.id;
                  const isTaken = g.claimed_by && !isMine;
                  return (
                    <div key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: accent, fontSize: 10 }}>◈</span>
                      <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{g.item}</span>
                      {g.qty > 1 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>×{g.qty}</span>}
                      {g.source === 'packing_manifest' && (
                        <span style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(230,126,34,0.15)', color: '#E67E22', letterSpacing: '0.1em' }}>MANIFEST</span>
                      )}
                      {!isTaken && (
                        <button onClick={() => handleClaimGear(g)} style={S.btnSmall(isMine ? '#ef4444' : '#4ade80')}>
                          {isMine ? 'DROP' : 'CLAIM'}
                        </button>
                      )}
                      {isTaken && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>✓ TAKEN</span>}
                      {isConvener && (
                        <button onClick={() => handleDeleteGear(g.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Report + Delete (footer, always visible) */}
        <div style={{ ...S.section, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isConvener && (
            <>
              <button onClick={() => setReportOpen(v => !v)} style={S.btnSmall('rgba(255,255,255,0.4)')}>
                REPORT GATHERING
              </button>
              {reportOpen && (
                <form onSubmit={handleReport} style={{ width: '100%', marginTop: 8 }}>
                  <input style={{ ...S.input, marginBottom: 6 }} value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Reason for report" required />
                  <button type="submit" style={S.btnSmall('#ef4444')} disabled={reporting}>
                    {reporting ? 'SENDING…' : 'SUBMIT REPORT'}
                  </button>
                </form>
              )}
            </>
          )}
          {isConvener && (
            <button onClick={handleDelete} style={S.btnSmall('#ef4444')} disabled={deleting}>
              {confirmDelete ? '⚠ CONFIRM DELETE' : 'DELETE GATHERING'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
