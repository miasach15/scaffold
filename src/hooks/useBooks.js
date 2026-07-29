import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  author: row.author,
  status: row.status,
  rating: row.rating,
  notes: row.notes,
});

export function useBooks(userId) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("books").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setBooks((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addBook = useCallback(
    async (title, author) => {
      const tt = title.trim();
      if (!userId || !tt) return;
      const row = { id: uid(), user_id: userId, title: tt, author: author.trim() || null, status: "Want to read" };
      setBooks((bs) => [fromRow(row), ...bs]);
      await supabase.from("books").insert(row);
    },
    [userId]
  );

  const setStatus = useCallback(async (id, status) => {
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    await supabase.from("books").update({ status }).eq("id", id);
  }, []);

  const setRating = useCallback(async (id, rating) => {
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, rating } : b)));
    await supabase.from("books").update({ rating }).eq("id", id);
  }, []);

  const removeBook = useCallback(async (id) => {
    setBooks((bs) => bs.filter((b) => b.id !== id));
    await supabase.from("books").delete().eq("id", id);
  }, []);

  return { books, loading, addBook, setStatus, setRating, removeBook };
}
