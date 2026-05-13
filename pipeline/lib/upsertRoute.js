// pipeline/lib/upsertRoute.js
// Idempotent upsert of a pro_paths row by slug, plus atomic replacement of waypoints.
// Service-role auth required (bypasses RLS).

export async function upsertRoute({ supabase, row, waypoints }) {
  const { data, error } = await supabase
    .from('pro_paths')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw new Error(`upsertRoute(${row.slug}): ${error.message}`);

  if (waypoints && waypoints.length > 0) {
    const { error: delErr } = await supabase
      .from('pro_path_waypoints')
      .delete()
      .eq('path_id', data.id);
    if (delErr) throw new Error(`upsertRoute(${row.slug}) waypoint delete: ${delErr.message}`);

    const rows = waypoints.map((w) => ({ ...w, path_id: data.id }));
    const { error: insErr } = await supabase.from('pro_path_waypoints').insert(rows);
    if (insErr) throw new Error(`upsertRoute(${row.slug}) waypoint insert: ${insErr.message}`);
  }

  return data;
}
