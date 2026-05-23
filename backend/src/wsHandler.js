

const WebSocket = require("ws");
const url       = require("url"); //helps extract query params
const Y         = require("yjs");
const db        = require("./db");
const { pub, subscriber } = require("./redis");
const { socketguard }         = require("./middleware/auth");

const PERSIST_MS       = parseInt(process.env.PERSIST_INTERVAL_MS || "3000", 10);
const admin_ABSENCE_MS = 2 * 60 * 1000;

const rooms = new Map();
const adminMap = new Map();

const adminTimers = new Map();
const persistTimers = new Map();

const roomDocs = new Map();


const clientMeta = new Map();

subscriber.psubscribe("room:*", (err) => {
  if (err) 
    console.error("redis pattern subscribe error", err);
  
}
);

subscriber.on("pmessage", (_pattern, channel, message) => {
  const roomId = channel.replace("room:", "");
  const peers  = rooms.get(roomId);//runs whenever redis receives a msg .
  if (!peers) return;

  const envelope = JSON.parse(message);

  peers.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta) 
      return;
  
  
    if (ws.readyState === WebSocket.OPEN) 
      {
  
      if (envelope.type === "yjs-update") {
        const buf = Buffer.from(envelope.payload, "base64");
        if (meta.channel === "yjs" && envelope.from !== meta.connectionId) 
           ws.send(buf);
      } else {
         if (meta.channel === "control") 
          ws.send(message); // control messages pass through as text
      }
    }
  }
);
});
function attachws(httpServer) {
  const wss = new WebSocket.Server( //manual upgrade handling
    { noServer: true }
  );

  httpServer.on("upgrade", (req, socket, head) => {
  
    const parsed = url.parse(req.url, true);
    const query = parsed.query || {

    };
  const pathname = parsed.pathname || "";

    // room id may be present as query.roomId or as the last path segment
    const roomIdFromPath = pathname.split("/").filter(Boolean).pop();
    const roomId = query.roomId || (pathname.startsWith("/ws/") ? roomIdFromPath : undefined);
    const channel = query.channel === "yjs" ? "yjs" : "control";

    const token = query.token;
    const user = socketguard(token);
    if (!user) {
      socket.write
      ("Unauthorized");
      socket.destroy();return; //CLOSES
    }
    req._user = user;
    req._roomId = roomId;
req._channel = channel;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    }
  );
  });

  wss.on("connection", (ws, req) => {
    const user   = req._user;
    const roomId = req._roomId;
    const channel = req._channel;

    if (!roomId) { 
      ws.close(4000, "room Id is mandatory"); 
      return; 
    }

    
    if (!rooms.has(roomId))
       rooms.set(roomId, new Set());
    rooms.get(roomId).add(ws);
    const connectionId = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    clientMeta.set(ws, 
      { 
        userId: user.id, 
        username: user.username, 
        roomId, channel, connectionId 
  });

    console.log(`[ws] ${user.username} joined room ${roomId} (${channel})`);

    if (channel === "yjs") {
      ensureRoomDoc(roomId).then((ydoc) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(Buffer.from(Y.encodeStateAsUpdate(ydoc)));
        }
      }).catch((e) => console.error("[yjs:init]", e.message));
    }

    if (channel === "control") {
    
      syncmanage(roomId, { type: "user-joined", 
        userId: user.id, 
        username: user.username }, ws);

  
      db.query("SELECT owner_id AS doodlerid FROM rooms WHERE id = $1", 
        [roomId]).then
      (
        (
          { rows }
        ) => {
        if (!rows.length) return;
        const adminId = rows[0].doodlerid;
        adminMap.set(roomId, adminId);
        if (adminId === user.id) {
          clearTimeout(adminTimers.get(roomId));
          adminTimers.delete(roomId);
          console.log(`[room:${roomId}] admin is back.`);
        }
      });
    }

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
    
        syncupdateyjs(ws, roomId, user, data);
      } else 
        {
    
        try {
          const msg = JSON.parse(data.toString());
          ontool(ws, roomId, user, msg);
        } catch {
          console.warn("parse failed", user.username);
        }
      }
    });

    ws.on("close", () => signedout(ws, roomId, user));
    ws.on("error", (e) => console.error("[ws:error]", e.message));
  });

  console.log("[ws] WebSocket server attached");
}
function syncupdateyjs(ws, roomId, user, data) {
  const update = Buffer.from(data);
  const meta = clientMeta.get(ws);

  ensureRoomDoc(roomId).then((ydoc) => {
    Y.applyUpdate(ydoc, new Uint8Array(update), "client");
  }).catch((e) => console.error("[yjs:update]", e.message));

  
  const envelope = JSON.stringify({
    type:    "yjs-update",
    from:    meta?.connectionId,
    payload: update.toString("base64"),
  });
  pub.publish(`room:${roomId}`, envelope);

  const peers = rooms.get(roomId);
  if (peers) {
    peers.forEach((peer) => {
      const peerMeta = clientMeta.get(peer);
      if (peer !== ws && peerMeta?.channel === "yjs" && peer.readyState === WebSocket.OPEN)
         {
        peer.send(update);
      }
    }
  );
  }

  if (!persistTimers.has(roomId)) {
    persistTimers.set(
      roomId,
      setTimeout(async () => {
        persistTimers.delete(roomId);
        const ydoc = roomDocs.get(roomId);
        if (!ydoc) 
          return;
        const snapshot = Buffer.from(Y.encodeStateAsUpdate(ydoc));
        try {
        
          await db.query(
            "UPDATE rooms SET canvas_state = $1::jsonb WHERE id = $2",
            [JSON.stringify({ yjsState: snapshot.toString("base64") }), roomId]
          );
        } catch (e) {
      console.error("[persist]", e.message);
}
      }, PERSIST_MS)
  );
  }
}

