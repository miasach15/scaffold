import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_CATEGORY_COLOR_KEYS, DEFAULT_CATEGORY_KEYS, DEFAULT_THEME } from "../lib/constants";

const fromRow = (row) => ({
  name: row.name || "",
  focusAreas: row.focus_areas || [],
  workStyle: row.work_style || "Mix of both",
  onboarded: !!row.onboarded,
  enabledPages: row.enabled_pages || [],
  themeColor: row.theme_color || DEFAULT_THEME,
  categoryColors: { ...DEFAULT_CATEGORY_COLOR_KEYS, ...(row.category_colors || {}) },
  // null/missing means "still using the default set" — once customized, whatever the
  // user renamed/added/removed to is stored verbatim, in their chosen order.
  categoryKeys: row.category_keys && row.category_keys.length > 0 ? row.category_keys : DEFAULT_CATEGORY_KEYS,
  tourSeen: !!row.tour_seen,
  whatnowNotifications: !!row.whatnow_notifications,
  whatnowIntervalMinutes: row.whatnow_interval_minutes ?? 60,
  whatnowWindowStart: row.whatnow_window_start ?? 8,
  whatnowWindowEnd: row.whatnow_window_end ?? 21,
});

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    let { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!data && !error) {
      const insertRes = await supabase.from("profiles").insert({ id: userId }).select().single();
      data = insertRes.data;
    }
    if (data) setProfile(fromRow(data));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(
    async (patch) => {
      if (!userId) return;
      setProfile((p) => ({ ...p, ...patch }));
      const dbPatch = {};
      if ("name" in patch) dbPatch.name = patch.name;
      if ("focusAreas" in patch) dbPatch.focus_areas = patch.focusAreas;
      if ("workStyle" in patch) dbPatch.work_style = patch.workStyle;
      if ("onboarded" in patch) dbPatch.onboarded = patch.onboarded;
      if ("enabledPages" in patch) dbPatch.enabled_pages = patch.enabledPages;
      if ("themeColor" in patch) dbPatch.theme_color = patch.themeColor;
      if ("categoryColors" in patch) dbPatch.category_colors = patch.categoryColors;
      if ("categoryKeys" in patch) dbPatch.category_keys = patch.categoryKeys;
      if ("tourSeen" in patch) dbPatch.tour_seen = patch.tourSeen;
      if ("whatnowNotifications" in patch) dbPatch.whatnow_notifications = patch.whatnowNotifications;
      if ("whatnowIntervalMinutes" in patch) dbPatch.whatnow_interval_minutes = patch.whatnowIntervalMinutes;
      if ("whatnowWindowStart" in patch) dbPatch.whatnow_window_start = patch.whatnowWindowStart;
      if ("whatnowWindowEnd" in patch) dbPatch.whatnow_window_end = patch.whatnowWindowEnd;
      const { error } = await supabase.from("profiles").update(dbPatch).eq("id", userId);
      if (error) console.error("updateProfile failed:", error.message);
    },
    [userId]
  );

  return { profile, loading, updateProfile };
}
