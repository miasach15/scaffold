import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";

const fromRow = (row) => ({
  id: row.id,
  recipient: row.recipient,
  occasion: row.occasion,
  idea: row.idea,
  status: row.status,
  price: row.price === null ? null : Number(row.price),
});

export const GIFT_STATUSES = ["Idea", "Bought", "Wrapped", "Given"];

export function useGifts(userId) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("gifts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setGifts((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addGift = useCallback(
    async (recipient, occasion, idea, price) => {
      const rr = recipient.trim();
      const ii = idea.trim();
      if (!userId || !rr || !ii) return;
      const row = { id: uid(), user_id: userId, recipient: rr, occasion: occasion.trim() || null, idea: ii, status: "Idea", price: price || null };
      setGifts((gs) => [fromRow(row), ...gs]);
      await supabase.from("gifts").insert(row);
    },
    [userId]
  );

  const setGiftStatus = useCallback(async (id, status) => {
    setGifts((gs) => gs.map((g) => (g.id === id ? { ...g, status } : g)));
    await supabase.from("gifts").update({ status }).eq("id", id);
  }, []);

  const removeGift = useCallback(async (id) => {
    setGifts((gs) => gs.filter((g) => g.id !== id));
    await supabase.from("gifts").delete().eq("id", id);
  }, []);

  return { gifts, loading, addGift, setGiftStatus, removeGift };
}
