import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  name: row.name,
  cuisine: row.cuisine,
  status: row.status,
  rating: row.rating,
  notes: row.notes,
});

export function useRestaurants(userId) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("restaurants").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setRestaurants((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addRestaurant = useCallback(
    async (name, cuisine) => {
      const nn = name.trim();
      if (!userId || !nn) return;
      const row = { id: uid(), user_id: userId, name: nn, cuisine: cuisine.trim() || null, status: "Want to try" };
      setRestaurants((rs) => [fromRow(row), ...rs]);
      await supabase.from("restaurants").insert(row);
    },
    [userId]
  );

  const setTried = useCallback(async (id, tried) => {
    const nextStatus = tried ? "Tried" : "Want to try";
    setRestaurants((rs) => rs.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    await supabase.from("restaurants").update({ status: nextStatus }).eq("id", id);
  }, []);

  const setRating = useCallback(async (id, rating) => {
    setRestaurants((rs) => rs.map((r) => (r.id === id ? { ...r, rating } : r)));
    await supabase.from("restaurants").update({ rating }).eq("id", id);
  }, []);

  const setNotes = useCallback(async (id, notes) => {
    setRestaurants((rs) => rs.map((r) => (r.id === id ? { ...r, notes } : r)));
    await supabase.from("restaurants").update({ notes }).eq("id", id);
  }, []);

  const removeRestaurant = useCallback(async (id) => {
    setRestaurants((rs) => rs.filter((r) => r.id !== id));
    await supabase.from("restaurants").delete().eq("id", id);
  }, []);

  return { restaurants, loading, addRestaurant, setTried, setRating, setNotes, removeRestaurant };
}
