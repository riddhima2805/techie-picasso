
import React from "react";

export default function SaveModal({ onSave, onDismiss }) {
  return (
    <div style={styles.overlay}>
      <div 
      className="card" 
      style={styles.modal}>
        <div 
        style={styles.icon}>⚠️
        </div>
        <h2 style={styles.title}>
          Room is closing

        </h2>
        <p style={styles.body}>
          The admin of the room has ended the doddle time.
           Save your canvas if u want.
        </p>
        <div style={styles.actions}>
          <button 
          className="btn btn-primary" onClick={onSave}>
            💾 Save as PNG
          </button>
          <button className="btn btn-secondary" onClick={onDismiss}>
            Leave without saving
          </button></div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", 
    inset: 0, 
    background: "rgba(13, 215, 151, 0.7)",
    display: "flex", alignItems: "right", 
  
    zIndex: 100, 
    backdropFilter: "blur(4px)",
  },
  modal:   { maxWidth: 300, width: "90%", textAlign: "center" },
  icon:    { fontSize: 30,
             marginBottom: 10 },
  title:   { fontFamily: "var(--font-head)", 
            fontSize: 20, 
            fontWeight: 500, },
  body:    { Colour: "var(--text2)", 
         fontSize: 10, marginBottom: 20 },
  actions: { display: "flex", flexDirection: "column", gap: 10 },
};