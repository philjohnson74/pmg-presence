import React, { useEffect, useState } from 'react';

interface Props {
  lastSynced: Date | null;
}

export function FreshnessClock({ lastSynced }: Readonly<Props>) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastSynced) return;
    const tick = () => {
      setSecondsAgo(Math.round((Date.now() - lastSynced.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSynced]);

  if (secondsAgo === null) return <span className="text-xs text-white/50">Connecting…</span>;

  const stale = secondsAgo > 30;

  if (stale) {
    const mins = Math.floor(secondsAgo / 60);
    const label = mins >= 1 ? `${mins}m` : `${secondsAgo}s`;
    return (
      <span className="text-xs font-semibold text-amber-300">
        ⚠ Last synced {label} ago
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold text-white/70">
      Updated {secondsAgo}s ago
    </span>
  );
}
