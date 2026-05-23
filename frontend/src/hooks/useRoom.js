
import { useEffect, useRef, useState, useCallback } from "react";
import { createWsClient } from "../lib/ws";
import { fired, roomcloser as roomcloserApi }
 from "../lib/api";

export function useRoom({ roomId, currentUser, token, onKicked, onRoom }) {
  const [doodlers, setdoodlers] = useState([]);
  const [adminId, setadminId] = useState(null);
  const [cursors, setCursors] = useState({});
  const wsRef = useRef(null);

  const handleControl = useCallback((msg) => {
    
    if (!msg || !msg.type) 
      return;

    switch (msg.type) {
      case "user-joined":
        setdoodlers((prev) => (prev.some((m) => m.userId === msg.userId) ? prev : [...prev, { 
          userId: msg.userId,//used to update list of doodlers in room and location of their cursors.
        username: msg.username }
        ]));
        break;
      case "user-left":
        setdoodlers((prev) => prev.filter((m) => m.userId !== msg.userId));
        setCursors((prev) => {
          if (!prev[msg.userId]) return prev;
          const copy = { ...prev };
          delete copy[msg.userId];
          return copy;
        }
      );
        break;
      case "kicked":
        if (msg.targetUserId === currentUser?.id) onKicked?.();
        setdoodlers((prev) => prev.filter((m) => m.userId !== msg.targetUserId));
        break;
      case "owner-transferred":
        setadminId(msg.newOwnerId || msg.newadminId || null);
        break;
      case "room-closed":
        onRoom?.();
        break;
      case "cursor":
        setCursors((prev) => ({ ...prev, [msg.userId]: 
          { x: msg.x, y: msg.y, username: msg.username }
         }
        ));
        break;
      default:
      
      break;
    }
  }, [currentUser?.id, onKicked, onRoom]);

  useEffect(() => {
    if (!roomId || !token) 
      return;

    const client = createWsClient(
{ 
  roomId, token,
   onControl: handleControl, 
   onBinary: () => {}, 
   onOpen: () => console.log("socket active") 
  }
);
    wsRef.current = client;
    return () => client.close();
  }, 
  [roomId, token, handleControl]);

  const cursorPing = useCallback((x, y) => {
    wsRef.current?.sendControl({ type: "cursor", x, y });
  }, []);//sends cursor location 

  const kick = useCallback(async (userId) => {
    await fired(roomId, userId);
    wsRef.current?.sendControl({ 
      type: "kick", 
      targetUserId: userId 
    });
  }, 
  [roomId]);

  const roomcloser = useCallback(async () => {
    await roomcloserApi(roomId);
  }, 
  [roomId]);

  return { doodlers, adminId, cursors, cursorPing, kick, roomcloser };
}