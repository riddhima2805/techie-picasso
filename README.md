# Doodle hub 🖌️

 It is a multi-user drawing canvas with infinite pan/zoom, has Yjs Conflict free replicated data type,  also redis Pub/Sub cross-server messaging, and room adminship.

## Architecture

```
Browser A → Nginx LB → Server 1 → Redis Pub/Sub → Server 2 → Browser B
                   ↘                                        ↙
                       Yjs CRDT (y-websocket provider)
                   ↘                                        ↙
                         PostgreSQL (throttled persist)
```

- **2 Express+WebSocket servers** 
- **Redis Pub/Sub** — each server publishes Yjs deltas to `room:<id>`; the other server subscribes and relays to its local clients. Basically if User on Server 1 draws something Server 2 must also know about it , Redis sends updates between them

- **admin absence timer** — if admin leaves the room then a 2 min timer starts
- **JWT auth** — HTTP-only; WebSocket connections pass token as query param `?token=<jwt>`

## terminal commands to run

### 1. Start

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env         
npm install
npm run dev                   # starts both servers on :3001 and :3002
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # dev server on http://localhost:5173
```
---

## Environment variables

| Variable              | Default | Description                            |
| --------------------- | ------- | -------------------------------------- |
| `PORT_1`              | `3001`  | First server port                      |
| `PORT_2`              | `3002`  | Second server port                     |
| `JWT_SECRET`          | —       | secret key used for signing jwt tokens |
| `PERSIST_INTERVAL_MS` | `3000`  | every 3s canvas save happens           |

---

## API Reference

List of backend endpoints frontend can call.


### Auth
 used to create a new account. 
 
 The backend flow is simply like this in case of register backend checks if email already exists then hashes password and stores user in database and creates a JWT token.

 In case of login the backend flow is it finds user by email and then compares hashed passwords and generates a JWT token 


| Method | Path                 | Body                          | Description           |
| ------ | -------------------- | ----------------------------- | --------------------- |
| POST   | `/api/auth/register` | `{username, email, password}` | Register, returns JWT |
| POST   | `/api/auth/login`    | `{email, password}`           | Login, returns JWT    |

### Rooms _(all require `Authorization: Bearer <token>`)_

| Method | Path                          | Description                      |
| ------ | ----------------------------- | -------------------------------- |
| POST   | `/api/rooms`                  | creates room                     |
| GET    | `/api/rooms`                  | lists open rooms                 |
| GET    | `/api/rooms/random`           | gives a random open room         |
| GET    | `/api/rooms/:id`              | gives details of room, id is a   |
|        |                               | dynamic parameter here           |
| POST   | `/api/rooms/:id/join`         | for joining a room               |
| DELETE | `/api/rooms/:id/kick/:userId` | admin kicks a artist             |
| POST   | `/api/rooms/:id/close`        | admin closes the room            |

### WebSocket

Connect to `ws://<host>/ws?token=<jwt>&roomId=<id>`, persistent connection, live sync

**Binary frames** —  these are binary packets usually Yjs update (handled automatically by y-websocket) binary packs data compactly. so much faster and smaller process.

**JSON control frames** (send):
 
 They are normal text-based WebSocket messages used for commands, events, and metadata  not the actual drawing sync data. Binary is more efficient, but things like kicking users, cursor movements, and room notifications are easier to handle by JSON data frames.


```json
{ "type": "cursor", "x": 120, "y": 340 }
{ "type": "kick", "targetUserId": "<uuid>" }
```

**JSON control frames** (receive):

```json
{ "type": "user-joined",        "userId": "...", "username": "..." }
{ "type": "user-left",          "userId": "..." }
{ "type": "kicked",             "targetUserId": "..." }
{ "type": "cursor",             "userId": "...", "username": "...", "x": 0, "y": 0 }
{ "type": "admin-transferred",  "newadminId": "..." }
{ "type": "room-closed",        "reason": "admin-absent" }
```

---

## Technology choices

**Yjs** — I have chosen this because it's optimized for array CRDT(Conflict-free Replicated Data Type ), has a `y-websocket` provider, and its binary encoding is compact (important for high-frequency canvas deltas). also conflict resolution is automatic if two users draw something at same time it produces a merge without manual help. also it was recommended in PS.

**Redis Pub/Sub** — the simplest solution for cross-server message fan-out. Pattern subscribe (`PSUBSCRIBE room:*`) means servers don't need to track which rooms are active at startup.

**Konva.js** — handles zooming and moving around the infinite canvas by transforming the whole “camera view” instead of changing every drawing one by one.

**JWT** — stateless auth means both server instances can validate tokens independently without shared session storage. Token is passed as a query param on WS upgrade (standard practice since WS handshakes don't support custom headers in browsers).
