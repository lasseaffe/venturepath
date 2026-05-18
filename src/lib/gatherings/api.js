import { supabase } from '../supabase.js';
import { getTemplate } from './templates.js';

// ── helpers ───────────────────────────────────────────────────────────────────

async function uid() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

const BUNDLE_QUERY = `
  *,
  arc_blocks:gathering_arc_blocks(* order by ord asc),
  roles:gathering_roles(*),
  attendees:gathering_attendees(*),
  gear:gathering_gear(*)
`;

// ── list / read ───────────────────────────────────────────────────────────────

export async function listMyGatherings() {
  const me = await uid();
  if (!me) return [];
  const { data } = await supabase
    .from('gatherings')
    .select(BUNDLE_QUERY)
    .or(`convener_id.eq.${me},attendees.pioneer_id.eq.${me}`)
    .order('starts_at', { ascending: true });
  return data ?? [];
}

export async function listGatheringsForTrip(tripId) {
  const { data } = await supabase
    .from('gatherings')
    .select(BUNDLE_QUERY)
    .eq('trip_id', tripId)
    .order('starts_at', { ascending: true });
  return data ?? [];
}

export async function getGathering(id) {
  const { data } = await supabase
    .from('gatherings')
    .select(BUNDLE_QUERY)
    .eq('id', id)
    .single();
  return data;
}

// alias used by detail component
export const getGatheringBundle = getGathering;

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createGathering(fields) {
  const me = await uid();
  const tpl = getTemplate(fields.template_id);

  const { data: g, error } = await supabase
    .from('gatherings')
    .insert({ ...fields, convener_id: me, status: 'draft' })
    .select()
    .single();
  if (error) return { error };

  // Seed template defaults
  if (tpl.defaultRoles.length) {
    await supabase.from('gathering_roles').insert(
      tpl.defaultRoles.map(r => ({ ...r, gathering_id: g.id }))
    );
  }
  if (tpl.defaultArc.length) {
    await supabase.from('gathering_arc_blocks').insert(
      tpl.defaultArc.map(b => ({ ...b, gathering_id: g.id }))
    );
  }
  if (tpl.defaultGear.length) {
    await supabase.from('gathering_gear').insert(
      tpl.defaultGear.map(item => ({ ...item, gathering_id: g.id, source: 'manual' }))
    );
  }

  // Auto-add convener as yes attendee
  await supabase.from('gathering_attendees').insert({
    gathering_id: g.id, pioneer_id: me, rsvp_status: 'yes',
  });

  // Cross-app: emit streak event
  emitCrossApp('gathering_hosted', { gathering_id: g.id, template_id: g.template_id });

  return { data: g };
}

export async function updateGathering(id, updates) {
  const { data, error } = await supabase
    .from('gatherings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteGathering(id) {
  return supabase.from('gatherings').delete().eq('id', id);
}

// ── Attendees ─────────────────────────────────────────────────────────────────

export async function inviteByHandle(gatheringId, handle) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', handle)
    .single();
  if (!profile) return { error: { message: `No Architect with handle @${handle}` } };
  const me = await uid();
  return supabase.from('gathering_attendees').upsert({
    gathering_id: gatheringId,
    pioneer_id: profile.id,
    rsvp_status: 'pending',
    invited_by: me,
    invited_at: new Date().toISOString(),
  }, { onConflict: 'gathering_id,pioneer_id' });
}

