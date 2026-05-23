
import React from "react";

const Colours = [
  "#ffffff", "#f70909ff", "#fb923c", "#facc15",
  "#4ade80", "#e30db1ff", "#a78bfa", "#f472b6",
  "#000000","#1049e7ff","#76db10ff","#143d2eff"
];

export default function Colourpalette({ Colour, strokeColour, brushcaliber, setbrushcaliber, onExport, onClear, isadmin, connected }) {
  return (
    <div style={styles.bar}>
      
      <div style={styles.statusDot(connected)} title={connected ? "Connected" : "Reconnecting…"} />

      <div style={styles.divider} />

    
      <div style={styles.swatches}>
        {Colours.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => strokeColour(c)}
            style={{
              ...styles.swatch,
              background: c,
              boxShadow: Colour === c ? `0 0 0 2px var(--bg2), 0 0 0 4px ${c}` : "none",
              border: c === "#ffffff" ? "1px solid rgba(255,255,255,.2)" : "none",
            }}
          />)
        )}
         </div>

      <div style={styles.divider} 
      />

    
      <div style={styles.sizeRow}>
        <span 
        style={styles.label}>Size
</span>
        <input
          type="range" min={1} max={40} value={brushcaliber}
          onChange={(e) => setbrushcaliber(Number(e.target.value))}
          style={styles.range}
        />
        <span style={{ ...styles.label, minWidth: 24 }}>{brushcaliber}</span>
      </div>

      <div style={styles.divider} />

      <button className="btn btn-secondary btn-sm" onClick={onExport} title="Save as PNG">
        💾 Save
      </button>

      <button className="btn btn-danger btn-sm" onClick={onClear} title="Clear canvas">
        🎨 new board
      </button>
    </div>
  );
}

const styles = {
  bar: {
    position: "absolute", 
    bottom: 24, left: "50%",
     transform: "translateX(-50%)",
    display: "flex", 
    alignItems: "center", 
     gap: 12,
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
     padding: "10px 12px",
    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
    zIndex: 50,
    userSelect: "none",
  },
   statusDot: (connected) => ({
     width: 20, height: 8, borderRadius: "100%",
    background: connected ? "#010201ff" : "#fbbf24",
     flexShrink: 0,}
   ),
  divider:  { 
    height: 20, 
    width: 1,
    background: "var(--border)", 
    flexShrink: 0 },
  swatches: { display: "flex",
     gap: 5, 
     alignItems: "center" 
    },
  swatch:   { width: 20, 
    height: 20,
    borderRadius: "50%", cursor: "pointer", 
    flexShrink: 0, transition: "box-shadow .15s" },
  sizeRow:  { 
    display: "flex", alignItems: "center", gap: 8 
  },
  label:    { 
    fontSize: 12,
     color: "var(--text2)", 
     fontFamily: "var(--font-body)" },
  range:    { width: 80, 
    accentColor: "var(--accent)", 
    cursor: "pointer" },
};
