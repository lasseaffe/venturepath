"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  Flame,
  Star,
  ChevronRight,
  Users,
  Plus,
  HelpCircle,
  BarChart2,
  ArrowRight,
} from "lucide-react";

const UNITS = [
  {
    id: "u1",
    number: 1,
    title: "The Restoration",
    description: "The First Vision, Joseph Smith, and the restoration of the gospel.",
    lessons: 4,
    color: "#4A7A4A",
    bg: "linear-gradient(135deg, #EDF5ED 0%, #D8EDD8 100%)",
    unlocked: true,
  },
  {
    id: "u2",
    number: 2,
    title: "The Book of Mormon",
    description: "Another Testament of Jesus Christ — its origins, message, and witness.",
    lessons: 5,
    color: "#C87A50",
    bg: "linear-gradient(135deg, #FDF0E8 0%, #F5E0D0 100%)",
    unlocked: true,
  },
  {
    id: "u3",
    number: 3,
    title: "The Atonement of Jesus Christ",
    description: "Understanding the infinite Atonement and its personal power in your life.",
    lessons: 4,
    color: "#3A6A8A",
    bg: "linear-gradient(135deg, #EDF2F8 0%, #DCE7F5 100%)",
    unlocked: true,
  },
  {
    id: "u4",
    number: 4,
    title: "Covenants & Ordinances",
    description: "Baptism, the gift of the Holy Ghost, and making sacred covenants with God.",
    lessons: 3,
    color: "#7A5A3A",
    bg: "linear-gradient(135deg, #F5EFE8 0%, #EDE0D0 100%)",
    unlocked: false,
  },
  {
    id: "u5",
    number: 5,
    title: "Living the Gospel Daily",
    description: "Prayer, scripture study, fasting, tithing, and Sabbath observance.",
    lessons: 5,
    color: "#5A7A9A",
    bg: "linear-gradient(135deg, #EEF2F8 0%, #DCE7F5 100%)",
    unlocked: false,
  },
  {
    id: "u6",
    number: 6,
    title: "The Eternal Family",
    description: "The family proclamation, eternal marriage, and family history.",
    lessons: 4,
    color: "#8A4A7A",
    bg: "linear-gradient(135deg, #F5EDF4 0%, #EDD8E8 100%)",
    unlocked: false,
  },
];

const QUIZ_QUESTIONS = [
  {
    q: "What year did Joseph Smith receive the First Vision?",
    options: ["1820", "1830", "1823", "1827"],
    answer: 0,
  },
  {
    q: "The Book of Mormon was translated from plates made of what material?",
    options: ["Gold", "Bronze", "Brass", "Silver"],
    answer: 0,
  },
  {
    q: "In which grove of trees did Joseph Smith pray and receive his vision?",
    options: ["Sacred Grove", "Liberty Grove", "Palmyra Forest", "Harmony Woods"],
    answer: 0,
  },
];

const CLASSROOMS = [
  {
    id: "cr1",
    name: "Provo YSA Scripture Study",
    members: 24,
    unit: "The Book of Mormon",
    color: "#4A7A4A",
  },
  {
    id: "cr2",
    name: "Smith Family Come Follow Me",
    members: 6,
    unit: "The Atonement",
    color: "#C87A50",
  },
];

