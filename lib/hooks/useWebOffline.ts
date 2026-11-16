import { useEffect, useState } from 'react';

export function useWebOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOffline(window.navigator.onLine === false);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline;
}
