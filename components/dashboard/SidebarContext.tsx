"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getDashboardStats } from "@/app/actions/sales";

export interface DashProfile {
  plan: string;
  monthly_brief_used: number;
  monthly_brief_quota: number;
  display_name?: string | null;
  email?: string | null;
  total_briefs: number;
  crm_pushes: number;
  hours_saved: number;
}

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  profile: DashProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<DashProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await getDashboardStats();
      if (res.ok && res.data) {
        setProfile({
          plan: res.data.profile?.plan || "free",
          monthly_brief_used: res.data.profile?.monthly_brief_used ?? 0,
          monthly_brief_quota: res.data.profile?.monthly_brief_quota ?? 10,
          display_name: res.data.profile?.display_name ?? null,
          email: res.data.profile?.email ?? null,
          total_briefs: res.data.total_briefs ?? 0,
          crm_pushes: res.data.crm_pushes ?? 0,
          hours_saved: res.data.hours_saved ?? 0,
        });
      }
    } catch {
      // silently fail — profile stays null
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch once on mount
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, profile, profileLoading, refreshProfile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
