
import { useEffect, useRef, useState, useCallback } from "react";
import Konva from "konva";
import { createYjsRoom } from "../lib/yjs";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

export function useCanvas({ roomId, token, currentUser, Colour, brushcaliber }) {
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
const layerRef     = useRef(null);
  const yjsRef       = useRef(null);
const [ready, setReady]       = useState(false);
  const [connected, setConnected] = useState(false);
const isDrawing  = useRef(false);
  const isPanning  = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });
const currentLine = useRef(null);
  const strokes = useRef([]);
const spaceDown  = useRef(false);

  
  useEffect(() => {
    if (!containerRef.current || !roomId || !token) 
      return;

    const stage = new Konva.Stage({//creates the board nd joins the shared room so doodlers can sync their drawings
      container: containerRef.current,
    width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    stageRef.current = stage;
  layerRef.current = layer;

  
    const yjs = createYjsRoom(roomId, token);
    yjsRef.current = yjs;

    yjs.provider.on("status", ({ status }) => {
      setConnected(status === "connected");
    }
  );

  
    renderAllStrokes(layer, yjs.yStrokes.toArray());

    
    yjs.yStrokes.observe(() => {
      renderAllStrokes(
      layer, yjs.yStrokes.toArray()
    );
    }
  );

    setReady(true);
const ro = new ResizeObserver(() => {
      stage.width(containerRef.current.clientWidth);
      stage.height(containerRef.current.clientHeight);
    }
  );
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      yjs.destroy();
    stage.destroy();
    };
  
  }, [roomId, token]);

 
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const getScaledPos = () => {
      const pos   = stage.getPointerPosition();
      const scale = stage.scaleX();
      return {
        x: (pos.x - stage.x()) / scale,
        y: (pos.y - stage.y()) / scale,
      };
    };

    const startdraw = (e) => {
      if (spaceDown.current || e.evt.button === 1) {
        isPanning.current = true;
      lastPos.current   = stage.getPointerPosition();
        stage.container().style.cursor = "grabbing";
        return;
      }
      if (e.evt.button !== 0) return;
      isDrawing.current = true;
      const pos = getScaledPos();
      strokes.current = [pos.x, pos.y];

      currentLine.current = new Konva.Line({
        points: strokes.current,
       stroke: Colour,
        strokeWidth: brushcaliber,
    lineCap:   "round",
        lineJoin:"round",
    tension:     0.4,
        globalCompositeOperation: Colour === "#0d4920ff" ? "source-over" : "source-over",
      });
      layerRef.current.add(currentLine.current);
    };

    const onMouseMove = (e) => {
      if (isPanning.current) {
        const pos = stage.getPointerPosition();
      stage.x(stage.x() + pos.x - lastPos.current.x);
      stage.y(stage.y() + pos.y - lastPos.current.y);
        lastPos.current = pos;
        stage.batchDraw();
        return;
      }
      if (!isDrawing.current || !currentLine.current) return;
      const pos = getScaledPos();
      strokes.current = [...strokes.current, pos.x, pos.y];
      currentLine.current.points(strokes.current);
      layerRef.current.batchDraw();
    };

    const onMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        stage.container().style.cursor = spaceDown.current ? "grab" : "crosshair";
        return;
      }
      if (!isDrawing.current) 
      return;
      isDrawing.current = false;

      if (strokes.current.length < 4) {
        currentLine.current?.destroy();
        currentLine.current = null;
        strokes.current = [];
        return;
      }

      
      const stroke = {
        id:       crypto.randomUUID(),
        userId:   currentUser.id,
        username:currentUser.username,
       Colour,
        size:     brushcaliber,
     points:strokes.current,
      };
      yjsRef.current?.yStrokes.push([stroke]);

      currentLine.current = null;
      strokes.current = [];
    };

    const onWheel = (e) => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer  = stage.getPointerPosition();
    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor    = 1.08;
      const newScale  = Math.min(MAX_SCALE, Math.max(MIN_SCALE, direction > 0 ? oldScale * factor : oldScale / factor));
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
      stage.batchDraw();
    };

    stage.on("mousedown touchstart", startdraw);
    stage.on("mousemove touchmove",  onMouseMove);
    stage.on("mouseup touchend",     onMouseUp);
    stage.on("wheel",                onWheel);

    return () => {
      stage.off("mousedown touchstart", startdraw);
      stage.off("mousemove touchmove",  onMouseMove);
      stage.off("mouseup touchend",     onMouseUp);
      stage.off("wheel",                onWheel);
    };
  }, [Colour, brushcaliber, currentUser]);

  
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space") {
        spaceDown.current = true;
        if (stageRef.current) stageRef.current.container().style.cursor = "grab";
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        spaceDown.current = false;
        if (stageRef.current) stageRef.current.container().style.cursor = "crosshair";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, []);

 
  const exportImage = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href     = dataUrl;
    a.download = `canvas-${roomId}-${Date.now()}.png`;
    a.click();
  }, [roomId]);

 
  const clearCanvas = useCallback(() => {
    yjsRef.current?.ydoc.transact(() => {
      yjsRef.current.yStrokes.delete(0, yjsRef.current.yStrokes.length);
    });
  }, []);

  return { containerRef, ready, connected, exportImage, clearCanvas };
}

function renderAllStrokes(layer, strokes) {
  layer.destroyChildren();
  strokes.forEach((s) => {
    const line = new Konva.Line({
      points:      s.points,
      stroke:      s.Colour || "#ffffff",
      strokeWidth: s.size  || 3,
      lineCap:     "round",
      lineJoin:    "round",
      tension:     0.4,
    });
    layer.add(line);
  });
  layer.batchDraw();
}