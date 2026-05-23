
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  roomcreator, listRooms, joinRoom, randomRoom 
} from "../lib/api";
import { useAuth } from "../App";

export default function Lobby() {
  const { user, signOut }  = useAuth();
  const username           = user?.username || "Doodler";
  const navigate           = useNavigate();
  const [rooms, setRooms]  = useState([]);
  const [roomName, setRoomName] = useState("");
  const [joinId, setJoinId]     = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState("");

  useEffect(() => { getboards(); }, []);

  async function getboards() {
    try { 
      const { rooms } = await listRooms(); setRooms(rooms);
     }
    catch { 
      setError("Sorry we were unable to load rooms 😭"); 

    }
  }

  async function newcanvas(e) {
    e.preventDefault(); setError(""); setLoading("create");
    try {
      const { room } = await roomcreator(roomName.trim() || `${username}'s room`);
    navigate(`/room/${room.id}`);
    } 
    catch (err) { setError(err.message); }
    finally { setLoading(""); }
  }

  async function joinboard(e) {
    e.preventDefault(); setError(""); setLoading("join");
    try {
      await joinRoom(joinId.trim());
    navigate(`/room/${joinId.trim()}`);
    } catch (err) { setError(err.message);

     }
    finally { 
      setLoading(""); 
    }
}

  async function openroom(id) {
    setError(""); setLoading(id);
    try { 
      await joinRoom(id); navigate(`/room/${id}`);
     }
    catch (err) { setError(err.message); }
    finally { setLoading(""); }
  }

  async function randomboard() {
    setError(""); setLoading("random");
    try {
      const { roomId } = await randomRoom();
      await joinRoom(roomId);
      navigate(`/room/${roomId}`);
    } 
    catch (err) { setError(err.message); 

    }
    finally { setLoading(""); }
  }

  function getRoomOwnerName(room) {
    return room.owner_name || 
    room.admin_name || 
    room.ownerName || 
    room.doodlerid || "anonymous owner 𖡄";
  }

  return (
    <div style={styles.page}>
    
      <div style={styles.header}>
        <span 
        style={styles.logo}>Doodle hub 🖌️

        </span>
        <div style={{ display: "flex", 
          alignItems: "left", 
    gap: 12 }}>
          <span style={{ Colour: "var(--text2)", 
            fontSize: 15 }}>👤 {username}
            </span>
          <button 
          className="btn btn-secondary btn-sm" 
        onClick={signOut}>Log out
          </button>
  </div>
      </div>

      <div 
      style={styles.content}>
        {error && <div style={styles.errorBox}>{error}
          </div>}
        <div style={styles.actions}>
  
          <div className="card" style={styles.actionCard}>
            <h2 style={styles.cardTitle}>New room</h2>
            <form onSubmit={newcanvas} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                className="field"
                style={styles.inlineInput}
                placeholder="Room name (optional)"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={loading === "create"}>
                {loading === "create" ? "…" : "Create"}
              </button>
            </form>
          </div>
          <div className="card" style={styles.actionCard}>
            <h2 style={styles.cardTitle}>Join by ID</h2>
            <form onSubmit={joinboard} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                className="field"
                style={styles.inlineInput}
                placeholder="Paste room ID or link 🔗"
                value={joinId}
                onChange={e => setJoinId(e.target.value.trim())}
              />
              <button className="btn btn-secondary" type="submit" disabled={!joinId || loading === "join"}>
                {loading === "join" ? "…" : "Join"}
              </button>
            </form>
          </div>

          {/*based on luck drops doodler into random active room*/}
          <div className="card" style={{ ...styles.actionCard, justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={styles.cardTitle}>Random room

            </h2>
            <p style={{ fontSize: 13, Colour: "var(--text2)" }}>
              Drops into any open room 🫟
              </p>
            <button className="btn btn-secondary" onClick={randomboard} disabled={loading === "random"} style={{ marginTop: 4 }}>
              {loading === "random" ? "Finding…" : "🎲 Random"}
  </button>
        </div>
    </div>

        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 18, marginTop: 32, marginBottom: 16 }}>Open rooms</h2>
        {rooms.length === 0 && <p style={{ Colour: "var(--text2)",
           fontSize: 15}}>No open rooms. Create one above:)</p>}

        <div style={styles.roomGrid}>
          {rooms.map((r) => (
            <div key={r.id} className="card" style={styles.roomCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div 
                  style={{ fontWeight: 600, fontFamily: "var(--font-head)", fontSize: 16 }}>{r.name}
                  </div>
                  <div 
                  style={{ Colour: "var(--text)", fontSize: 13, marginTop: 4 }}>by {getRoomOwnerName(r)}
  </div>
                </div>
                <span className={`badge ${r.member_count < 4 ? "badge-green" : ""}`}>
                  {r.member_count}/4
                </span>
              </div>
              <div
              style={{ marginTop: 4, fontSize: 12, Colour: "var(--text2)", wordBreak: "break-all" }}>
                ID: {r.id}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => openroom(r.id)}
                disabled={r.member_count >= 4 || loading === r.id}
              >
                {r.member_count >= 4 ? "Full" : loading === r.id ? "Joining…" : "Join"}
              </button>
            </div>
          )
     )
    }
      </div>
      </div>
  </div>
  );
}

const styles = {
  page:       { minHeight: "100vh", 
    background: "var(--bg)", display: "flex", 
    flexDirection: "column" },
  header:     { background: "var(--bg2)", 
    borderBottom: "1px solid var(--border)", 
    padding: "15px 30px", 
  display: "flex", 
    alignItems: "left", 
    justifyContent: "space-between",

  },
  logo:       { 
    fontFamily: "var(--font-head)", 
  fontSize: 30, fontWeight: 600, 
    Colour: "var(--accent)" },
  content:    { maxWidth: 900, width: "100%", margin: "0 auto",
     padding: "32px 20px" },
  actions:    {
     display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", 
    gap: 16 
  },
  actionCard: { 
    padding: "20px 20px" 
  },
  cardTitle:  { 
    fontFamily: "var(--font-head)", 
    borderBottom : "1px solid var(--border)",
  fontSize: 30, 
  fontWeight: 600 
  },
  inlineInput:{ flex: 1, 
    background: "var(--bg3)", 
     Colour: "var(--text)",  padding: "10px 10px", 
     border: "1px solid var(--border)",
     fontSize: 13, 
     fontFamily: "var(--font-body)",
      outline: "none" },
  errorBox:   { background: "rgba(15, 220, 39, 0.12)", 
    border: "1px solid rgba(248,113,113,.3)", 
    Colour: "var(--danger)", 
    padding: "10px 14px", borderRadius: "var(--radius)", 
    fontSize: 15, marginBottom: 15 },
  roomGrid:   { display: "grid",
     gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", 
     gap: 15 },
  roomCard:   { padding: "20px 20px" },
};
