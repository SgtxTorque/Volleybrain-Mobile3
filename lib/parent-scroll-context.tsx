/**
 * ParentScrollContext — signals to the tab bar when the parent home scroll
 * is active and scrolling, so the nav can auto-hide.
 * Only affects parent home screen; other tabs/roles are unaffected.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ParentScrollContextType = {
  isScrolling: boolean;
  setScrolling: (value: boolean) => void;
  /** Call on every scroll event to reset the idle timer */
  notifyScroll: () => void;
  /** Whether the parent home scroll screen is mounted */
  isParentScrollActive: boolean;
  setParentScrollActive: (value: boolean) => void;
};

const ParentScrollContext = createContext<ParentScrollContextType>({
  isScrolling: false,
  setScrolling: () => {},
  notifyScroll: () => {},
  isParentScrollActive: false,
  setParentScrollActive: () => {},
});

const NAV_IDLE_TIMEOUT = 850; // ms before nav reappears

export function ParentScrollProvider({ children }: { children: React.ReactNode }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [isParentScrollActive, setParentScrollActive] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyScroll = useCallback(() => {
    if (!isParentScrollActive) return;

    setIsScrolling(true);

    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(() => {
      setIsScrolling(false);
    }, NAV_IDLE_TIMEOUT);
  }, [isParentScrollActive]);

  const setScrolling = useCallback((value: boolean) => {
    setIsScrolling(value);
  }, []);

  return (
    <ParentScrollContext.Provider
      value={{
        isScrolling,
        setScrolling,
        notifyScroll,
        isParentScrollActive,
        setParentScrollActive,
      }}
    >
      {children}
    </ParentScrollContext.Provider>
  );
}

export const useParentScroll = () => useContext(ParentScrollContext);
