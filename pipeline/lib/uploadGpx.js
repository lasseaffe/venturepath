// pipeline/lib/uploadGpx.js
// Uploads a local GPX file to the `gpx` Supabase Storage bucket
// using the object naming convention <pro_path_id>.gpx (from Spec 0 RLS policies).
// Returns the storage_path string to write into pro_paths.gpx_storage_path.
import { readFileSync } from 'node:fs';

export async function uploadGpx({ supabase, proPathId, localGpxPath }) {
  const buf = readFileSync(localGpxPath);
  const objectKey = `${proPathId}.gpx`;
  const { error } = await supabase.storage
    .from('gpx')
    .upload(objectKey, buf, {
      contentType: 'application/gpx+xml',
      upsert: true,
    });
  if (error) throw new Error(`uploadGpx(${objectKey}): ${error.message}`);
  return objectKey;
}
