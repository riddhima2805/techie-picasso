

require("dotenv").config();
const { Pool } = require("pg");

let pool;

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL not set — using in-memory fallback");
}

try {
if (!process.env.DATABASE_URL) throw new Error("no db url");

pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on("error", (err) => {
console.error(" sorry , Postgres client error", err);
});

module.exports = pool;

} catch (e) {
console.warn("[db] db not working so using local storage", e && e.message);

const state = { users: [], rooms: [], room_doodlers: [] };
let nextId = 1;

// just finds user by email 
function findartist(email) {
  return state.users.find((u) => u.email === email.toLowerCase());
}

async function query(sql, params = []) {

    const s = sql.trim().toUpperCase();

    // these do nothing just return empty
    if (s === "BEGIN" || s === "COMMIT" || s === "ROLLBACK") return { rows: [] };

    
    if (s.startsWith("INSERT INTO USERS")) {
      const [username, email, password] = params;

     
      if (state.users.some((u) => u.email === email.toLowerCase() || u.username === username)) {
        const err = new Error("duplicate key");
        err.code = "23505";
        throw err;
      }

      const user = { id: String(nextId++), username, email: email.toLowerCase(), password };
      state.users.push(user);
      return { rows: [{ id: user.id, username: user.username, email: user.email }] };
    }

    if (s.startsWith("SELECT * FROM USERS WHERE EMAIL")) {
    const [email] = params;
    const u = findartist(email);
    if (!u) return { rows: [] };
    return { rows: [u] };
    }

    // someone making a room
    if (s.startsWith("INSERT INTO ROOMS")) {
    const [name, adminId] = params;
    const room = {
      id: String(nextId++),
      name,
      owner_id: adminId,
      doodlerid: adminId, // kept for the frontend response shape
      member_count: 1,
      is_closed: false,
      inactive: false,
      created_at: new Date().toISOString(),
      canvas_state: null,
    };
    state.rooms.push(room);
    return { rows: [room] };
    }

    if (s.startsWith("INSERT INTO ROOM_doodlers")) {
    const [roomId, userId] = params;
    
    if (!state.room_doodlers.find((m) => m.roomkey === roomId && m.user_id === userId)) {
      state.room_doodlers.push({ roomkey: roomId,
         user_id: userId });
    }
    return { rows: [] };
    }

  
    if (s.startsWith("SELECT R.ID, R.NAME")) {
    const rows = state.rooms
      .filter((r) => !r.inactive)
      .map((r) => ({
        id: r.id,
        name: r.name,
        doodlerid: r.owner_id || r.doodlerid,
        member_count: r.member_count,
        created_at: r.created_at,
        admin_name: (state.users.find((u) => u.id === (r.owner_id || r.doodlerid)) || {}).username,
        owner_name: (state.users.find((u) => u.id === (r.owner_id || r.doodlerid)) || {}).username,
        // yes admin_name and owner_name are the same thing 
      }));
    return { rows };
    }

    if (s.startsWith("SELECT ID FROM ROOMS WHERE IS_CLOSED") || s.startsWith("SELECT ID FROM ROOMS WHERE INACTIVE")) {
    const max = params[0];
    const candidates = state.rooms.filter((r) => !r.inactive && !r.is_closed && r.member_count < max);
    if (candidates.length) 
      return { rows: [{ id: candidates[0].id }] };
    return { rows: [] };
    }

    if (s.startsWith("SELECT R.*, U.USERNAME")) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (!r) return { rows: [] };
    const admin = state.users.find((u) => u.id === (r.owner_id || r.doodlerid)) || {};
    return { rows: [{ ...r, doodlerid: r.owner_id || r.doodlerid, admin_name: admin.username }] };
    }

    if (s.startsWith("SELECT * FROM ROOMS WHERE ID =")) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (!r) 
      return { rows: [] };
    return { rows: [r] };
    }

    if (s.startsWith("SELECT CANVAS_STATE FROM ROOMS WHERE ID =")) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (!r) 
      return { rows: [] };
    return { rows: [
      { canvas_state: r.canvas_state }] 
  };
    }

    if (s.startsWith("UPDATE ROOMS SET CANVAS_STATE")) {
    const [canvasState, roomId] = params;
    const r = state.rooms.find((x) => x.id === roomId);
    if (r) r.canvas_state = typeof canvasState === "string" ? JSON.parse(canvasState) : canvasState;
    return { rows: [] };
    }

    if (s.startsWith("UPDATE ROOMS SET MEMBER_COUNT")) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (r) {
      if (s.includes("LEAST")) r.member_count = Math.min((r.member_count || 0) + 1, params[1] || 4);
      else if (s.includes("GREATEST")) r.member_count = Math.max((r.member_count || 0) - 1, 0);
      else r.member_count = state.room_doodlers.filter((m) => m.roomkey === roomId).length;
    }
    return { rows: [] };
    }

    if (s.startsWith("DELETE FROM ROOM_doodlers")) {
    const [roomId, userId] = params;
    state.room_doodlers = state.room_doodlers.filter(
      (m) => !(m.roomkey === roomId && m.user_id === userId)
    );
    return { rows: [] };
    }

    // closing or deactivating room, both do basically same thing
    if (s.startsWith("UPDATE ROOMS SET INACTIVE") || s.startsWith("UPDATE ROOMS SET IS_CLOSED")) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (r) {
      r.inactive = true;
      r.is_closed = true;
    }
    return { rows: [] };
    }

    if (
      s.startsWith("SELECT OWNER_ID AS DOODLERID FROM ROOMS") ||
      s.startsWith("SELECT DOODLERID FROM ROOMS") ||
      s.startsWith("SELECT DOODLERID AS DOODLERID FROM ROOMS")
    ) {
    const roomId = params[0];
    const r = state.rooms.find((x) => x.id === roomId);
    if (!r) return { rows: [] };
    return { rows: [{ doodlerid: r.owner_id || r.doodlerid }] };
    }

    return { rows: [] };
  }

  module.exports = { query };
}
