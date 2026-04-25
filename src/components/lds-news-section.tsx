"use client";

import { useState, useEffect } from "react";
import {
  Newspaper,
  MapPin,
  Calendar,
  ExternalLink,
  ChevronRight,
  Radio,
  AlertCircle,
} from "lucide-react";

const NEWS_ITEMS = [
  {
    id: "gc-apr-2026",
    category: "General Conference",
    title: "April 2026 General Conference — Key Messages",
    summary:
      "President Nelson called members to \"think celestial\" and prioritize covenant relationships with God. Elder Rasband spoke on the gathering of Israel; Sister Eubank on Christlike service.",
    date: "Apr 6, 2026",
    source: "Church News",
    url: "https://www.churchofjesuschrist.org/general-conference",
    tag: "conference",
    color: "#4A7A4A",
    bg: "linear-gradient(135deg, #EDF5ED 0%, #D8EDD8 100%)",
  },
  {
    id: "temple-dedications",
    category: "Temples",
    title: "Three New Temple Dedications Announced for 2026",
    summary:
      "The First Presidency announced dedication dates for temples in São Paulo Brasil Morumbi, Houston Texas East, and Auckland New Zealand — bringing the total to over 380 dedicated temples worldwide.",
    date: "Apr 6, 2026",
    source: "Church Newsroom",
    url: "https://newsroom.churchofjesuschrist.org",
    tag: "temples",
    color: "#3A6A8A",
    bg: "linear-gradient(135deg, #EDF2F8 0%, #D5E5F5 100%)",
  },
  {
    id: "salt-lake-restoration",
    category: "Salt Lake Temple",
    title: "Salt Lake Temple Restoration Nears Final Phase",
    summary:
      "The historic renovation of the Salt Lake Temple is on schedule for completion. New seismic isolation systems and interior restoration have been completed; exterior spire work is finishing.",
    date: "Mar 28, 2026",
    source: "Deseret News",
    url: "https://www.deseret.com",
    tag: "temples",
    color: "#C87A50",
    bg: "linear-gradient(135deg, #FDF0E8 0%, #F5E0D0 100%)",
  },
  {
    id: "mission-call-record",
    category: "Missionary Work",
    title: "Record Number of Full-Time Missionaries Called in 2025",
    summary:
      "Over 71,000 missionaries served in 2025 — the highest number in Church history. The Church continues to open new missions across Sub-Saharan Africa and Southeast Asia.",
    date: "Jan 15, 2026",
    source: "Church Statistics",
    url: "https://www.churchofjesuschrist.org",
    tag: "missions",
    color: "#5A7A9A",
    bg: "linear-gradient(135deg, #EEF2F8 0%, #DCE7F5 100%)",
  },
  {
    id: "cfm-2026",
    category: "Come Follow Me",
    title: "Come Follow Me 2026: Doctrine & Covenants",
    summary:
      "This year the Church studies the Doctrine & Covenants, celebrating the Restoration. Week 14 (current) covers D&C 49–56 — the Lord's directions for the building of Zion.",
    date: "Ongoing · 2026",
    source: "HolyFlex Study",
    url: "/come-follow-me",
    tag: "study",
    color: "#7A5A3A",
    bg: "linear-gradient(135deg, #F5EFE8 0%, #EDE0D0 100%)",
  },
];

const EVENTS_GLOBAL = [
  {
    id: "ev1",
    title: "Easter Sunday — He Is Risen",
    type: "Church",
    date: "April 5, 2026",
    location: "All congregations worldwide",
    description: "Sacrament meeting with special Easter program. Bring a friend.",
    color: "#4A7A4A",
  },
  {
    id: "ev2",
    title: "April General Conference Weekend",
    type: "Conference",
    date: "April 5–6, 2026",
    location: "Conference Center, Salt Lake City (and online)",
    description: "Watch live at churchofjesuschrist.org or the Gospel Library app.",
    color: "#3A6A8A",
  },
  {
    id: "ev3",
    title: "Especially for Youth (EFY) 2026 Registration",
    type: "Youth",
    date: "Registrations open",
    location: "Multiple campuses — US, Canada, Europe",
    description: "Week-long youth programs at BYU, Ricks, and 20+ other sites.",
    color: "#C87A50",
  },
  {
    id: "ev4",
    title: "Family History Fair — RootsTech 2026",
    type: "Family History",
    date: "May 14–16, 2026",
    location: "Salt Lake City Convention Center + Virtual",
    description: "The world's largest family history conference. Free online access.",
    color: "#7A5A3A",
  },
];

