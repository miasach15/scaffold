import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid } from "../lib/id";
import { reportSaveError } from "../lib/saveErrors";

const BUCKET = "vision-board";

const fromRow = (row) => ({
  id: row.id,
  storagePath: row.storage_path,
  caption: row.caption || "",
  orderIndex: row.order_index ?? 0,
  url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
});

// A handful of pinned photos for whatever you're actually working toward — see
// migration_vision_board.sql for the storage bucket + table + RLS this needs.
export function useVisionBoard(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("vision_board_items").select("*").eq("user_id", userId).order("order_index");
    setItems((data || []).map(fromRow));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Uploads the file into this user's own folder in the bucket (so the storage RLS
  // policies, which key off that first path segment, actually let it through), then
  // records it as a row — the row is what drives the UI; the storage object is just
  // where the bytes live.
  const addItem = useCallback(
    async (file, caption = "") => {
      if (!userId || !file) return;
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const path = `${userId}/${uid()}${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadError) {
        reportSaveError();
        return;
      }
      const row = { id: uid(), user_id: userId, storage_path: path, caption: caption.trim() || null, order_index: items.length };
      setItems((its) => [...its, fromRow(row)]);
      const { error } = await supabase.from("vision_board_items").insert(row);
      if (error) reportSaveError();
    },
    [userId, items.length]
  );

  const renameItem = useCallback(async (id, caption) => {
    setItems((its) => its.map((it) => (it.id === id ? { ...it, caption } : it)));
    const { error } = await supabase.from("vision_board_items").update({ caption: caption.trim() || null }).eq("id", id);
    if (error) reportSaveError();
  }, []);

  const removeItem = useCallback(
    async (id) => {
      const item = items.find((it) => it.id === id);
      setItems((its) => its.filter((it) => it.id !== id));
      const { error } = await supabase.from("vision_board_items").delete().eq("id", id);
      if (error) reportSaveError();
      if (item) await supabase.storage.from(BUCKET).remove([item.storagePath]); // best-effort — the row is already gone either way
    },
    [items]
  );

  return { items, loading, addItem, renameItem, removeItem };
}
