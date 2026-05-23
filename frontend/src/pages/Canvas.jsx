
import React, { useState, useEffect, 
  useCallback, useRef } from "react";
import { useParams, useNavigate } 
from "react-router-dom";

 import { useAuth } from "../App";
  import { getRoom }  from "../lib/api";
import { useCanvas } 
from "../hooks/useCanvas";
 import { useRoom }   from "../hooks/useRoom";
import UserList  
from "../components/UserList";
import SaveModal 
from "../components/SaveModal";
import Colourpalette 
from "../components/Colourpalette";

export default function Canvas() {
  const { id: roomId } = useParams();
  const { user, token } = useAuth();
  const navigate        = useNavigate();

  const [Colour,      setColour]      = useState("#ffffff");
  const [brushcaliber,  setbrushcaliber]  = useState(4);
  const [roomInfo,   keesproominfo]   = useState(null);
  const [showSave,   keepit]   = useState(false);
  const [kicked,     setKicked]     = useState(false);

  
  const lastCursorSent = useRef(0);

  useEffect(() => {
    getRoom(roomId).then(({ room }) => keesproominfo(room)).catch(console.error);
  }, [roomId]);

  const { containerRef, ready, connected, exportImage, clearCanvas } = useCanvas({
    roomId, token, currentUser: 
    user, Colour, brushcaliber,
  }
);

  const { doodlers, adminId, cursors, cursorPing, kick, roomcloser } = useRoom(
    {
    roomId,
    currentUser: user,
    token,
    onKicked: () => setKicked(true),
    onRoomClosed: () => keepit(true),
  });

  const isadmin = roomInfo?.doodlerid === user?.id;

  
  const tracecursor = useCallback((e) => {
    const now = Date.now();
    if (now - lastCursorSent.current < 33) 
      return;  
    lastCursorSent.current = now;
    cursorPing(e.clientX, e.clientY);
  }, [cursorPing]);

  
  const closecanvas = useCallback(async () => {
    if (!window.confirm("You really want to close the room for everyone?")) 
      return;
    keepit(true);   
    await roomcloser();
  }
  , [roomcloser]);


  if (kicked) {
    return (
      <div style={styles.centred}>
        <div className="card" style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 40, 
            marginBottom: 12 }}>🚫</div>
          <h2 style={{ fontFamily: "var(--font-head)", 
            marginBottom: 8 }}>You were fired🔥</h2>
          <p style={{ Colour: "var(--text2)", 
            fontSize: 15, 
            marginBottom: 20 }}>SORRY but the room admin kicked you out from this session.😔</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>Back to lobby🔙</button>
        </div>
      </div>
    );
  }

  return (
    <div 
    style={styles.root} onMouseMove={tracecursor}>
  
      <div style={styles.topBar}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>← Lobby</button>
        <span style={styles.roomName}>{roomInfo?.name || "…"}</span>
        <div style={styles.topRight}>
          {isadmin && (
            <button className="btn btn-danger btn-sm" onClick={closecanvas}>
              Close room
            </button>
          )}
        </div>
      </div>

  
      <div style={styles.canvas} title="Drag to pan nd Scroll to zoom🔍">
        <div ref={containerRef} style={styles.stage} />

        {/* react puts a ui layer above konva canvaas*/}
        {!ready && (
          <div style={{ ...styles.loading, zIndex: 20 }}>
            <span style={{ fontSize: 14, Colour: "var(--text2)" }}>Connecting…🌀</span>
          </div>
        )}

        {Object.entries(cursors).map(([uid, c]) => (
          <div key={uid} style={{ ...styles.cursor, left: c.x, top: c.y }}>
            <svg 
            width="14" height="14" viewBox="0 0 14 14" style={{ display: "block" }}>
              <path d="M2 2L12 7L7 8L5 13Z" fill="var(--accent)" stroke="white" strokeWidth="1"/>
            </svg>
            <span 
            style={styles.cursorLabel}>{c.username}</span>
          </div>
        )
      )}
      </div>

      <Colourpalette
        Colour={Colour}        strokeColour={setColour}
        brushcaliber={brushcaliber} setbrushcaliber={setbrushcaliber}
        onExport={exportImage}
        onClear={clearCanvas}
        isadmin={isadmin}
        connected={connected}
      />

      <div style={styles.userListWrapper}>
        <UserList
          doodlers={doodlers}
          currentUserId={user?.id}
          adminId={adminId || roomInfo?.doodlerid}
          onKick={kick}
        />
      </div>

      {showSave && (
        <SaveModal
          onSave={
            () => { exportImage(); keepit(false); navigate("/"); }
        }
          onDismiss={
            () => { keepit(false); navigate("/"); }
        }
        />
      )}
    </div>
  );
}

const styles = {
  root:     { width: "100vw", 
    height: "100vh", 
    position: "relative",
     overflow: "hidden", 
     background: "#111215", display: "flex", 
     flexDirection: "column" },
  topBar:   { height: 48, 
    background: "var(--bg2)", 
    borderBottom: "1px solid var(--border)", 
    display: "flex", 
    alignItems: "center", 
    gap: 12, 
    padding: "0 16px", flexShrink: 0, zIndex: 10 },
  roomName: { fontFamily: "var(--font-head)", 
    fontSize: 16, fontWeight: 600, flex: 1, textAlign: "center" },
  topRight: { display: "flex", gap: 8 },
  canvas:   { flex: 1, position: "relative", cursor: "crosshair" },
  stage:    { position: "absolute", inset: 0 },
  loading:  { position: "absolute", inset: 0, 
    display: "flex",
     alignItems: "center", justifyContent: "center" },
  userListWrapper: { position: "absolute", top: 64, 
    right: 16, zIndex: 10 },
  cursor:   { position: "absolute", pointerEvents: "none", 
    zIndex: 20, transform: "translate(-2px,-2px)" },
  cursorLabel: { display: "inline-block", marginLeft: 5, fontSize: 10,
     background: "var(--accent)", Colour: "#fff", padding: "1px 6px", 
     borderRadius: 99, 
     whiteSpace: "nowrap" },
  centred:  { minHeight: "100vh",
     display: "flex", 
     alignItems: "center",
      justifyContent: "center", background: "var(--bg)" },
};
