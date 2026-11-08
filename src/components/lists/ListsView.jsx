import { useState } from "react";
import { inputStyle, primaryBtn } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import ListCard from "./ListCard";

export default function ListsView({ lists, onAddList, onRemoveList, onRenameList, onAddItem, onSetItemDone, onRemoveItem, onRenameItem }) {
  const [title, setTitle] = useState("");

  const addList = () => {
    if (!title.trim()) return;
    onAddList(title.trim());
    setTitle("");
  };

  return (
    <div>
      <SectionHeader title="Lists" subtitle="Movies to watch, restaurants to try, whatever else is worth keeping track of." />

      <AddRow>
        <input
          placeholder="Name a new list (e.g. Movies to watch)..."
          aria-label="New list"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addList()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={addList} className="btn-primary" style={primaryBtn}>Add</button>
      </AddRow>

      {lists.length === 0 ? (
        <EmptyState text="No lists yet. Name one above - movies, restaurants, books, whatever you want to keep track of." icon="notes-book" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {lists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              onRename={(t) => onRenameList(l.id, t)}
              onRemove={() => onRemoveList(l.id)}
              onAddItem={(t) => onAddItem(l.id, t)}
              onSetItemDone={(itemId, done) => onSetItemDone(l.id, itemId, done)}
              onRemoveItem={(itemId) => onRemoveItem(l.id, itemId)}
              onRenameItem={(itemId, t) => onRenameItem(l.id, itemId, t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