export async function setRsvp(gatheringId, rsvp) {
  const me = await uid();
  const { data, error } = await supabase
    .from('gathering_attendees')
    .upsert({ gathering_id: gatheringId, pioneer_id: me, rsvp_status: rsvp, responded_at: new Date().toISOString() },
      { onConflict: 'gathering_id,pioneer_id' })
    .select()
    .single();
  if (!error && rsvp === 'yes') {
    emitCrossApp('gathering_attended', { gathering_id: gatheringId, rsvp });
  }
  return { data, error };
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function claimRole(roleId) {
  const me = await uid();
  return supabase.from('gathering_roles').update({ assigned_to: me }).eq('id', roleId);
}

export async function unclaimRole(roleId) {
  return supabase.from('gathering_roles').update({ assigned_to: null }).eq('id', roleId);
}

// ── Arc blocks ────────────────────────────────────────────────────────────────

export async function listArcBlocks(gatheringId) {
  const { data } = await supabase
    .from('gathering_arc_blocks')
    .select('*')
    .eq('gathering_id', gatheringId)
    .order('ord', { ascending: true });
  return data ?? [];
}

export async function createArcBlock(gatheringId, block) {
  return supabase.from('gathering_arc_blocks').insert({ ...block, gathering_id: gatheringId }).select().single();
}

export async function updateArcBlock(id, updates) {
  return supabase.from('gathering_arc_blocks').update(updates).eq('id', id).select().single();
}

export async function deleteArcBlock(id) {
  return supabase.from('gathering_arc_blocks').delete().eq('id', id);
}

export async function reorderArcBlocks(blocks) {
  // blocks: [{ id, ord }, ...]
  return Promise.all(blocks.map(b => supabase.from('gathering_arc_blocks').update({ ord: b.ord }).eq('id', b.id)));
}

// ── Gear ──────────────────────────────────────────────────────────────────────

export async function addGear(gatheringId, item) {
  return supabase.from('gathering_gear').insert({ ...item, gathering_id: gatheringId, source: 'manual' }).select().single();
}

export async function deleteGear(id) {
  return supabase.from('gathering_gear').delete().eq('id', id);
}

export async function claimGear(id) {
  const me = await uid();
  return supabase.from('gathering_gear').update({ claimed_by: me }).eq('id', id);
}

export async function unclaimGear(id) {
  return supabase.from('gathering_gear').update({ claimed_by: null }).eq('id', id);
}

export async function bulkAddGear(gatheringId, items) {
  return supabase.from('gathering_gear').insert(
    items.map(i => ({ ...i, gathering_id: gatheringId }))
  );
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function listMessages(gatheringId) {
  const { data } = await supabase
    .from('gathering_messages')
    .select('*, author:profiles!pioneer_id(handle, avatar_url)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function postMessage(gatheringId, body, replyTo = null) {
  const me = await uid();
  const { data, error } = await supabase
    .from('gathering_messages')
    .insert({ gathering_id: gatheringId, pioneer_id: me, body, reply_to: replyTo })
    .select('*, author:profiles!pioneer_id(handle, avatar_url)')
    .single();
  return { data, error };
}

export async function deleteMessage(id) {
  return supabase.from('gathering_messages').delete().eq('id', id);
}

export function subscribeToMessages(gatheringId, onInsert, onDelete) {
  return supabase
    .channel(`msgs:${gatheringId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gathering_messages', filter: `gathering_id=eq.${gatheringId}` }, p => onInsert(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gathering_messages', filter: `gathering_id=eq.${gatheringId}` }, p => onDelete(p.old.id))
    .subscribe();
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export async function listProposals(gatheringId) {
  const { data } = await supabase
    .from('gathering_proposals')
    .select('*, proposer:profiles!proposed_by(handle)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createProposal(gatheringId, field, proposedValue) {
  const me = await uid();
  const { data, error } = await supabase
    .from('gathering_proposals')
    .insert({ gathering_id: gatheringId, field, proposed_value: proposedValue, proposed_by: me })
    .select()
    .single();
  return { data, error };
}

export async function castVote(proposalId, vote) {
  const { data, error } = await supabase.rpc('cast_proposal_vote', { p_id: proposalId, p_vote: vote });
  return { data, error };
}

export async function resolveProposal(proposalId, status) {
  return supabase.from('gathering_proposals').update({ status, resolved_at: new Date().toISOString() }).eq('id', proposalId);
}

export async function deleteProposal(id) {
  return supabase.from('gathering_proposals').delete().eq('id', id);
}

export function subscribeToProposals(gatheringId, onChange) {
  return supabase
    .channel(`proposals:${gatheringId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gathering_proposals', filter: `gathering_id=eq.${gatheringId}` }, onChange)
    .subscribe();
}

// ── Beacons ───────────────────────────────────────────────────────────────────

export async function postBeacon(gatheringId, kind, coords = null, eta = null) {
  const me = await uid();
  // REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT
  return supabase.from('gathering_beacons').insert({
    gathering_id: gatheringId, pioneer_id: me, kind,
    coords: coords ? `SRID=4326;POINT(${coords[0]} ${coords[1]})` : null,
    eta,
  });
}

export async function listBeacons(gatheringId) {
  const { data } = await supabase
    .from('gathering_beacons')
    .select('*, pioneer:profiles!pioneer_id(handle, avatar_url)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export function subscribeToBeacons(gatheringId, onChange) {
  return supabase
    .channel(`beacons:${gatheringId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gathering_beacons', filter: `gathering_id=eq.${gatheringId}` }, p => onChange(p.new))
    .subscribe();
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function reportGathering(gatheringId, reason, note = '') {
  const me = await uid();
  return supabase.from('gathering_reports').insert({
    gathering_id: gatheringId, reporter_id: me, reason, note, status: 'pending',
  });
}

// ── Phase 4: Public discovery ─────────────────────────────────────────────────

export async function discoverGatherings({ lat, lng, radiusKm = 50, cursor = null, sabbathFilter = false }) {
  const { data, error } = await supabase.rpc('discover_gatherings', {
    p_lat: lat, p_lng: lng,
    p_radius_km: radiusKm,
    p_cursor: cursor,
    p_sabbath_filter: sabbathFilter,
  });
  return { data: data ?? [], error };
}

// ── Phase 4: Charter publishing ───────────────────────────────────────────────

export async function publishAsCharter(gatheringId) {
  const { data, error } = await supabase.rpc('publish_as_charter', { p_gathering_id: gatheringId });
  return { data, error };
}

export async function cloneCharter(charterId, tripId = null) {
  const { data, error } = await supabase.rpc('clone_charter', { p_charter_id: charterId, p_trip_id: tripId });
  return { data, error };
}

export async function listCharters({ templateId = null } = {}) {
  let q = supabase
    .from('gatherings')
    .select('*, convener:profiles!convener_id(handle, avatar_url)')
    .eq('is_charter', true)
    .eq('privacy', 'public_listed')
    .order('charter_clones', { ascending: false });
  if (templateId) q = q.eq('template_id', templateId);
  const { data } = await q;
  return data ?? [];
}

// ── Cross-app streak emission (fire-and-forget) ───────────────────────────────

function emitCrossApp(actionId, meta = {}) {
  fetch('http://localhost:3000/api/streak/tick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_id: actionId, ...meta }),
  }).catch(() => { /* HolyFlex may not be running */ });
}
