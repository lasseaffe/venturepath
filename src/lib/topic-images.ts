/**
 * Maps gospel topics / keywords to curated Unsplash photo IDs.
 * Each entry is a specific Unsplash photo chosen for relevance and quality.
 */

const TOPIC_IMAGE_MAP: Array<{ keywords: string[]; photoId: string; credit: string }> = [
  { keywords: ["faith", "trust", "believe", "belief", "hope"], photoId: "1464822759023-fed622ff2c3b", credit: "Unsplash" },
  { keywords: ["prayer", "pray", "kneel", "petition", "communion"], photoId: "1499209974431-9dddcece7f88", credit: "Unsplash" },
  { keywords: ["scripture", "book", "read", "study", "bible", "word"], photoId: "1432888498266-38ffec3eaf0a", credit: "Unsplash" },
  { keywords: ["family", "home", "children", "parents", "household", "fhe", "evening"], photoId: "1511895426328-dc8714191011", credit: "Unsplash" },
  { keywords: ["temple", "sacred", "holy", "covenant", "endowment", "ordinance"], photoId: "1506905925346-21bda4d32df4", credit: "Unsplash" },
  { keywords: ["missionary", "mission", "preach", "serve", "calling", "elder", "sister"], photoId: "1529156069898-49953e39b3ac", credit: "Unsplash" },
  { keywords: ["light", "candle", "darkness", "shine", "lamp", "glory"], photoId: "1484591974-2de141d2c33b", credit: "Unsplash" },
  { keywords: ["mountain", "nature", "creation", "earth", "landscape", "wilderness", "journey"], photoId: "1519681393784-d120267933ba", credit: "Unsplash" },
  { keywords: ["gratitude", "thankful", "blessing", "bless", "grateful", "praise"], photoId: "1473116763249-dec59e8fdbfc", credit: "Unsplash" },
  { keywords: ["repentance", "forgiveness", "atonement", "redemption", "mercy", "grace"], photoId: "1501854140801-50d01698950b", credit: "Unsplash" },
  { keywords: ["charity", "love", "serve", "service", "kindness", "compassion"], photoId: "1532629345422-7515f3d16bb6", credit: "Unsplash" },
  { keywords: ["resurrection", "easter", "christ", "savior", "jesus", "salvation", "redemption"], photoId: "1445116572660-e10c7941430c", credit: "Unsplash" },
  { keywords: ["youth", "young", "teenager", "seminary", "strength", "example"], photoId: "1529156069898-49953e39b3ac", credit: "Unsplash" },
  { keywords: ["priesthood", "authority", "ordain", "melchizedek", "aaronic", "office"], photoId: "1506905925346-21bda4d32df4", credit: "Unsplash" },
  { keywords: ["tithing", "sacrifice", "consecration", "offering", "steward"], photoId: "1464822759023-fed622ff2c3b", credit: "Unsplash" },
];

const DEFAULT_IMAGE = { photoId: "1464822759023-fed622ff2c3b", credit: "Unsplash" };

/**
 * Returns an Unsplash image URL for the given topic string.
 * Matches keywords from the topic against the curated map.
 */
export function getTopicImageUrl(topic: string, scripture?: string): string {
  const combined = `${topic} ${scripture ?? ""}`.toLowerCase();

  for (const entry of TOPIC_IMAGE_MAP) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      return buildUnsplashUrl(entry.photoId);
    }
  }

  return buildUnsplashUrl(DEFAULT_IMAGE.photoId);
}

function buildUnsplashUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=75`;
}
