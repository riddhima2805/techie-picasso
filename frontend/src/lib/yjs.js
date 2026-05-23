
import * as Y from "yjs";
export function createYjsRoom(roomId, token) {
  const ydoc = new Y.Doc();

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl =
    `${proto}://${location.host}/ws` +
    `?token=${encodeURIComponent(token)}` +
    `&roomId=${encodeURIComponent(roomId)}` +
    "&channel=yjs";

  const provider = createRawYjsProvider(wsUrl, ydoc);
  const yStrokes = ydoc.getArray("strokes");


  const yMeta = ydoc.getMap("meta");

  function destroy() {
    provider.disconnect();
    ydoc.destroy();
  }

  return { ydoc, provider, yStrokes, yMeta, destroy };
}

function createRawYjsProvider(wsUrl, ydoc) {
  const listeners = new Map();
  let ws = null;
  let reconnectTimer = null;
let destroyed = false;

  function emit(event, payload) {
    listeners.get(event)?.forEach((handler) => handler(payload));
  }

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => emit("status", { status: "connected" });

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        Y.applyUpdate(ydoc, new Uint8Array(event.data), "remote");
      }
    };

    ws.onclose = () => {
      emit("status", { status: "disconnected" });
      if (!destroyed) {
        reconnectTimer = window.setTimeout(connect, 1000);
      }
    };

    ws.onerror = () => {
      emit("status", { status: "disconnected" });
    };
  }

  const onUpdate = (update, origin) => {
    if (origin === "remote") return;
    if (ws?.readyState === WebSocket.OPEN) ws.send(update);
  };

  ydoc.on("update", onUpdate);
  connect();

  return {
    on(event, handler) {
      if (!listeners.has(event)) 
        listeners.set(event, new Set());
      listeners.get(event).add(handler);
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
  },
    disconnect() {
      destroyed = true;
      if (reconnectTimer)
      window.clearTimeout(reconnectTimer);
      ydoc.off("update", onUpdate);
      ws?.close();
    },
  };
}
