import React, { useEffect, useState } from 'react';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const ExpiryCountdown: React.FC<{ expiresAt: string | number | Date; onExpire?: () => void }> = ({ expiresAt, onExpire }) => {
  const [left, setLeft] = useState<number>(() => +new Date(expiresAt) - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = +new Date(expiresAt) - Date.now();
      setLeft(next);
      if (next <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return <span className="help">Expires in {fmt(left)}</span>;
};

export default ExpiryCountdown;
