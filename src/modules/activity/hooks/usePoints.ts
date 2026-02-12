"use client";

import { useEffect, useState } from "react";
import type { PointsBreakdown } from "@/components/profile/ProfileModals";

interface PointsState {
  total: number;
  breakdown: PointsBreakdown[];
  loading: boolean;
}

/**
 * Fetches loyalty points computed server-side from real account activity
 * (`GET /api/points`). Cached in memory for the session; refetch on demand.
 */
export function usePoints(enabled = true) {
  const [state, setState] = useState<PointsState>({ total: 0, breakdown: [], loading: true });

  const refresh = () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true }));
    fetch("/api/points")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setState({ total: data.total ?? 0, breakdown: data.breakdown ?? [], loading: false }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  };

  useEffect(refresh, [enabled]);

  return { ...state, refresh };
}
