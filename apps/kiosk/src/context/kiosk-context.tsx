import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const FIRE_KEY = 'pmg-kiosk-fire-active';
const IDLE_MS = 60_000;

interface KioskState {
  isFireActive: boolean;
  activateFireLock: (fireEventId: string) => void;
  clearFireLock: () => void;
  resetIdle: () => void;
}

const KioskContext = createContext<KioskState | null>(null);

export function KioskProvider({
  children,
  onIdle,
}: Readonly<{ children: React.ReactNode; onIdle: () => void }>) {
  const [isFireActive, setIsFireActive] = useState<boolean>(() => {
    return localStorage.getItem(FIRE_KEY) === 'true';
  });

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => onIdle(), IDLE_MS);
  }, [onIdle]);

  useEffect(() => {
    resetIdle();
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const handler = () => resetIdle();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [resetIdle]);

  const activateFireLock = useCallback((_fireEventId: string) => {
    localStorage.setItem(FIRE_KEY, 'true');
    setIsFireActive(true);
  }, []);

  const clearFireLock = useCallback(() => {
    localStorage.removeItem(FIRE_KEY);
    setIsFireActive(false);
  }, []);

  return (
    <KioskContext.Provider value={{ isFireActive, activateFireLock, clearFireLock, resetIdle }}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk(): KioskState {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk must be used inside KioskProvider');
  return ctx;
}
