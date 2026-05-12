// VenturePath · Phase 2 · Gatherings Supabase API
import { supabase } from '../supabase';
import { getTemplate } from './templates';
import { emitGatheringHosted, emitGatheringAttended } from '../../utils/streakEmitter';

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listMyGatherings() {
  return supabase
    .from('gatherings')
    .select('*')
    .order('starts_at', { ascending: true });
}

export async function listGatheringsForTrip(tripId) {
  return supabase
    .from('gatherings')
    .select('*')
    .eq('trip_id', tripId)
    .order('starts_at', { ascending: true });
}

export async function getGathering(id) {
  return supabase
    .from('gatherings')
    .select('*')
    .eq('id', id)
    .single();
}

export async function getGatheringBundle(id) {
  const [gathering, arc, roles, attendees, gear] = await Promise.all([
    supabase.from('gatherings').select('*').eq('id', id).single(),
    supabase.from('gathering_arc_blocks').select('*').eq('gathering_id', id).order('ord'),
    supabase.from('gathering_roles').select('*').eq('gathering_id', id),
    supabase.from('gathering_attendees').select('*, profile:profiles(handle, display_name, avatar_url)').eq('gathering_id', id),
    supabase.from('gathering_gear').select('*').eq('gathering_id', id),
  ]);
  if (gathering.error) return { data: null, error: gathering.error };
  return {
    data: {
      ...gathering.data,
      arc: arc.data ?? [],
      roles: roles.data ?? [],
      attendees: attendees.data ?? [],
      gear: gear.data ?? [],
    },
    error: null,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createGathering(input, { convenerId }) {
  const template = getTemplate(input.template_id ?? 'custom');

  const { data, error } = await supabase
    .from('gatherings')
    .insert({
      convener_id:    convenerId,
      trip_id:        input.trip_id ?? null,
      title:          input.title,
      template_id:    input.template_id ?? 'custom',
      vibe_tag:       input.vibe_tag ?? template.vibePrompt,
      banner_url:     input.banner_url ?? null,
      accent_color:   input.accent_color ?? template.accentColor,
      icon:           input.icon ?? template.icon,
      location_label: input.location_label ?? null,
      coords:         input.coords ?? null,
      coords_radius_m: input.coords_radius_m ?? 0,
      starts_at:      input.starts_at,
      ends_at:        input.ends_at ?? null,
      timezone:       input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      privacy:        input.privacy ?? 'squad',
      status:         'scheduled',
    })
    .select()
    .single();

  if (error) return { data: null, error };

  const gId = data.id;

  // Seed Arc, Roles, Gear from template (fire-and-forget, don't block on errors)
  const seeds = [];

  if (template.defaultArc.length > 0) {
    seeds.push(
      supabase.from('gathering_arc_blocks').insert(
        template.defaultArc.map(b => ({ ...b, gathering_id: gId }))
      )
    );
  }

  if (template.defaultRoles.length > 0) {
    seeds.push(
      supabase.from('gathering_roles').insert(
        template.defaultRoles.map(r => ({ ...r, gathering_id: gId }))
      )
    );
  }

  if (template.defaultGear.length > 0) {
    seeds.push(
      supabase.from('gathering_gear').insert(
        template.defaultGear.map(g => ({ ...g, gathering_id: gId }))
      )
    );
  }

  // Auto-add convener as 'yes' attendee
  seeds.push(
    supabase.from('gathering_attendees').insert({
      gathering_id: gId,
      pioneer_id:   convenerId,
      rsvp_status:  'yes',
    })
  );

  await Promise.allSettled(seeds);

  // Fire-and-forget streak emission to HF
  emitGatheringHosted({ gatheringId: gId, templateId: data.template_id });

  return { data, error: null };
}

export async function updateGathering(id, patch) {
  return supabase
    .from('gatherings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteGathering(id) {
  return supabase.from('gatherings').delete().eq('id', id);
}

// ── Social actions ────────────────────────────────────────────────────────────

export async function inviteByHandle(gatheringId, handle, invitedById) {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();

  if (pErr || !profile) return { error: new Error(`No Architect found with handle @${handle}`) };

  return supabase.from('gathering_attendees').upsert(
    {
      gathering_id: gatheringId,
      pioneer_id:   profile.id,
      rsvp_status:  'pending',
      invited_by:   invitedById,
    },
    { onConflict: 'gathering_id,pioneer_id' }
  );
}

export async function setRsvp(gatheringId, pioneerId, status) {
  const result = await supabase.from('gathering_attendees').upsert(
    {
      gathering_id:  gatheringId,
      pioneer_id:    pioneerId,
      rsvp_status:   status,
      responded_at:  new Date().toISOString(),
    },
    { onConflict: 'gathering_id,pioneer_id' }
  );
  if (!result.error && status === 'yes') {
    emitGatheringAttended({ gatheringId, rsvp: status });
  }
  return result;
}

export async function reportGathering(gatheringId, reporterId, reason, note) {
  return supabase.from('gathering_reports').insert({
    gathering_id: gatheringId,
    reporter_id:  reporterId,
    reason,
    note: note ?? null,
  });
}

export async function claimRole(roleId, pioneerId) {
  return supabase
    .from('gathering_roles')
    .update({ assigned_to: pioneerId })
    .eq('id', roleId)
    .is('assigned_to', null);
}

export async function unclaimRole(roleId, pioneerId) {
  return supabase
    .from('gathering_roles')
    .update({ assigned_to: null })
    .eq('id', roleId)
    .eq('assigned_to', pioneerId);
}

// ── Phase 3 · Chat ────────────────────────────────────────────────────────────

export async function listMessages(gatheringId, { limit = 100 } = {}) {
  return supabase
    .from('gathering_messages')
    .select('*, profile:profiles(handle, display_name, avatar_url)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: true })
    .limit(limit);
}

export async function postMessage(gatheringId, pioneerId, body, { replyTo = null } = {}) {
  return supabase.from('gathering_messages').insert({
    gathering_id: gatheringId,
    pioneer_id:   pioneerId,
    body,
    reply_to:     replyTo,
  }).select('*, profile:profiles(handle, display_name, avatar_url)').single();
}

export async function deleteMessage(messageId) {
  return supabase.from('gathering_messages').delete().eq('id', messageId);
}

// Subscribe to realtime inserts/deletes for a Gathering's messages.
// Returns the channel so callers can unsubscribe.
export function subscribeToMessages(gatheringId, { onInsert, onDelete }) {
  const channel = supabase
    .channel(`gathering-messages-${gatheringId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gathering_messages', filter: `gathering_id=eq.${gatheringId}` },
      (payload) => onInsert?.(payload.new))
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'gathering_messages', filter: `gathering_id=eq.${gatheringId}` },
      (payload) => onDelete?.(payload.old))
    .subscribe();
  return channel;
}

// ── Phase 3 · Proposals (Ledger) ──────────────────────────────────────────────

export async function listProposals(gatheringId) {
  return supabase
    .from('gathering_proposals')
    .select('*, proposer:profiles!proposed_by(handle, display_name)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: false });
}

export async function createProposal(gatheringId, proposedBy, field, proposedValue) {
  return supabase.from('gathering_proposals').insert({
    gathering_id:   gatheringId,
    proposed_by:    proposedBy,
    field,
    proposed_value: proposedValue,
  }).select().single();
}

export async function castVote(proposalId, vote) {
  return supabase.rpc('cast_proposal_vote', { p_id: proposalId, p_vote: vote });
}

export async function resolveProposal(proposalId, status) {
  return supabase
    .from('gathering_proposals')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', proposalId)
    .select()
    .single();
}

export async function deleteProposal(proposalId) {
  return supabase.from('gathering_proposals').delete().eq('id', proposalId);
}

export function subscribeToProposals(gatheringId, { onChange }) {
  const channel = supabase
    .channel(`gathering-proposals-${gatheringId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'gathering_proposals', filter: `gathering_id=eq.${gatheringId}` },
      () => onChange?.())
    .subscribe();
  return channel;
}

// ── Phase 3 · Beacon live mode ────────────────────────────────────────────────
// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT

export async function postBeacon(gatheringId, pioneerId, kind, { coords = null, eta = null } = {}) {
  return supabase.from('gathering_beacons').insert({
    gathering_id: gatheringId,
    pioneer_id:   pioneerId,
    kind,
    coords,
    eta,
  }).select().single();
}

export async function listBeacons(gatheringId, { limit = 50 } = {}) {
  return supabase
    .from('gathering_beacons')
    .select('*, profile:profiles(handle, display_name)')
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export function subscribeToBeacons(gatheringId, { onInsert }) {
  const channel = supabase
    .channel(`gathering-beacons-${gatheringId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gathering_beacons', filter: `gathering_id=eq.${gatheringId}` },
      (payload) => onInsert?.(payload.new))
    .subscribe();
  return channel;
}

// ── Phase 3 · Arc block editing ───────────────────────────────────────────────

export async function listArcBlocks(gatheringId) {
  return supabase
    .from('gathering_arc_blocks')
    .select('*')
    .eq('gathering_id', gatheringId)
    .order('ord', { ascending: true });
}

export async function createArcBlock(gatheringId, block) {
  return supabase.from('gathering_arc_blocks').insert({
    gathering_id: gatheringId,
    ord:          block.ord ?? 0,
    title:        block.title,
    note:         block.note ?? null,
    duration_min: block.duration_min ?? null,
    starts_at:    block.starts_at ?? null,
    role_id:      block.role_id ?? null,
  }).select().single();
}

export async function updateArcBlock(blockId, patch) {
  return supabase.from('gathering_arc_blocks').update(patch).eq('id', blockId).select().single();
}

export async function deleteArcBlock(blockId) {
  return supabase.from('gathering_arc_blocks').delete().eq('id', blockId);
}

// ── Phase 3 · Gear (manual add + manifest pull) ──────────────────────────────

export async function addGear(gatheringId, item, { qty = 1, category = null, weightKg = null, source = 'manual' } = {}) {
  return supabase.from('gathering_gear').insert({
    gathering_id: gatheringId,
    item, qty, category, weight_kg: weightKg, source,
  }).select().single();
}

export async function deleteGear(gearId) {
  return supabase.from('gathering_gear').delete().eq('id', gearId);
}

export async function claimGear(gearId, pioneerId) {
  return supabase.from('gathering_gear').update({ claimed_by: pioneerId }).eq('id', gearId);
}

export async function unclaimGear(gearId, pioneerId) {
  return supabase.from('gathering_gear').update({ claimed_by: null }).eq('id', gearId).eq('claimed_by', pioneerId);
}

export async function bulkAddGear(gatheringId, items) {
  if (!items?.length) return { data: [], error: null };
  return supabase.from('gathering_gear').insert(
    items.map(i => ({ gathering_id: gatheringId, ...i }))
  );
}

export async function reorderArcBlocks(blocks) {
  // blocks: [{ id, ord }]. Upserts every row's ord in one batch.
  const updates = await Promise.all(
    blocks.map(b => supabase.from('gathering_arc_blocks').update({ ord: b.ord }).eq('id', b.id))
  );
  return updates;
}
