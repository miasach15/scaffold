import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { BORDER, INK, LIST_COLOR, MUTED, serifFont } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";

export default function ListCard({ list, onRename, onRemove, onAddItem, onSetItemDone, onRemoveItem, onRenameItem }) {
  const [itemText, setItemText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemDraft, setItemDraft] = useState("");
  // New, empty lists start expanded so it's obvious where to add the first item;
  // lists that already have content start collapsed to keep the page short.
  const [expanded, setExpanded] = useState(list.items.length === 0);

  const done = list.items.filter((i) => i.done).length;
  const total = list.items.length;

  const addItem = () => {
    if (!itemText.trim()) return;
    onAddItem(itemText.trim());
    setItemText("");
  };

  const startEditTitle = () => {
    setTitleDraft(list.title);
    setEditingTitle(true);
  };
  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== list.title) onRename(titleDraft);
    setEditingTitle(false);
  };

  const startEditItem = (i) => {
    setItemDraft(i.text);
    setEditingItemId(i.id);
  };
  const saveItem = (i) => {
    if (itemDraft.trim() && itemDraft.trim() !== i.text) onRenameItem(i.id, itemDraft);
    setEditingItemId(null);
  };

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            style={{ ...inputStyle, fontFamily: serifFont, fontSize: 20, fontWeight: 400, padding: "4px 8px", flex: 1, minWidth: 0 }}
          />
        ) : (
          <div onClick={startEditTitle} title="Click to rename" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, cursor: "text" }}>
            <div style={{ fontFamily: serifFont, fontSize: 20, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.title}</div>
            <Pencil size={12} strokeWidth={2.3} color={MUTED} style={{ flexShrink: 0 }} />
          </div>
        )}
        {total > 0 && <div style={{ fontSize: 11.5, fontWeight: 700, color: LIST_COLOR.text, whiteSpace: "nowrap", flexShrink: 0 }}>{done}/{total}</div>}
        <button onClick={() => setExpanded((x) => !x)} title={expanded ? "Collapse" : "Expand"} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={15} strokeWidth={2.3} /> : <ChevronRight size={15} strokeWidth={2.3} />}
        </button>
        <button onClick={onRemove} style={{ ...deleteBtn, flexShrink: 0 }}>×</button>
      </div>

      {expanded && (
        <div style={{ padding: "0 18px 16px" }}>
          {list.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {list.items.map((i) => (
                <div key={i.id} className="list-item-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Checkbox checked={i.done} onClick={() => onSetItemDone(i.id, !i.done)} color={LIST_COLOR} />
                  {editingItemId === i.id ? (
                    <input
                      autoFocus
                      value={itemDraft}
                      onChange={(e) => setItemDraft(e.target.value)}
                      onBlur={() => saveItem(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveItem(i);
                        if (e.key === "Escape") setEditingItemId(null);
                      }}
                      style={{ ...inputStyle, flex: 1, minWidth: 0, fontSize: 13.5, padding: "4px 7px" }}
                    />
                  ) : (
                    <div
                      onClick={() => startEditItem(i)}
                      title="Click to edit"
                      style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: i.done ? MUTED : INK, textDecoration: i.done ? "line-through" : "none", opacity: i.done ? 0.7 : 1, cursor: "text", overflowWrap: "break-word" }}
                    >
                      {i.text}
                    </div>
                  )}
                  <button onClick={() => onRemoveItem(i.id)} className="list-item-delete" style={{ ...deleteBtn, flexShrink: 0, opacity: 0, transition: "opacity .15s" }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input
              placeholder="Add an item..."
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              style={{ ...inputStyle, flex: 1, fontSize: 13 }}
            />
            <button onClick={addItem} style={{ ...ghostBtn, fontSize: 13 }}>Add</button>
          </div>
        </div>
      )}
      <style>{`.list-item-row:hover .list-item-delete { opacity: 1 !important; }`}</style>
    </div>
  );
}
