import React, { useEffect, useState } from 'react';

interface Props {
  lastHeartbeat: Date | null;
}

export function FreshnessClock({ lastHeartbeat }: Readonly<Props>) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastHeartbeat) return;
    const tick = () => {
      setSecondsAgo(Math.round((Date.now() - lastHeartbeat.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastHeartbeat]);

  if (secondsAgo === null) return <span className="text-xs text-white/50">Connecting…</span>;

  const stale = secondsAgo > 30;

  return (
    <span className={`text-xs font-semibold ${stale ? 'text-amber-300' : 'text-white/70'}`}>
      {stale
        ? `⚠ Last synced ${secondsAgo}s ago`
        : `Updated ${secondsAgo}s ago`}
    </span>
  );
}
