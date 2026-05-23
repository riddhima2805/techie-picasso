

export function createWsClient({ 
  roomId,
   token, onBinary, onControl, onOpen, onClose }) {
  const wsUrl =
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws` +
    `?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
    //here websockets are sometimes blocked by CORS 
    // if we connect insecurely when the page is https.

  let ws = null;
  let reconnectDelay = 1000;
  let destroyed = false;

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";//useful for yjs updates coz they are binary data

    ws.onopen = () => {
      reconnectDelay = 1000;
      console.log("[ws] connected");
      onOpen?.();
    };

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        
        onBinary?.(new Uint8Array(e.data));
      } else {
        try {
          const msg = JSON.parse(e.data);
          onControl?.(msg); // used for things like clearing the canvas,joining the artist,if someone is kicked ,cursor updates
        } catch {
          console.warn("[ws] non-JSON text frame");
        }
    }
    };

    ws.onclose = (e) => {
      console.warn("[ws] closed", e.code, e.reason);
      onClose?.(e);
      if (!destroyed && e.code !== 4001 /* kicked */) {
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 16000);
      }
    };

    ws.onerror = (e) => console.error("[ws] error", e);
  }

  connect();

  return {
    send(data) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(data);
    },
    sendControl(obj) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    },
    close() {
      destroyed = true;
      ws?.close();
    },
  };
}