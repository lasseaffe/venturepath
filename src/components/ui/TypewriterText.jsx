import { useEffect, useRef, useState } from 'react';

export function TypewriterText({
  text,
  speed = 38,
  onDone,
  className,
  cursorColor = '#E67E22',
  style,
}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setDisplayed('');
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
        clearInterval(timerRef.current);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [text, speed]);

  useEffect(() => {
    if (document.getElementById('tw-blink-style')) return;
    const s = document.createElement('style');
    s.id = 'tw-blink-style';
    s.textContent = '@keyframes tw-blink{0%,100%{opacity:1}50%{opacity:0}}';
    document.head.appendChild(s);
  }, []);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 2,
            height: '0.85em',
            background: cursorColor,
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'tw-blink 1s step-end infinite',
          }}
        />
      )}
    </span>
  );
}
