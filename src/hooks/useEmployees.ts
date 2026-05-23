"use client";

import { useEffect, useState } from "react";
import { subscribeEmployees } from "@/services/employees";
import type { AppUser } from "@/types";

export function useEmployees(enabled = true) {
  const [employees, setEmployees] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    return subscribeEmployees((items) => {
      setEmployees(items);
      setLoading(false);
    });
  }, [enabled]);

  return { employees, loading };
}
