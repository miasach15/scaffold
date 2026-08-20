import { supabase } from "./supabase";

// Every table that holds user data — every one of them has a user_id column except
// profiles, which is keyed by id (== the user's auth id) directly.
const TABLES = [
  "events", "edu_items", "tasks", "inbox_items",
  "goals", "milestones", "goal_actions",
  "habits", "habit_done_dates",
  "journal_entries",
  "watch_items", "books", "restaurants", "bucket_list_items",
  "packing_lists", "packing_list_items", "gifts", "notes",
];

// Fetches every row you own, across every table, and hands back one JSON object keyed
// by table name — a full backup you can keep for yourself, independent of Supabase.
export async function exportAllData(userId) {
  const [{ data: profile, error: profileErr }, ...rest] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId),
    ...TABLES.map((table) => supabase.from(table).select("*").eq("user_id", userId)),
  ]);

  const out = { exportedAt: new Date().toISOString(), userId };
  out.profiles = profileErr ? { error: profileErr.message } : profile || [];
  TABLES.forEach((table, i) => {
    const { data, error } = rest[i];
    out[table] = error ? { error: error.message } : data || [];
  });
  return out;
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
