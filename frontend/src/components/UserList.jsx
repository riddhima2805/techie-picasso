
import React from "react";

export default function UserList({
   doodlers, currentUserId, adminId, onKick 
  }
) {
  return (
    <div 
    style={styles.panel}>
      <div 
      style={styles.heading}>Participants
       <span 
      className="badge">{doodlers.length}/4
      </span>
      </div>
      <ul style={styles.list}>
        {doodlers.map((m) => (
          <li key={m.userId} style={styles.item}>
            <div
             style={styles.avatar}>{m.username[0].toUpperCase()}
        </div>
            <span 
            style={styles.name}>{m.username}
        </span>
            {m.userId === adminId && <span 
            className="badge badge-purple" style={{ fontSize: 11 }}>admin
        </span>
        }
            {m.userId === currentUserId && <span style={styles.you}>(you)</span>}
            {/* owner can kick everyone else out */}
            {currentUserId === adminId && m.userId !== currentUserId && (
            <button
                className="btn btn-danger btn-sm"
                style={{ marginLeft: "auto", 
                  padding: "2px 8px", fontSize: 12 }
                }
                onClick={
                  () => onKick(m.userId)
                }
                title={`Kick ${m.username}`}
              >
                ✕
          </button>
            ) 
             }

          </li>
        )
  )}
      </ul>
    
</div>
  );
}

const styles = {
  panel:   { background: "var(--bg2)",
     border: "1px solid var(--border)",  padding: "14px 16px", 
     minWidth: 180 },
  heading: { fontFamily: "var(--font-head)", 
    fontSize: 15, fontWeight: 600, 
    Colour: "var(--text2)", 
    textTransform: "uppercase", letterSpacing: "0.06em", 
    marginBottom: 10, display: "flex", alignItems: "left", gap: 8 },
  list:    { listStyle: "none", 
    display: "flex", 
    flexDirection: "column",
     gap: 8 },
  item:    { display: "flex",
     alignItems: "center", gap: 8,
      fontSize: 15 },
  avatar:  { width: 50, height: 25,
     borderRadius: "50%", 
     background: "var(--accent)", Colour: "#073f1cff",
      display: "flex", alignItems: "center", 
      justifyContent: "center", fontSize: 12, 
      fontWeight: 600, flexShrink: 0 },
  name:    { fontWeight: 500, flex: 1,
     whiteSpace: "nowrap", overflow: "hidden", 
     textOverflow: "ellipsis" },
  you:     { fontSize: 15, 
    Colour: "var(--text2)", 
    flexShrink: 0 },
};