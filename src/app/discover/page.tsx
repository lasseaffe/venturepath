"use client";

import { useState } from "react";
import { Sparkles, BookMarked, Lightbulb, Check, RotateCcw } from "lucide-react";
import { SwipeCard, type SodaCard } from "@/components/swipe-card";

const SODA_CARDS: SodaCard[] = [
  {
    id: "s1",
    name: "Coconut Prophet",
    creator: "abbyinprovo",
    ingredients: ["Diet Coke", "Coconut Syrup", "Lime Juice", "Cream"],
    amens: 2847,
    saves: 412,
    gradientFrom: "#FDF5E6",
    gradientTo: "#E8D5B0",
    description: "The classic Utah dirty soda that started it all. Coconut and cream over ice-cold Diet Coke — pure bliss.",
  },
  {
    id: "s2",
    name: "Raspberry Sunday Best",
    creator: "sodawithjessie",
    ingredients: ["Dr Pepper", "Raspberry Syrup", "Half & Half"],
    amens: 1924,
    saves: 287,
    gradientFrom: "#FDE8F0",
    gradientTo: "#E8AABB",
    description: "Dr Pepper hits different with raspberry and cream. Best enjoyed after third hour.",
  },
  {
    id: "s3",
    name: "Mango Testify",
    creator: "swig_enthusiast",
    ingredients: ["Sprite", "Mango Syrup", "Tajín Rim", "Lime"],
    amens: 3102,
    saves: 534,
    gradientFrom: "#FFF3D4",
    gradientTo: "#FFD47A",
    description: "Tropical, sweet, with just enough heat from the Tajín. This one gets testified about.",
  },
  {
    id: "s4",
    name: "Peach Pioneer",
    creator: "utahsodamom",
    ingredients: ["Lemon-Lime Soda", "Peach Syrup", "Vanilla Cream"],
    amens: 1456,
    saves: 198,
    gradientFrom: "#FFF0E8",
    gradientTo: "#F5C4A0",
    description: "Soft, sweet, and creamy. Named after the pioneer spirit — this drink makes the journey worth it.",
  },
  {
    id: "s5",
    name: "Lavender Sabbath",
    creator: "quietsundaydrinks",
    ingredients: ["Sparkling Water", "Lavender Syrup", "Vanilla", "Cream"],
    amens: 987,
    saves: 156,
    gradientFrom: "#EEE8F8",
    gradientTo: "#C8B8E8",
    description: "No caffeine, all peace. Made for Sundays when you want something special but still Sabbath-worthy.",
  },
  {
    id: "s6",
    name: "Green Jello Legacy",
    creator: "ldsmemes_official",
    ingredients: ["Sprite", "Lime Syrup", "Coconut Cream", "Mint"],
    amens: 4211,
    saves: 721,
    gradientFrom: "#E8F5EC",
    gradientTo: "#A8D8B4",
    description: "A tribute to the greatest LDS cultural artifact. Green. Creamy. Historic.",
  },
  {
    id: "s7",
    name: "Stormy Testimony",
    creator: "brotherrichards42",
    ingredients: ["Root Beer", "Vanilla Syrup", "Cream", "Ice"],
    amens: 2390,
    saves: 345,
    gradientFrom: "#E8E0D4",
    gradientTo: "#A89070",
    description: "Old school root beer float vibes but elevated. Hits different when you need a spiritual pick-me-up.",
  },
  {
    id: "s8",
    name: "Watermelon Ward Party",
    creator: "ysa_provo",
    ingredients: ["Lemon-Lime Soda", "Watermelon Syrup", "Basil"],
    amens: 1677,
    saves: 243,
    gradientFrom: "#FEE8E8",
    gradientTo: "#F5A0A0",
    description: "Best served at a ward activity. Everyone asks for the recipe. Now you have it.",
  },
  {
    id: "s9",
    name: "Blue Miracle",
    creator: "sisterandersen",
    ingredients: ["Blue Raspberry", "Coconut Water", "Lime", "Mint"],
    amens: 3456,
    saves: 478,
    gradientFrom: "#E0EEFF",
    gradientTo: "#90C0F0",
    description: "Hydrating, refreshing, and looks like the ocean. Tastes like answered prayers.",
  },
  {
    id: "s10",
    name: "Tiger Blood Trek",
    creator: "handcart_hydration",
    ingredients: ["Strawberry Syrup", "Coconut", "Watermelon", "Cream"],
    amens: 2105,
    saves: 389,
    gradientFrom: "#FFE8EC",
    gradientTo: "#F0708A",
    description: "For when you've walked 12 miles in pioneer clothes and need a reward. You've earned it.",
  },
  {
    id: "s11",
    name: "Citrus Zion",
    creator: "holyflex_original",
    ingredients: ["Grapefruit Soda", "Honey Syrup", "Thyme", "Sparkling Water"],
    amens: 1823,
    saves: 267,
    gradientFrom: "#FFF8E0",
    gradientTo: "#F5D080",
    description: "Sophisticated and a little different. Like Zion — it takes some work to appreciate but rewards you deeply.",
  },
  {
    id: "s12",
    name: "Celestial Cherry",
    creator: "temple_treats",
    ingredients: ["Cherry Coke", "Vanilla Syrup", "Cream", "Maraschino"],
    amens: 5120,
    saves: 891,
    gradientFrom: "#FFE0E0",
    gradientTo: "#E87080",
    description: "The highest tier. Once you've had it, you understand why people wait in line. Exalted flavor.",
  },
];