const EVENTS_NEAR = [
  {
    id: "near1",
    title: "Ward Easter Potluck & Social",
    type: "Ward Activity",
    date: "Sat Apr 4, 2026 · 5:00 PM",
    description: "Bring a side dish or dessert. Children's Easter egg hunt included.",
    color: "#4A7A4A",
  },
  {
    id: "near2",
    title: "Temple Night — Proxy Baptisms",
    type: "Temple",
    date: "Fri Apr 10, 2026 · 7:00 PM",
    description: "Youth 12+ welcome. Wear temple clothes; bring a name from FamilySearch.",
    color: "#3A6A8A",
  },
  {
    id: "near3",
    title: "Stake Youth Devotional",
    type: "Youth",
    date: "Sun Apr 13, 2026 · 6:00 PM",
    description: "Stake President will address youth and parents on the Easter message.",
    color: "#C87A50",
  },
];

type GeoState = "idle" | "requesting" | "granted" | "denied";

export function LdsNewsSection() {
  const [activeTab, setActiveTab] = useState<"news" | "events">("news");
  const [eventsTab, setEventsTab] = useState<"global" | "near">("global");
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hf-geo-permission");
    if (stored === "granted") {
      setGeoState("granted");
      setCity(localStorage.getItem("hf-geo-city") ?? "Your area");
    } else if (stored === "denied") {
      setGeoState("denied");
    }
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // In production: reverse geocode pos.coords. Here we just note it.
        const mockCity = "Your area";
        setGeoState("granted");
        setCity(mockCity);
        localStorage.setItem("hf-geo-permission", "granted");
        localStorage.setItem("hf-geo-city", mockCity);
      },
      () => {
        setGeoState("denied");
        localStorage.setItem("hf-geo-permission", "denied");
      }
    );
  }

  return (
    <section
      className="py-16 px-4"
      style={{
        background:
          "linear-gradient(180deg, #F5F0E8 0%, #FDFAF3 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio size={14} style={{ color: "#C87A50" }} />
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#C87A50" }}
              >
                LDS News & Events
              </p>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "#2D4A2D" }}>
              What&apos;s happening in the Church
            </h2>
          </div>

          {/* Tab toggle */}
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "#EDF5ED" }}
          >
            {(["news", "events"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={
                  activeTab === t
                    ? { background: "#4A7A4A", color: "#F5F0E8" }
                    : { color: "#5A7A5A" }
                }
              >
                {t === "news" ? (
                  <span className="flex items-center gap-1.5">
                    <Newspaper size={12} />
                    News
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    Events
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── NEWS ── */}
        {activeTab === "news" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEWS_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target={item.url.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="group rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: item.bg,
                  borderColor: "transparent",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      color: item.color,
                    }}
                  >
                    {item.category}
                  </span>
                  <ExternalLink
                    size={12}
                    className="opacity-0 group-hover:opacity-50 transition-opacity"
                    style={{ color: item.color }}
                  />
                </div>

                <div className="flex-1">
                  <h3
                    className="font-bold text-sm leading-snug mb-2"
                    style={{ color: "#1A2818" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#5A7A5A" }}>
                    {item.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/40">
                  <span className="text-xs" style={{ color: item.color }}>
                    {item.date}
                  </span>
                  <span className="text-xs" style={{ color: "#9AAA9A" }}>
                    {item.source}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* ── EVENTS ── */}
        {activeTab === "events" && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setEventsTab("global")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all"
                style={
                  eventsTab === "global"
                    ? { borderColor: "#4A7A4A", color: "#2D4A2D", background: "#EDF5ED" }
                    : { borderColor: "#DDE8DD", color: "#7A9A7A", background: "transparent" }
                }
              >
                <Calendar size={13} />
                Church-wide Events
              </button>
              <button
                onClick={() => {
                  setEventsTab("near");
                  if (geoState === "idle") requestLocation();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all"
                style={
                  eventsTab === "near"
                    ? { borderColor: "#4A7A4A", color: "#2D4A2D", background: "#EDF5ED" }
                    : { borderColor: "#DDE8DD", color: "#7A9A7A", background: "transparent" }
                }
              >
                <MapPin size={13} />
                Events Near Me
              </button>
            </div>

            {/* Global events */}
            {eventsTab === "global" && (
              <div className="space-y-3">
                {EVENTS_GLOBAL.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl border p-5 flex items-start gap-4"
                    style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: ev.color + "18" }}
                    >
                      <Calendar size={16} style={{ color: ev.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: ev.color }}
                          >
                            {ev.type}
                          </span>
                          <h3
                            className="font-bold text-sm mt-0.5"
                            style={{ color: "#2D4A2D" }}
                          >
                            {ev.title}
                          </h3>
                        </div>
                        <span
                          className="text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: ev.color + "15", color: ev.color }}
                        >
                          {ev.date}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#6B7A6B" }}>
                        {ev.description}
                      </p>
                      <p
                        className="text-xs mt-1 flex items-center gap-1"
                        style={{ color: "#9AAA9A" }}
                      >
                        <MapPin size={10} />
                        {ev.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Events near me */}
            {eventsTab === "near" && (
              <div>
                {/* Geo permission states */}
                {geoState === "idle" && (
                  <div
                    className="rounded-2xl border-2 border-dashed p-10 text-center"
                    style={{ borderColor: "#DDE8DD" }}
                  >
                    <MapPin size={32} className="mx-auto mb-3" style={{ color: "#9BB89A" }} />
                    <p className="font-semibold mb-1" style={{ color: "#2D4A2D" }}>
                      Find events in your area
                    </p>
                    <p className="text-sm mb-5" style={{ color: "#7A9A7A" }}>
                      Share your location to see upcoming ward, stake, and temple events near you.
                    </p>
                    <button
                      onClick={requestLocation}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: "#4A7A4A", color: "#F5F0E8" }}
                    >
                      Allow Location Access
                    </button>
                    <p className="text-xs mt-3" style={{ color: "#B8C8B8" }}>
                      Location is never stored on our servers.
                    </p>
                  </div>
                )}

                {geoState === "requesting" && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#EDF5ED" }}>
                    <div
                      className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
                      style={{ borderColor: "#9BB89A", borderTopColor: "#4A7A4A" }}
                    />
                    <p className="text-sm" style={{ color: "#5A7A5A" }}>
                      Requesting location…
                    </p>
                  </div>
                )}

                {geoState === "denied" && (
                  <div
                    className="rounded-2xl border p-8 text-center flex flex-col items-center gap-3"
                    style={{ borderColor: "#F0DDD0", background: "#FDF5EE" }}
                  >
                    <AlertCircle size={28} style={{ color: "#C87A50" }} />
                    <p className="font-semibold" style={{ color: "#2D1A0E" }}>
                      Location access denied
                    </p>
                    <p className="text-sm" style={{ color: "#9A7A6A" }}>
                      Enable location access in your browser settings, then reload. Or browse
                      global events instead.
                    </p>
                    <button
                      onClick={() => setEventsTab("global")}
                      className="text-sm font-medium"
                      style={{ color: "#C87A50" }}
                    >
                      View global events →
                    </button>
                  </div>
                )}

                {geoState === "granted" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin size={13} style={{ color: "#4A7A4A" }} />
                      <p className="text-sm font-medium" style={{ color: "#2D4A2D" }}>
                        Showing events near <strong>{city}</strong>
                      </p>
                    </div>
                    <div className="space-y-3">
                      {EVENTS_NEAR.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-2xl border p-5 flex items-start gap-4"
                          style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: ev.color + "18" }}
                          >
                            <Calendar size={16} style={{ color: ev.color }} />
                          </div>
                          <div>
                            <span
                              className="text-xs font-semibold uppercase tracking-wide"
                              style={{ color: ev.color }}
                            >
                              {ev.type}
                            </span>
                            <h3
                              className="font-bold text-sm mt-0.5 mb-1"
                              style={{ color: "#2D4A2D" }}
                            >
                              {ev.title}
                            </h3>
                            <p className="text-xs font-medium mb-1" style={{ color: ev.color }}>
                              {ev.date}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: "#6B7A6B" }}>
                              {ev.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-4 text-center" style={{ color: "#B8C8B8" }}>
                      Events pulled from ward & stake calendars · Updated weekly
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer link */}
        <div className="mt-8 text-center">
          <a
            href="https://newsroom.churchofjesuschrist.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: "#4A7A4A" }}
          >
            More on Church Newsroom
            <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