export default function LearnPage() {
  const [completedUnits, setCompletedUnits] = useState<Set<string>>(
    new Set(["u1", "u2"])
  );
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizQ, setQuizQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [streak, setStreak] = useState(7);

  const progress = Math.round((completedUnits.size / UNITS.length) * 100);

  function answerQuiz(idx: number) {
    const next = [...quizAnswers, idx];
    setQuizAnswers(next);
    if (quizQ + 1 < QUIZ_QUESTIONS.length) {
      setQuizQ(quizQ + 1);
    } else {
      setQuizDone(true);
    }
  }

  const quizScore = quizAnswers.filter(
    (a, i) => a === QUIZ_QUESTIONS[i].answer
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#2D4A2D" }}>
            Scripture Learning
          </h1>
          <p style={{ color: "#7A9A7A" }}>
            Study the gospel at your own pace. Track your progress, take quizzes, and grow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "#FDF0E8" }}
          >
            <Flame size={16} style={{ color: "#C87A50" }} />
            <span className="text-sm font-bold" style={{ color: "#C87A50" }}>
              {streak} day streak
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "#EDF5ED" }}
          >
            <Trophy size={16} style={{ color: "#4A7A4A" }} />
            <span className="text-sm font-bold" style={{ color: "#4A7A4A" }}>
              {completedUnits.size} / {UNITS.length} units
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="rounded-2xl p-5 mb-8"
        style={{ background: "linear-gradient(135deg, #1E3320 0%, #2D4A2D 100%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "#C8DCC8" }}>
            Overall Progress
          </p>
          <p className="text-sm font-bold" style={{ color: "#E8C49A" }}>
            {progress}%
          </p>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #9BB89A 0%, #E8C49A 100%)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs" style={{ color: "#4A6A4A" }}>
            {completedUnits.size} units complete
          </p>
          <p className="text-xs" style={{ color: "#4A6A4A" }}>
            {UNITS.length - completedUnits.size} remaining
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Roadmap */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: "#9BB89A" }}
          >
            Learning Roadmap
          </p>

          {/* Vertical path */}
          <div className="relative">
            {/* Vertical connector line */}
            <div
              className="absolute left-5 top-8 bottom-8 w-0.5"
              style={{ background: "linear-gradient(to bottom, #9BB89A 0%, #DDE8DD 100%)" }}
            />

            <div className="space-y-3">
              {UNITS.map((unit, idx) => {
                const done = completedUnits.has(unit.id);
                const active = activeUnit === unit.id;
                const locked = !unit.unlocked && !done;

                return (
                  <div key={unit.id} className="relative pl-14">
                    {/* Node dot */}
                    <div
                      className="absolute left-2.5 top-5 w-5 h-5 rounded-full flex items-center justify-center border-2 z-10"
                      style={{
                        background: done ? unit.color : locked ? "#DDE8DD" : "#FEFCF7",
                        borderColor: done ? unit.color : locked ? "#DDE8DD" : unit.color,
                      }}
                    >
                      {done ? (
                        <CheckCircle2 size={12} style={{ color: "#fff" }} />
                      ) : locked ? (
                        <Lock size={10} style={{ color: "#B8C8B8" }} />
                      ) : (
                        <Circle size={10} style={{ color: unit.color }} />
                      )}
                    </div>

                    {/* Card */}
                    <div
                      className="rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md"
                      style={{
                        background: active ? unit.bg : "#FEFCF7",
                        borderColor: active ? "transparent" : "#DDE8DD",
                        opacity: locked ? 0.55 : 1,
                      }}
                      onClick={() => !locked && setActiveUnit(active ? null : unit.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-xs font-semibold uppercase tracking-wide"
                              style={{ color: locked ? "#9AAA9A" : unit.color }}
                            >
                              Unit {unit.number}
                            </span>
                            {done && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: unit.color + "20", color: unit.color }}
                              >
                                Complete ✓
                              </span>
                            )}
                            {locked && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "#F5F0E8", color: "#9AAA9A" }}
                              >
                                Locked
                              </span>
                            )}
                          </div>
                          <h3
                            className="font-bold text-base"
                            style={{ color: locked ? "#9AAA9A" : "#2D4A2D" }}
                          >
                            {unit.title}
                          </h3>
                          {active && (
                            <p className="text-sm mt-1 leading-relaxed" style={{ color: "#5A7A5A" }}>
                              {unit.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs" style={{ color: "#9AAA9A" }}>
                            {unit.lessons} lessons
                          </span>
                          <ChevronRight
                            size={14}
                            style={{
                              color: "#9BB89A",
                              transform: active ? "rotate(90deg)" : "none",
                              transition: "transform 0.2s",
                            }}
                          />
                        </div>
                      </div>

                      {active && !locked && (
                        <div className="mt-4 flex gap-2 flex-wrap">
                          <button
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                            style={{ background: unit.color, color: "#fff" }}
                          >
                            <BookOpen size={13} />
                            Start Unit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuizActive(true);
                              setQuizQ(0);
                              setQuizAnswers([]);
                              setQuizDone(false);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border"
                            style={{ borderColor: unit.color, color: unit.color }}
                          >
                            <HelpCircle size={13} />
                            Quick Quiz
                          </button>
                          {!done && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompletedUnits((prev) => {
                                  const n = new Set(prev);
                                  n.add(unit.id);
                                  return n;
                                });
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border"
                              style={{ borderColor: "#DDE8DD", color: "#9AAA9A" }}
                            >
                              <CheckCircle2 size={13} />
                              Mark complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 sticky top-20">
          {/* My Classrooms */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FEFCF7", border: "1px solid #DDE8DD" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold" style={{ color: "#2D4A2D" }}>
                My Classrooms
              </p>
              <button style={{ color: "#4A7A4A" }}>
                <Plus size={14} />
              </button>
            </div>
            {CLASSROOMS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5 border-b last:border-0"
                style={{ borderColor: "#EDF5ED" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: c.color + "18" }}
                >
                  <Users size={14} style={{ color: c.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#2D4A2D" }}>
                    {c.name}
                  </p>
                  <p className="text-xs" style={{ color: "#9AAA9A" }}>
                    {c.members} members · {c.unit}
                  </p>
                </div>
                <ChevronRight size={12} style={{ color: "#C8D8C8" }} />
              </div>
            ))}
            <button
              className="w-full mt-3 py-2 rounded-xl border text-xs font-medium transition-colors hover:bg-green-50"
              style={{ borderColor: "#DDE8DD", color: "#4A7A4A" }}
            >
              + Create classroom
            </button>
          </div>

          {/* Stats */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #1E3320 0%, #2D4A2D 100%)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#9BB89A" }}>
              Your Progress
            </p>
            {[
              { label: "Days active", value: `${streak}`, icon: Flame, color: "#E8C49A" },
              { label: "Units complete", value: `${completedUnits.size}/${UNITS.length}`, icon: Trophy, color: "#9BB89A" },
              { label: "Quizzes passed", value: "3", icon: Star, color: "#A8C4E8" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 mb-3 last:mb-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#4A6A4A" }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: "#C8DCC8" }}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Link to Talk Generator */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FDF0E8", border: "1px solid #F0DDD0" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C87A50" }}>
              Use What You&apos;ve Learned
            </p>
            <p className="text-sm mb-3" style={{ color: "#7A5A3A" }}>
              Turn your study into a talk or lesson with HolyFlex Speak.
            </p>
            <Link
              href="/talk-generator"
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "#C87A50" }}
            >
              Open Talk Generator
              <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
      </div>

      {/* Quiz modal */}
      {quizActive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-7 shadow-2xl"
            style={{ background: "#FEFCF7" }}
          >
            {!quizDone ? (
              <>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "#9BB89A" }}
                >
                  Quick Quiz · {quizQ + 1} of {QUIZ_QUESTIONS.length}
                </p>
                <h3 className="text-lg font-bold mb-6" style={{ color: "#2D4A2D" }}>
                  {QUIZ_QUESTIONS[quizQ].q}
                </h3>
                <div className="space-y-2.5">
                  {QUIZ_QUESTIONS[quizQ].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(i)}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all hover:scale-[1.01]"
                      style={{ borderColor: "#DDE8DD", color: "#2D4A2D" }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-4">
                  {quizScore === QUIZ_QUESTIONS.length ? "🏆" : quizScore >= 2 ? "⭐" : "📚"}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#2D4A2D" }}>
                  {quizScore}/{QUIZ_QUESTIONS.length} correct
                </h3>
                <p className="text-sm mb-6" style={{ color: "#7A9A7A" }}>
                  {quizScore === QUIZ_QUESTIONS.length
                    ? "Perfect score! Keep up the great study habits."
                    : "Good effort! Keep reading and try again."}
                </p>
                <button
                  onClick={() => setQuizActive(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "#4A7A4A", color: "#F5F0E8" }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
