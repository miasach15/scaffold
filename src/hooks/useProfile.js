import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_CATEGORY_COLOR_KEYS, DEFAULT_CATEGORY_KEYS, DEFAULT_THEME } from "../lib/constants";
import { reportSaveError } from "../lib/saveErrors";

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
  // Covers both "I personally take longer to read/write" and formal extended-time
  // accommodations with one honest setting, rather than asking a student to untangle
  // which of the two applies — applied to a new session's own estimated duration and to
  // how much room the scheduler thinks a day actually has (see distributeDatesByLoad).
  paceMultiplier: Number(row.pace_multiplier ?? 1),
  // Energy dip + commute/transition time right when the day's active window opens —
  // shifts the effective start of scheduling later by this many minutes instead of
  // assuming the window opens at full capacity the moment it starts.
  afterSchoolBufferMinutes: row.after_school_buffer_minutes ?? 0,
  // A different, smaller buffer — not once at the start of the day, but around EVERY
  // fixed commitment: padding tacked onto the end of one thing and the start of the
  // next, so "done around X"/free-time math never assumes you can walk straight out of
  // one commitment and directly into flexible work (or the next one) with zero
  // transition. Separate from afterSchoolBufferMinutes on purpose — that one models a
  // single big energy dip at the start of the window, this one's the small gap every
  // single event/task actually needs around it.
  transitionBufferMinutes: row.transition_buffer_minutes ?? 0,
  // Whichever of the user's own categories currently plays the "this is Education-linked
  // stuff" role — starts as "School" but tracks a rename (see App.jsx's renameCategory),
  // so the Education/Grades pages and Today's priority sort keep working no matter what
  // it's actually called. This is the one category CategoryEditor won't let get removed
  // (see protectedKey) — Education/Grades tasks always need somewhere to land.
  educationCategory: row.education_category || "School",
  phoneNumber: row.phone_number || "",
  smsRemindersEnabled: !!row.sms_reminders_enabled,
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
      if ("paceMultiplier" in patch) dbPatch.pace_multiplier = patch.paceMultiplier;
      if ("afterSchoolBufferMinutes" in patch) dbPatch.after_school_buffer_minutes = patch.afterSchoolBufferMinutes;
      if ("transitionBufferMinutes" in patch) dbPatch.transition_buffer_minutes = patch.transitionBufferMinutes;
      if ("educationCategory" in patch) dbPatch.education_category = patch.educationCategory;
      if ("phoneNumber" in patch) dbPatch.phone_number = patch.phoneNumber || null;
      if ("smsRemindersEnabled" in patch) dbPatch.sms_reminders_enabled = patch.smsRemindersEnabled;
      const { error } = await supabase.from("profiles").update(dbPatch).eq("id", userId);
      if (error) {
        console.error("updateProfile failed:", error.message);
        reportSaveError();
      }
    },
    [userId]
  );

  return { profile, loading, updateProfile };
}
