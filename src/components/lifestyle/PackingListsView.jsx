import { useState } from "react";
import { Luggage } from "lucide-react";
import { LIFESTYLE_COLORS, cardStyle } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, ProgressBar, SectionHeader } from "../shared/Misc";
import Checkbox from "../shared/Checkbox";
import { usePackingLists } from "../../hooks/usePackingLists";

export default function PackingListsView({ userId }) {
  const { lists, addList, removeList, addItem, setItemPacked, removeItem } = usePackingLists(userId);
  const [title, setTitle] = useState("");
  const col = LIFESTYLE_COLORS.packing;

  const add = () => {
    if (!title.trim()) return;
    addList(title);
    setTitle("");
  };

  return (
    <div>
      <SectionHeader title="Packing Lists" subtitle="Never forget your charger again." Icon={Luggage} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input placeholder={'New list, e.g. "Tokyo trip"...'} value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>New list</button>
      </div>
      <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: -10, marginBottom: 18 }}>New lists start pre-filled with a full travel checklist — just delete what you don't need.</div>

      {lists.length === 0 ? (
        <EmptyState text="No packing lists yet. Start one above for your next trip." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {lists.map((l) => (
            <PackingListCard key={l.id} list={l} col={col} onRemoveList={() => removeList(l.id)} onAddItem={(t) => addItem(l.id, t)} onSetItemPacked={(iid, packed) => setItemPacked(l.id, iid, packed)} onRemoveItem={(iid) => removeItem(l.id, iid)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackingListCard({ list, col, onRemoveList, onAddItem, onSetItemPacked, onRemoveItem }) {
  const [itemTitle, setItemTitle] = useState("");
  const packed = list.items.filter((i) => i.packed).length;
  const total = list.items.length;
  const allPacked = total > 0 && packed === total;

  const add = () => {
    if (!itemTitle.trim()) return;
    onAddItem(itemTitle);
    setItemTitle("");
  };

  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{allPacked ? "🧳 " : ""}{list.title}</div>
        <button onClick={onRemoveList} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      {total > 0 && (
        <div style={{ marginBottom: 10 }}>
          <ProgressBar done={packed} total={total} color={col} />
        </div>
      )}
      {list.items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
          {list.items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Checkbox checked={it.packed} onClick={() => onSetItemPacked(it.id, !it.packed)} color={col} />
              <div style={{ flex: 1, fontSize: 13.5, textDecoration: it.packed ? "line-through" : "none", opacity: it.packed ? 0.5 : 1 }}>{it.title}</div>
              <button onClick={() => onRemoveItem(it.id)} className="btn-delete" style={deleteBtn}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="Add an item..." value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "6px 8px" }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px" }}>Add</button>
      </div>
    </div>
  );
}
