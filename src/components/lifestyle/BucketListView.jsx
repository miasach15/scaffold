import { useState } from "react";
import { Rocket } from "lucide-react";
import { LIFESTYLE_COLORS } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, ProgressBar, SectionHeader } from "../shared/Misc";
import Checkbox from "../shared/Checkbox";
import { useBucketList } from "../../hooks/useBucketList";

export default function BucketListView({ userId }) {
  const { items, addItem, setDone, removeItem } = useBucketList(userId);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const col = LIFESTYLE_COLORS.bucket;

  const add = () => {
    if (!title.trim()) return;
    addItem(title, category);
    setTitle(""); setCategory("");
  };

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div>
      <SectionHeader title="Bucket List" subtitle="Dreams and adventures, big and small." Icon={Rocket} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Something you want to do someday..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, width: 160 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

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
            <div key={it.id} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: it.done ? "#fff" : col.bg, border: `1px solid ${it.done ? "#F1EEE9" : col.border}` }}>
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
