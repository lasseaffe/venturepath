"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onDone?: () => void;
  className?: string;
  cursorColor?: string;
  style?: React.CSSProperties;
}

export function TypewriterText({
  text,
  speed = 48,
  onDone,
  className,
  cursorColor = "#c8a96e",
  style,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;
    if (!text) {
      setDone(true);
      onDoneRef.current?.();
      return;
    }
    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current!);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [text, speed]);

  useEffect(() => {
    if (document.getElementById("tw-blink-style")) return;
    const style = document.createElement("style");
    style.id = "tw-blink-style";
    style.textContent = "@keyframes tw-blink{0%,100%{opacity:1}50%{opacity:0}}";
    document.head.appendChild(style);
  }, []);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 2,
            height: "0.85em",
            background: cursorColor,
            marginLeft: 2,
            verticalAlign: "middle",
            animation: "tw-blink 1s step-end infinite",
          }}
        />
      )}
    </span>
  );
}
