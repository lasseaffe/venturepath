import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ReviewsWidget({ pathId }) {
  const [reviews, setReviews] = useState([]);
  const [note, setNote] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('pro_path_reviews')
      .select('*')
      .eq('path_id', pathId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setReviews(data ?? []));
  }, [pathId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (myRating === 0) return;
    setSubmitting(true);
    await supabase.from('pro_path_reviews').insert({
      path_id: pathId,
      rating: myRating,
      note: note.trim() || null,
    });
    const { data } = await supabase
      .from('pro_path_reviews')
      .select('*')
      .eq('path_id', pathId)
      .order('created_at', { ascending: false })
      .limit(5);
    setReviews(data ?? []);
    setNote('');
    setMyRating(0);
    setSubmitting(false);
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="text-[10px] font-mono text-[var(--text-muted)] mb-2">
        {reviews.length === 0 ? '0 reviews — be the first' : `${reviews.length} review${reviews.length > 1 ? 's' : ''}`}
      </div>

      {reviews.map(r => (
        <div key={r.id} className="text-[10px] font-mono text-[var(--text-secondary)] py-0.5">
          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.note}
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setMyRating(n)}
              className={`text-sm ${n <= myRating ? 'text-[#F2C94C]' : 'text-[var(--text-muted)]'}`}>★</button>
          ))}
        </div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="one line review…"
          className="flex-1 bg-transparent border-b border-white/20 text-[10px] font-mono text-[var(--text-secondary)] outline-none px-1"
          maxLength={120}
        />
        <button type="submit" disabled={submitting || myRating === 0}
          className="text-[10px] font-mono text-[#E67E22] disabled:opacity-40">
          POST
        </button>
      </form>
    </div>
  );
}
