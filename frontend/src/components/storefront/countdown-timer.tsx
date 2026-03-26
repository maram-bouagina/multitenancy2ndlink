"use client";

import { useState, useEffect } from "react";

interface Props {
  targetDate: string;
  textColor?: string;
}

export function CountdownTimer({ targetDate, textColor = "#ffffff" }: Props) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    function update() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (expired) return <p className="text-sm opacity-80" style={{ color: textColor }}>This offer has ended.</p>;

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <span
            className="text-3xl sm:text-4xl font-bold tabular-nums bg-black/20 rounded-lg px-3 py-2 min-w-15 text-center"
            style={{ color: textColor }}
          >
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-xs mt-1 uppercase tracking-wide opacity-70" style={{ color: textColor }}>
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
