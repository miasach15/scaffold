import { useState } from "react";
import { Rocket } from "lucide-react";
import { LIFESTYLE_COLORS, SUGGESTED_BUCKET_LIST } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { EmptyState, ProgressBar, SectionHeader } from "../shared/Misc";
import Checkbox from "../shared/Checkbox";
import { useBucketList } from "../../hooks/useBucketList";

export default function BucketListView({ userId }) {
  const { items, addItem, setDone, removeItem } = useBucketList(userId);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const col = LIFESTYLE_COLORS.bucket;

  const add = (t) => {
    const tt = (t !== undefined ? t : title).trim();
    if (!tt) return;
    addItem(tt, t !== undefined ? "" : category);
    if (t === undefined) { setTitle(""); setCategory(""); }
  };

  const addedTitles = new Set(items.map((i) => i.title.toLowerCase()));
  const available = SUGGESTED_BUCKET_LIST.filter((s) => !addedTitles.has(s.toLowerCase()));

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div>
      <SectionHeader title="Bucket List" subtitle="Dreams and adventures, big and small." Icon={Rocket} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Something you want to do someday..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 160 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={() => add()} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      {available.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11.5, color: "#9CA3AF", alignSelf: "center", marginRight: 2 }}>Suggested:</span>
          {available.map((s) => (
            <button key={s} onClick={() => add(s)} style={suggestionChip}>+ {s}</button>
          ))}
        </div>
      )}

      {total > 0 && (
        <div style={{ marginBottom: 18, maxWidth: 320 }}>
          <ProgressBar done={done} total={total} color={col} />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState text="Nothing on your list yet. What do you want to do before you die?" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => (
            <div key={it.id} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: it.done ? "#fff" : col.bg, border: `1px solid ${it.done ? "#EDEDED" : col.border}` }}>
              <Checkbox checked={it.done} onClick={() => setDone(it.id, !it.done)} color={col} />
              <div style={{ flex: 1, fontSize: 14, textDecoration: it.done ? "line-through" : "none", opacity: it.done ? 0.55 : 1 }}>
                {it.done ? "🎉 " : ""}{it.title}
              </div>
              {it.category && (
                <div style={{ fontSize: 10.5, color: col.text, background: col.bg, border: `1px solid ${col.border}`, padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>{it.category}</div>
              )}
              <button onClick={() => removeItem(it.id)} className="btn-delete" style={deleteBtn}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
