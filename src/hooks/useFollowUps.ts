"use client";

import { useEffect, useState } from "react";
import { subscribeClientFollowUps, subscribeMyFollowUps } from "@/services/followups";
import type { AppUser, FollowUp } from "@/types";

export function useClientFollowUps(clientId?: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    if (!clientId) return;
    return subscribeClientFollowUps(clientId, setFollowUps);
  }, [clientId]);

  return followUps;
}

export function useMyFollowUps(user: AppUser | null) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return subscribeMyFollowUps(user, (items) => {
      setFollowUps(items);
      setLoading(false);
    });
  }, [user]);

  return { followUps, loading };
}
