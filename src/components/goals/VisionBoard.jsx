import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { BORDER, MUTED, SURFACE } from "../../lib/constants";
import { deleteBtn, inputStyle } from "../../lib/styles";

const TILE = 92;

// A handful of pinned photos for whatever you're actually working toward — purely
// visual, nothing here feeds any other part of the app. Captions are optional; click
// one to rename it.
export default function VisionBoard({ items, onAddPhoto, onRename, onRemove }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [captionDraft, setCaptionDraft] = useState("");

  const pickFile = () => fileInputRef.current?.click();
  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the same file again re-trigger onChange
    if (!file) return;
    setUploading(true);
    const defaultCaption = file.name.replace(/\.[^.]+$/, "");
    await onAddPhoto(file, defaultCaption);
    setUploading(false);
  };

  const startRename = (item) => {
    setEditingId(item.id);
    setCaptionDraft(item.caption);
  };
  const commitRename = () => {
    if (editingId) onRename(editingId, captionDraft);
    setEditingId(null);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Vision board</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {items.map((item) => (
          <div key={item.id} style={{ flexShrink: 0, width: TILE }}>
            <div style={{ position: "relative", width: TILE, height: TILE, borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              <img src={item.url} alt={item.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button
                onClick={() => onRemove(item.id)}
                title="Remove"
                style={{ ...deleteBtn, position: "absolute", top: 2, right: 2, background: "rgba(255,255,255,0.85)", borderRadius: 8, padding: "2px 6px", fontSize: 13 }}
              >
                ×
              </button>
            </div>
            {editingId === item.id ? (
              <input
                autoFocus
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
                style={{ ...inputStyle, width: "100%", marginTop: 6, fontSize: 11.5, padding: "3px 6px" }}
              />
            ) : (
              <button
                onClick={() => startRename(item)}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", marginTop: 6, padding: 0, fontSize: 11.5, fontWeight: 600, color: "#4A5568", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {item.caption || "Untitled"}
              </button>
            )}
          </div>
        ))}

        <button
          onClick={pickFile}
          disabled={uploading}
          className="hoverable"
          style={{
            flexShrink: 0, width: TILE, height: TILE, borderRadius: 12, border: `1.5px dashed ${BORDER}`, background: SURFACE,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            cursor: uploading ? "default" : "pointer", color: MUTED, fontSize: 10.5, fontWeight: 600, opacity: uploading ? 0.6 : 1,
          }}
        >
          <Plus size={16} strokeWidth={2.3} />
          {uploading ? "Uploading…" : "Add photo"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChosen} style={{ display: "none" }} />
      </div>
    </div>
  );
}
