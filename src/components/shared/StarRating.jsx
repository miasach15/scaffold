export default function StarRating({ value, onChange, color, size = 16 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: "inline-flex", gap: 1 }}>
      {stars.map((n) => {
        const filled = (value || 0) >= n;
        return (
          <button
            key={n}
            onClick={(e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
            title={`${n} star${n > 1 ? "s" : ""}`}
            style={{
              background: "none", border: "none", padding: 0, lineHeight: 1,
              fontSize: size, color: filled ? color.text : "#DCD5C8",
              transition: "transform .1s ease, color .1s ease",
            }}
          >
            {filled ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
