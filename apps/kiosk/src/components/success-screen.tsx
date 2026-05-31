import React, { useEffect } from 'react';
import type { PersonType, Direction } from '@pmg/contracts';

interface Props {
  direction: Direction;
  displayName: string;
  personType: PersonType;
  message?: string | undefined;
  onDone: () => void;
  autoReturnMs?: number;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  in: 'Signed in',
  out: 'Signed out',
};

const PERSON_ICON: Record<PersonType, string> = {
  employee: '👤',
  patient: '🏥',
  visitor: '🧑‍🤝‍🧑',
};

export function SuccessScreen({
  direction,
  displayName,
  personType,
  message,
  onDone,
  autoReturnMs = 4000,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, autoReturnMs);
    return () => clearTimeout(t);
  }, [onDone, autoReturnMs]);

  return (
    <div className="min-h-screen bg-pmg-navy flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-pmg-green/20 rounded-full w-28 h-28 flex items-center justify-center mb-6">
        <span className="text-6xl">{PERSON_ICON[personType]}</span>
      </div>
      <div className="text-pmg-green text-2xl font-semibold mb-1">✓ {DIRECTION_LABEL[direction]}</div>
      <h2 className="text-white text-4xl font-semibold mt-2">{displayName}</h2>
      {message && <p className="text-white/60 text-lg mt-4 max-w-sm">{message}</p>}
      <p className="text-white/40 text-sm mt-8">Returning to home screen…</p>
      <button
        onClick={onDone}
        className="mt-4 px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