function ontool(ws, roomId, user, msg) 
{
  switch (msg.type) {
    case "kick": {
     
      const adminId = adminMap.get(roomId);
      if (adminId !== user.id) return;
      const envelope = JSON.stringify(
        { type: "kicked", targetUserId: msg.targetUserId }

      );

      pub.publish(`room:${roomId}`, envelope);
      
      const peers = rooms.get(roomId);
      if (peers) {
        peers.forEach((peer) => {
          const meta = clientMeta.get(peer);
          if (meta && meta.userId === msg.targetUserId) {
            peer.send(envelope);
            peer.close(4001, "u were kicked by admin");
          }
        }
      );
      }
      break;
    }
    case "cursor": {
      
      const envelope = JSON.stringify({ type: "cursor", 
        userId: user.id, 
        username: user.username, 
        x: msg.x, y: msg.y 
      });
      pub.publish(`room:${roomId}`, envelope);
      const peers = rooms.get(roomId);
      if (peers) {
        peers.forEach((peer) => {
          if (peer !== ws && peer.readyState === WebSocket.OPEN)
             peer.send(envelope);
        });
      }
      break;
    }
    default:
      console.warn("unknown control type", msg.type);
  }
}


function signedout(ws, roomId, user) {
  const meta = clientMeta.get(ws);
  const peers = rooms.get(roomId);
  if (peers) {
    peers.delete(ws);
    if (peers.size === 0) rooms.delete(roomId);
  }
  clientMeta.delete(ws);

  console.log
  (`[ws] ${user.username} left room ${roomId}${meta?.channel ? ` (${meta.channel})` : ""}`);

  if (meta?.channel === "yjs") 
    return;

  
  syncmanage(roomId, { type: "user-left",
     userId: user.id, 
    username: user.username }
  );

  db.query(
    "UPDATE rooms SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1",
    [roomId]
  ).catch((e) => console.error("[disconnect:db]", e.message));


  const adminId = adminMap.get(roomId);
  if (adminId === user.id) {
    console.log(`[room:${roomId}] admin no longer here ${admin_ABSENCE_MS / 1000}s timer`);
    const handle = setTimeout(async () => {
      adminTimers.delete(roomId);
      console.log(`[room:${roomId}] admin absence timer fired`);

      try {
        await db.query("UPDATE rooms SET is_closed = TRUE WHERE id = $1", [roomId]);
        syncmanage(roomId, { type: "room-closed", 
          reason: "admin-absent" });
        console.log(`[room:${roomId}] Room closed (owner absent)`);
      } catch (e) {
        console.error("[adminTimer]", e.message);
      }
    }, admin_ABSENCE_MS);
    adminTimers.set(roomId, handle);}
}

async function ensureRoomDoc(roomId) {
  if (roomDocs.has(roomId)) 
    return roomDocs.get(roomId);

  const ydoc = new Y.Doc();
  roomDocs.set(roomId, ydoc);
  
  
  const { rows } = await db.query("SELECT canvas_state FROM rooms WHERE id = $1", [roomId]);
  
  const stored = rows[0]?.canvas_state?.yjsState;
  if (stored) {
    try {
      Y.applyUpdate(ydoc, new Uint8Array(Buffer.from(stored, "base64")), "db");
    } catch (e) {
      console.warn(
        `bad canvas ${roomId}: ${e.message}`
      );
 }
  }
return ydoc;
}

function syncmanage(roomId, payload, exclude = null) {
  const peers = rooms.get(roomId);
  if (!peers) 
    return;
  const msg = JSON.stringify(payload);
  peers.forEach((ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
);
}

module.exports = { attachws };