const TABS = [
  { id: "soda", label: "Soda Lab", icon: Sparkles, active: true },
  { id: "talks", label: "Talks", icon: BookMarked, active: false },
  { id: "insights", label: "Insights", icon: Lightbulb, active: false },
];

const VISIBLE_STACK = 3;

export default function DiscoverPage() {
  const [deck, setDeck] = useState(SODA_CARDS);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<"amen" | "skip" | "doubletap" | null>(null);
  const [activeTab, setActiveTab] = useState("soda");
  const [swipedCount, setSwipedCount] = useState(0);

  function handleSwipeRight() {
    if (!deck.length) return;
    const top = deck[0];
    setSaved((prev) => new Set([...prev, top.id]));
    setLastAction("amen");
    setDeck((d) => d.slice(1));
    setSwipedCount((n) => n + 1);
    setTimeout(() => setLastAction(null), 1200);
  }

  function handleSwipeLeft() {
    if (!deck.length) return;
    setLastAction("skip");
    setDeck((d) => d.slice(1));
    setSwipedCount((n) => n + 1);
    setTimeout(() => setLastAction(null), 1200);
  }

  function handleAmen() {
    if (!deck.length) return;
    const top = deck[0];
    setSaved((prev) => new Set([...prev, top.id]));
    setLastAction("doubletap");
    setTimeout(() => setLastAction(null), 1200);
  }

  function resetDeck() {
    setDeck(SODA_CARDS);
    setSwipedCount(0);
    setLastAction(null);
  }

  const visibleCards = deck.slice(0, VISIBLE_STACK);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #F5F0E8 100%)" }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={18} style={{ color: "#C87A50" }} />
            <h1 className="text-2xl font-black" style={{ color: "#2D1A0E" }}>Discover</h1>
          </div>
          <p className="text-sm" style={{ color: "#9A8A7A" }}>
            Swipe right to Amen · left to skip · double-tap to love it
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex rounded-2xl overflow-hidden border mb-8" style={{ borderColor: "#DDD5CC", background: "#FEFCF7" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => tab.active && setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors relative"
                style={isActive
                  ? { background: "#2D1A0E", color: "#F5F0E8" }
                  : { color: tab.active ? "#7A6858" : "#C0B8B0", cursor: tab.active ? "pointer" : "default" }
                }
              >
                <Icon size={13} />
                {tab.label}
                {!tab.active && (
                  <span className="absolute top-1 right-1 text-[9px] font-bold px-1 rounded"
                    style={{ background: "#F0E8DC", color: "#C0A880" }}>soon</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action feedback */}
        {lastAction && (
          <div
            className="mb-4 text-center text-sm font-semibold py-2 rounded-xl transition-all"
            style={
              lastAction === "skip"
                ? { background: "#FDEAEA", color: "#B03A3A" }
                : { background: "#EDF5ED", color: "#4A7A4A" }
            }
          >
            {lastAction === "amen" && "🙏 Amen! Saved to your library"}
            {lastAction === "doubletap" && "💥 Double Amen! Saved to your library"}
            {lastAction === "skip" && "👋 Skipped"}
          </div>
        )}

        {/* Card stack */}
        {deck.length > 0 ? (
          <div className="relative" style={{ height: 480 }}>
            {visibleCards.map((card, i) => {
              const reverseIndex = visibleCards.length - 1 - i;
              return (
                <SwipeCard
                  key={card.id}
                  card={card}
                  active={i === 0}
                  zIndex={visibleCards.length - i}
                  stackOffset={reverseIndex * 10}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onAmen={handleAmen}
                />
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "linear-gradient(135deg, #F5E8D8, #E8D0B8)" }}>
              <Check size={36} style={{ color: "#C87A50" }} />
            </div>
            <h2 className="text-2xl font-black mb-2" style={{ color: "#2D1A0E" }}>You've seen them all!</h2>
            <p className="text-sm mb-6" style={{ color: "#9A8A7A" }}>
              {saved.size} recipe{saved.size !== 1 ? "s" : ""} saved to your library
            </p>
            <button
              onClick={resetDeck}
              className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: "#2D1A0E", color: "#F5F0E8" }}
            >
              <RotateCcw size={15} />
              Start over
            </button>
          </div>
        )}

        {/* Progress + stats */}
        {deck.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-xs" style={{ color: "#9A8A7A" }}>
            <span>{swipedCount} swiped · {saved.size} saved</span>
            <span>{deck.length} remaining</span>
          </div>
        )}

        {/* Swipe hint icons */}
        {deck.length > 0 && (
          <div className="mt-5 flex justify-between px-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-base"
                style={{ borderColor: "#D0A0A0", color: "#B03A3A" }}>←</div>
              <span className="text-xs" style={{ color: "#C0A8A8" }}>Skip</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-base"
                style={{ borderColor: "#A0C0A0", color: "#4A7A4A" }}>→</div>
              <span className="text-xs" style={{ color: "#A0C0A0" }}>Amen</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
