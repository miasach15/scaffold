import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { ghostBtn, inputStyle } from "../../lib/styles";

// Rename, add, or remove categories — shown as editable pill chips in the user's own
// colors. Used in both Settings and the onboarding quiz so the same controls work
// everywhere the category set can be changed.
export default function CategoryEditor({ categoryKeys, categoryColors, onRename, onAdd, onRemove }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");

  const startEdit = (key) => {
    setEditingKey(key);
    setDraft(key);
  };
  const saveEdit = () => {
    if (draft.trim() && draft.trim() !== editingKey) onRename(editingKey, draft);
    setEditingKey(null);
  };
  const addNew = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {categoryKeys.map((key) => {
          const col = categoryColors[key] || { bg: "#F1F3F5", border: "#C9D0D8", text: "#4A5568" };
          return editingKey === key ? (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                onBlur={saveEdit}
                style={{ ...inputStyle, width: 110, fontSize: 12.5, padding: "4px 8px" }}
              />
            </div>
          ) : (
            <div
              key={key}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3, padding: "5px 6px 5px 12px", borderRadius: 999,
                border: `1.5px solid ${col.border}`, background: col.bg, color: col.text, fontSize: 12.5, fontWeight: 700,
              }}
            >
              {key}
              <button onClick={() => startEdit(key)} title="Rename" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.6, padding: 3, display: "flex" }}>
                <Pencil size={11} strokeWidth={2.3} />
              </button>
              {categoryKeys.length > 1 && (
                <button onClick={() => onRemove(key)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.6, padding: 3, display: "flex" }}>
                  <X size={12} strokeWidth={2.3} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input
          placeholder="Add a category..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNew()}
          style={{ ...inputStyle, flex: 1, fontSize: 12.5 }}
        />
        <button onClick={addNew} style={{ ...ghostBtn, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Plus size={13} strokeWidth={2.3} /> Add
        </button>
      </div>
    </div>
  );
}
