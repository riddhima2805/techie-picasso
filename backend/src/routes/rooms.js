
const express     = require("express");
const db          = require("../db");
const { gatekeep } = require("../middleware/auth");

const router = express.Router();
const MAX_CAPACITY = 4;


router.use(gatekeep);

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name)
     return res.status(400).json({ 
    error: "Room name cant be blank" });

  try {
    await db.query("BEGIN");

    const { rows } = await db.query(
      "INSERT INTO rooms (name, owner_id, member_count) VALUES ($1, $2, 1) RETURNING *, owner_id AS doodlerid",
      [name.trim(), req.user.id]
    );
    const room = rows[0];

    await db.query("COMMIT");
    return res.status(201).json({ room });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("[rooms:create]", err);
     return res.status(500).json({ error: "Server error" });
  }
});


router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.name, r.owner_id AS doodlerid, r.member_count, r.created_at,
              u.username AS admin_name,
              u.username AS owner_name
       FROM rooms r
       JOIN users u ON u.id = r.owner_id
       WHERE r.is_closed = FALSE
       ORDER BY r.created_at DESC
       LIMIT 50`
    );
    return res.json({ rooms: rows });
  } catch (err) {
    console.error("[rooms:list]", err);
    return res.status(500).json({ error: "Server error" });
  }
}
);


router.get("/random", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id FROM rooms
       WHERE is_closed = FALSE AND member_count < $1
       ORDER BY RANDOM()
       LIMIT 1`,
      [4]
    );
    if (rows.length) 
      return res.json({ roomId: rows[0].id });

    
    const { rows: newRoom } = await db.query(
      "INSERT INTO rooms (name, owner_id, member_count) VALUES ($1, $2, 1) RETURNING id",
      [`Room-${Date.now()}`, req.user.id]
    );
    return res.json({ roomId: newRoom[0].id });
  } catch (err) {
    console.error("[rooms:random]", err);
    return res.status(500).json({ error: "Server error" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, r.owner_id AS doodlerid, u.username AS admin_name FROM rooms r
       JOIN users u ON u.id = r.owner_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows.length) 
      return res.status(404).json({ error: "Room not found" });
    return res.json({ room: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
);

router.post("/:id/join", async (req, res) => {
  const { id: roomId } = req.params;
  const userId = req.user.id;

  try {
    await db.query("BEGIN");

    const { rows } = await db.query("SELECT * FROM rooms WHERE id = $1 FOR UPDATE", [roomId]);
    const room = rows[0];
    if (!room) { await db.query("ROLLBACK");
      return res.status(404).json({ error: " Sorru but cant find room." }); }
    if (room.is_closed) { await db.query("ROLLBACK");
      return res.status(403).json({ error: " SORRY ,Room is closed" }); }
    if (room.member_count >= 4) { await db.query("ROLLBACK"); 
      return res.status(403).json({ error: "Sorry , full house 🏘️" }); }

    await db.query(
      "UPDATE rooms SET member_count = LEAST(member_count + 1, $2) WHERE id = $1",
      [roomId, MAX_CAPACITY]
    );

    const { rows: updatedRows } = await db.query(
      "SELECT *, owner_id AS doodlerid FROM rooms WHERE id = $1",
      [roomId]
    );

    await db.query("COMMIT");
    return res.json({ ok: true, roomId, room: updatedRows[0] });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("[rooms:join]", err);
    return res.status(500).json({ error: "Server error" });
  }
});


router.delete("/:id/kick/:userId", async (req, res) => {
  const { id: roomId, userId: targetId } = req.params;

  try {
    const { rows } = await db.query("SELECT owner_id AS doodlerid FROM rooms WHERE id = $1", [roomId]);
    if (!rows.length)
       return res.status(404).json({ error: "Room not found" });
    if (rows[0].doodlerid !== req.user.id)
       return res.status(403).json({ error: "Only the admin can kick" });
    if (targetId === req.user.id) 
    return res.status(400).json({ error: "admin cant kick himself/herself" });

    await db.query(
      "UPDATE rooms SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1",
      [roomId]
    );
     return res.json({ ok: true });
  } catch (err) {
    console.error("[rooms:kick]", err);
    return res.status(500).json({ error: "Server error" });
  }
});


router.post("/:id/close", async (req, res) => {
  const { id: roomId } = req.params;

  try {
    const { rows } = await db.query("SELECT owner_id AS doodlerid FROM rooms WHERE id = $1", [roomId]);
    if (!rows.length) 
      return res.status(404).json({ error: "Room doesnt exist" });
    if (rows[0].doodlerid !== req.user.id)
       return res.status(403).json({ error: "Only admins can close the room" });

    await db.query("UPDATE rooms SET is_closed = TRUE WHERE id = $1", [roomId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[rooms:close]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
