import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getGatheringBundle, setRsvp, inviteByHandle, claimRole, unclaimRole, addGear, deleteGear, claimGear, unclaimGear, bulkAddGear, deleteGathering, reportGathering, publishAsCharter, updateGathering } from '../../lib/gatherings/api.js';
import { resolveAccent, getTemplate } from '../../lib/gatherings/templates.js';
import GatheringChat from './GatheringChat.jsx';
import GatheringLedger from './GatheringLedger.jsx';
import ArcEditor from './ArcEditor.jsx';
import Beacon from './Beacon.jsx';

const S = {
  overlay: { position: 'fixed', inset: 0, background: '#000a', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: '#0E1012', width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: 'JetBrains Mono, monospace', border: '1px solid #222', borderBottom: 'none' },
  header: (accent) => ({ background: accent + '22', borderBottom: `2px solid ${accent}`, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
  title: { color: '#fff', fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 700 },
  close: { background: 'none', border: 'none', color: '#888', fontSize: '1.1rem', cursor: 'pointer', padding: '0.25rem' },
  tabs: { display: 'flex', borderBottom: '1px solid #222' },
  tab: (active, accent) => ({ flex: 1, padding: '0.65rem 0.25rem', background: 'none', border: 'none', borderBottom: active ? `2px solid ${accent}` : '2px solid transparent', color: active ? accent : '#666', fontSize: '0.6rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  body: { flex: 1, overflowY: 'auto', padding: '1.25rem' },
  sectionTitle: { color: '#888', fontSize: '0.6rem', letterSpacing: '0.15em', marginBottom: '0.75rem', marginTop: '1.25rem' },
  pill: (color) => ({ display: 'inline-block', padding: '0.2rem 0.5rem', background: color + '22', color, fontSize: '0.6rem', letterSpacing: '0.1em', marginRight: '0.4rem', marginBottom: '0.4rem' }),
  roleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' },
  btn: (color = '#E67E22', sm = false) => ({ padding: sm ? '0.3rem 0.7rem' : '0.6rem 1.2rem', background: color, border: 'none', color: '#fff', fontSize: sm ? '0.6rem' : '0.7rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  ghost: (sm = false) => ({ padding: sm ? '0.3rem 0.7rem' : '0.6rem 1.2rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: sm ? '0.6rem' : '0.7rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' },
  gearRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a', fontSize: '0.8rem', color: '#D9C5B2' },
  rsvpRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  footer: { padding: '0.75rem 1.25rem', borderTop: '1px solid #1a1a1a', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  ok: { color: '#27AE60', fontSize: '0.7rem' },
  err: { color: '#e74c3c', fontSize: '0.7rem' },
};

const TABS = ['OVERVIEW', 'CHAT', 'LEDGER', 'ARC', 'GEAR'];

export default function GatheringDetail({ gatheringId, onClose, onDeleted, onChartered }) {
  const { profile } = useAuth();
  const [bundle, setBundle]   = useState(null);
  const [tab, setTab]         = useState('OVERVIEW');
  const [inviteH, setInviteH] = useState('');
  const [gearItem, setGearItem] = useState('');
  const [msg, setMsg]         = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const reload = useCallback(async () => {
    const data = await getGatheringBundle(gatheringId);
    setBundle(data);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  if (!bundle) return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.sheet, padding: '2rem', color: '#E67E22', fontSize: '0.8rem' }}>
        ▢▢▢ LOADING GATHERING...
      </div>
    </div>
  );

  const accent     = resolveAccent(bundle);
  const tpl        = getTemplate(bundle.template_id);
  const isConvener = profile?.id === bundle.convener_id;
  const myAttendee = bundle.attendees?.find(a => a.pioneer_id === profile?.id);
  const myRsvp     = myAttendee?.rsvp_status ?? null;

  async function doRsvp(rsvp) {
    await setRsvp(gatheringId, rsvp);
    reload();
  }

  async function doInvite() {
    if (!inviteH.trim()) return;
    setMsg(null);
    const { error } = await inviteByHandle(gatheringId, inviteH.trim().replace('@', ''));
    if (error) setMsg({ type: 'err', text: error.message });
    else { setMsg({ type: 'ok', text: `@${inviteH} invited` }); setInviteH(''); reload(); }
  }

  async function doClaimRole(roleId) {
    await claimRole(roleId); reload();
  }

  async function doUnclaimRole(roleId) {
    await unclaimRole(roleId); reload();
  }

  async function doAddGear() {
    if (!gearItem.trim()) return;
    await addGear(gatheringId, { item: gearItem.trim(), qty: 1, category: 'General', weight_kg: 0 });
    setGearItem(''); reload();
  }

  async function doDelete() {
    if (!window.confirm('Delete this Gathering? This cannot be undone.')) return;
    await deleteGathering(gatheringId);
    onDeleted?.();
    onClose?.();
  }

  async function doReport(e) {
    e.preventDefault();
    await reportGathering(gatheringId, reportReason);
    setReporting(false);
    setMsg({ type: 'ok', text: 'Report filed — our crew will review it' });
  }

  async function doPublishCharter() {
    if (!window.confirm('Publish this Gathering as a clonable Charter in VentureVault?')) return;
    const { data, error } = await publishAsCharter(gatheringId);
    if (error) setMsg({ type: 'err', text: error.message });
    else { setMsg({ type: 'ok', text: 'Charter published in VentureVault' }); onChartered?.(data); reload(); }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={S.header(accent)}>
          <div>
            <div style={{ color: accent, fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
              {tpl.label.toUpperCase()} · {bundle.status?.toUpperCase()}
            </div>
            <div style={S.title}>{bundle.title}</div>
            {bundle.location_label && <div style={{ color: '#D9C5B2', fontSize: '0.7rem' }}>◎ {bundle.location_label}</div>}
          </div>
          <button style={S.close} onClick={onClose}>✕</button>
        </div>

        {/* tabs */}
        <div style={S.tabs}>
          {TABS.map(t => (
            <button key={t} style={S.tab(tab === t, accent)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* body */}
        <div style={S.body}>
          {/* OVERVIEW */}
          {tab === 'OVERVIEW' && (
            <>
              {/* Beacon (day-of) */}
              <Beacon gathering={bundle} isAttendee={!!myAttendee} />

              {/* RSVP */}
              <div style={S.sectionTitle}>YOUR RSVP</div>
              <div style={S.rsvpRow}>
                {['yes', 'maybe', 'no'].map(r => (
                  <button key={r} style={S.btn(myRsvp === r ? accent : '#333')} onClick={() => doRsvp(r)}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Arc read-only */}
              {bundle.arc_blocks?.length > 0 && (
                <>
                  <div style={S.sectionTitle}>ARC</div>
                  {bundle.arc_blocks.map(b => (
                    <div key={b.id} style={{ paddingLeft: '0.5rem', borderLeft: `2px solid ${accent}55`, marginBottom: '0.5rem' }}>
                      <div style={{ color: '#D9C5B2', fontSize: '0.8rem' }}>{b.title}</div>
                      {b.duration_min && <div style={{ color: '#666', fontSize: '0.7rem' }}>{b.duration_min} min</div>}
                    </div>
                  ))}
                </>
              )}

              {/* Roles */}
              {bundle.roles?.length > 0 && (
                <>
                  <div style={S.sectionTitle}>ROLES</div>
                  {bundle.roles.map(r => {
                    const isMine = r.assigned_to === profile?.id;
                    const isTaken = !!r.assigned_to && !isMine;
                    return (
                      <div key={r.id} style={S.roleRow}>
                        <div>
                          <div style={{ color: '#D9C5B2', fontSize: '0.8rem' }}>{r.label}</div>
                          <div style={{ color: '#666', fontSize: '0.65rem' }}>{r.description}</div>
                        </div>
                        {r.claimable && !isTaken && !isMine && (
                          <button style={S.btn(accent, true)} onClick={() => doClaimRole(r.id)}>CLAIM</button>
                        )}
                        {isMine && (
                          <button style={S.ghost(true)} onClick={() => doUnclaimRole(r.id)}>DROP</button>
                        )}
                        {isTaken && <span style={{ color: '#666', fontSize: '0.65rem' }}>CLAIMED</span>}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Roster */}
              <div style={S.sectionTitle}>ROSTER ({bundle.attendees?.length ?? 0})</div>
              {bundle.attendees?.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #1a1a1a', fontSize: '0.75rem' }}>
                  <span style={{ color: '#D9C5B2' }}>{a.pioneer_id === bundle.convener_id ? '★ ' : ''}{a.pioneer_id}</span>
                  <span style={{ color: a.rsvp_status === 'yes' ? '#27AE60' : a.rsvp_status === 'no' ? '#e74c3c' : '#888' }}>
                    {a.rsvp_status?.toUpperCase()}
                  </span>
                </div>
              ))}

              {/* Invite by handle (convener only) */}
              {isConvener && (
                <>
                  <div style={S.sectionTitle}>INVITE PIONEER</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input style={{ ...S.input, flex: 1 }} value={inviteH} onChange={e => setInviteH(e.target.value)} placeholder="@handle" onKeyDown={e => e.key === 'Enter' && doInvite()} />
                    <button style={S.btn(accent, true)} onClick={doInvite}>INVITE</button>
                  </div>
                </>
              )}

              {msg && <div style={{ ...(msg.type === 'ok' ? S.ok : S.err), marginTop: '0.5rem' }}>{msg.text}</div>}
            </>
          )}

          {tab === 'CHAT' && <GatheringChat gatheringId={gatheringId} />}

          {tab === 'LEDGER' && (
            <GatheringLedger
              gatheringId={gatheringId}
              conveyorId={bundle.convener_id}
              isConvener={isConvener}
              onApplied={reload}
            />
          )}

          {tab === 'ARC' && (
            <ArcEditor gatheringId={gatheringId} isConvener={isConvener} roles={bundle.roles ?? []} onSaved={reload} />
          )}

          {tab === 'GEAR' && (
            <>
              {isConvener && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input style={{ ...S.input, flex: 1 }} value={gearItem} onChange={e => setGearItem(e.target.value)} placeholder="Item name" onKeyDown={e => e.key === 'Enter' && doAddGear()} />
                  <button style={S.btn(accent, true)} onClick={doAddGear}>+ ADD</button>
                </div>
              )}

              {bundle.gear?.map(g => (
                <div key={g.id} style={S.gearRow}>
                  <div>
                    {g.item} {g.qty > 1 && `×${g.qty}`}
                    {g.source === 'packing_manifest' && <span style={{ ...S.pill('#4A90D9'), marginLeft: '0.4rem' }}>MANIFEST</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {g.claimed_by === profile?.id
                      ? <button style={S.ghost(true)} onClick={() => { unclaimGear(g.id); reload(); }}>DROP</button>
                      : !g.claimed_by
                        ? <button style={S.btn(accent, true)} onClick={() => { claimGear(g.id); reload(); }}>CLAIM</button>
                        : <span style={{ color: '#666', fontSize: '0.65rem' }}>CLAIMED</span>
                    }
                    {isConvener && <button style={S.ghost(true)} onClick={() => { deleteGear(g.id); reload(); }}>✕</button>}
                  </div>
                </div>
              ))}

              {bundle.gear?.length === 0 && (
                <div style={{ color: '#666', fontSize: '0.8rem', padding: '1rem 0' }}>No gear listed yet — add items or sync from Packing Manifest</div>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div style={S.footer}>
          {!reporting ? (
            <button style={S.ghost(true)} onClick={() => setReporting(true)}>⚑ REPORT</button>
          ) : (
            <form onSubmit={doReport} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
              <input style={{ ...S.input, flex: 1 }} value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Reason..." required />
              <button style={S.btn('#e74c3c', true)} type="submit">SEND</button>
              <button style={S.ghost(true)} type="button" onClick={() => setReporting(false)}>✕</button>
            </form>
          )}

          {/* Phase 4: Charter publishing for convener of completed/live Gathering */}
          {isConvener && ['completed', 'live'].includes(bundle.status) && !bundle.is_charter && (
            <button style={S.btn('#6C3483', true)} onClick={doPublishCharter}>PUBLISH AS CHARTER</button>
          )}

          {isConvener && (
            <button style={S.btn('#e74c3c', true)} onClick={doDelete}>DELETE GATHERING</button>
          )}
        </div>
      </div>
    </div>
  );
}
