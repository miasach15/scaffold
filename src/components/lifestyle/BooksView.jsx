import { useState } from "react";
import { BookMarked } from "lucide-react";
import { LIFESTYLE_COLORS } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, SectionHeader, SubHeader } from "../shared/Misc";
import StarRating from "../shared/StarRating";
import { useBooks } from "../../hooks/useBooks";

const STATUSES = ["Want to read", "Reading", "Read"];

export default function BooksView({ userId }) {
  const { books, loading, addBook, setStatus, setRating, removeBook } = useBooks(userId);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const col = LIFESTYLE_COLORS.books;

  const add = () => {
    if (!title.trim()) return;
    addBook(title, author);
    setTitle(""); setAuthor("");
  };

  const read = books.filter((b) => b.status === "Read");

  return (
    <div>
      <SectionHeader title="Books" subtitle="What to read next." Icon={BookMarked} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Book title..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} style={{ ...inputStyle, width: 180 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      {!loading && read.length > 0 && (
        <div style={{ fontSize: 12.5, color: col.text, fontWeight: 700, marginBottom: 14, background: col.bg, display: "inline-block", padding: "5px 12px", borderRadius: 999 }}>
          📚 {read.length} book{read.length === 1 ? "" : "s"} read
        </div>
      )}

      {STATUSES.map((status) => {
        const group = books.filter((b) => b.status === status);
        return (
          <div key={status} style={{ marginBottom: 20 }}>
            <SubHeader>{status}</SubHeader>
            {group.length === 0 ? (
              <EmptyState text={status === "Want to read" ? "No books queued up yet." : `Nothing in "${status}" yet.`} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.map((b) => (
                  <BookRow key={b.id} book={b} col={col} onSetStatus={(s) => setStatus(b.id, s)} onRate={(r) => setRating(b.id, r)} onRemove={() => removeBook(b.id)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookRow({ book, col, onSetStatus, onRate, onRemove }) {
  const nextStatus = { "Want to read": "Reading", "Reading": "Read", "Read": "Want to read" }[book.status];
  const nextLabel = { "Want to read": "Start reading", "Reading": "Finished", "Read": "Read again" }[book.status];
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: book.status === "Read" ? "#fff" : col.bg, border: `1px solid ${book.status === "Read" ? "#EDEDED" : col.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{book.title}</div>
        {book.author && <div style={{ fontSize: 11.5, color: "#93A0AD" }}>{book.author}</div>}
      </div>
      {book.status === "Read" && <StarRating value={book.rating} onChange={onRate} color={col} />}
      <button onClick={() => onSetStatus(nextStatus)} style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, border: `1px solid ${col.border}`, background: "#fff", color: col.text, whiteSpace: "nowrap" }}>{nextLabel}</button>
      <button onClick={onRemove} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
