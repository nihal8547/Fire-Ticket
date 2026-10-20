"use client";

import { useEffect } from "react";

export function AutoSyncHeartbeat() {
  useEffect(() => {
    const runCheck = async () => {
      try {
        await fetch("/api/synology/cron");
      } catch (e) {
        // Silent background heartbeat
      }
    };

    // Run once on dashboard load, then every 2 minutes
    runCheck();
    const timer = setInterval(runCheck, 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return null;
}
