import { useState, useEffect } from 'react';

/**
 * Returns today's Date, refreshing automatically when the day changes.
 * Sets a timeout until local midnight so the value
 * updates without requiring a page reload.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const scheduleNextMidnight = () => {
      const now = new Date();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const laDateStr = now.toLocaleDateString('en-CA', { timeZone: tz });
      const laTimeStr = now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
      const [h, m, s] = laTimeStr.split(':').map(Number);
      const msUntilMidnight = ((24 - h - 1) * 3600 + (60 - m - 1) * 60 + (60 - s)) * 1000;
      // Add a small buffer (2s) to ensure we're past midnight
      const delay = msUntilMidnight + 2000;

      return setTimeout(() => {
        setToday(new Date());
      }, delay);
    };

    const timeout = scheduleNextMidnight();
    return () => clearTimeout(timeout);
  }, [today]); // re-schedule whenever today updates

  return today;
}
