import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { toISO } from "../lib/dateHelpers";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  doneDates: (row.habit_done_dates || []).map((d) => d.date),
});

export function useHabits(userId) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("habits")
      .select("*, habit_done_dates(date)")
      .eq("user_id", userId)
      .order("created_at");
    setHabits((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addHabit = useCallback(
    async (title) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      if (habits.some((h) => h.title.toLowerCase() === tt.toLowerCase())) return;
      const row = { id: uid(), user_id: userId, title: tt };
      setHabits((hs) => [...hs, { ...row, doneDates: [] }]);
      await supabase.from("habits").insert(row);
    },
    [userId, habits]
  );

  const addHabitsBulk = useCallback(
    async (titles) => {
      if (!userId || titles.length === 0) return;
      const rows = titles.map((t) => ({ id: uid(), user_id: userId, title: t }));
      setHabits((hs) => [...hs, ...rows.map((r) => ({ ...r, doneDates: [] }))]);
      await supabase.from("habits").insert(rows);
    },
    [userId]
  );

  const removeHabit = useCallback(async (id) => {
    setHabits((hs) => hs.filter((h) => h.id !== id));
    await supabase.from("habits").delete().eq("id", id);
  }, []);

  const setDone = useCallback(
    async (id, dateISO, done) => {
      if (!userId) return;
      setHabits((hs) => hs.map((h) => {
        if (h.id !== id) return h;
        const doneDates = done
          ? (h.doneDates.includes(dateISO) ? h.doneDates : [...h.doneDates, dateISO])
          : h.doneDates.filter((d) => d !== dateISO);
        return { ...h, doneDates };
      }));
      if (done) {
        await supabase.from("habit_done_dates").upsert({ id: uid(), user_id: userId, habit_id: id, date: dateISO }, { onConflict: "habit_id,date" });
      } else {
        await supabase.from("habit_done_dates").delete().eq("habit_id", id).eq("date", dateISO);
      }
    },
    [userId]
  );

  const setDoneToday = useCallback((id, done) => setDone(id, toISO(new Date()), done), [setDone]);

  return { habits, loading, addHabit, addHabitsBulk, removeHabit, setDone, setDoneToday };
}
