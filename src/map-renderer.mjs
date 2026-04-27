import { edgeKey } from "./route-engine.mjs";

export function createMapRenderer(canvas, engine) {
  const ctx = canvas.getContext("2d");
  const { edgeMap, nodeById, roundabouts, roadWidth } = engine;

  const trafficColor = (traffic) => traffic >= 1.7 ? "#ea4335" : traffic >= 1.3 ? "#fbbc04" : "#34a853";

  function drawRoad(edge, color, width, alpha = 1, offset = 0) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x + nx * offset, from.y + ny * offset);
    ctx.lineTo(to.x + nx * offset, to.y + ny * offset);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrow(x, y, angle, color, size = 9, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.75, -size * 0.58);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.75, size * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLaneDirection(edge) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 130) return;
    const angle = Math.atan2(dy, dx);
    const nx = -dy / length;
    const ny = dx / length;
    const laneOffset = Math.max(4, roadWidth(edge.type) * 0.28);
    [0.35, 0.65].forEach((t) => {
      drawArrow(from.x + dx * t + nx * laneOffset, from.y + dy * t + ny * laneOffset, angle + Math.PI, "#6f7782", 7, 0.8);
      drawArrow(to.x - dx * t - nx * laneOffset, to.y - dy * t - ny * laneOffset, angle, "#6f7782", 7, 0.8);
    });
  }

  function drawRoadLabel(edge) {
    if (edge.type === "local") return;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 170) return;
    ctx.save();
    ctx.translate((from.x + to.x) / 2, (from.y + to.y) / 2);
    let angle = Math.atan2(dy, dx);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
    ctx.rotate(angle);
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 12px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(edge.name, 0, -13);
    ctx.restore();
  }

  function drawRoundabouts() {
    roundabouts.forEach((roundabout) => {
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 25;
      ctx.beginPath();
      ctx.arc(roundabout.x, roundabout.y, roundabout.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#d0d4da";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(roundabout.x, roundabout.y, roundabout.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(roundabout.x, roundabout.y, roundabout.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#edf4ea";
      ctx.beginPath();
      ctx.arc(roundabout.x, roundabout.y, roundabout.r - 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5f6368";
      ctx.font = "600 11px Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText(roundabout.label, roundabout.x, roundabout.y + roundabout.r + 20);
      ctx.restore();
    });
  }

  function drawTrafficRoads() {
    const edges = [...edgeMap.values()].sort((a, b) => roadWidth(a.type) - roadWidth(b.type));
    edges.forEach((edge) => drawRoad(edge, edge.type === "highway" ? "#f6c453" : "#ffffff", roadWidth(edge.type) + 12, 1));
    edges.forEach((edge) => drawRoad(edge, edge.type === "highway" ? "#eeb84b" : "#d0d4da", roadWidth(edge.type) + 5, 1));
    edges.forEach((edge) => {
      const width = roadWidth(edge.type);
      const laneOffset = width * 0.24;
      drawRoad(edge, edge.type === "highway" ? "#fff0bf" : "#ffffff", Math.max(4, width * 0.38), 1, -laneOffset);
      drawRoad(edge, edge.type === "highway" ? "#fff0bf" : "#ffffff", Math.max(4, width * 0.38), 1, laneOffset);
      drawRoad(edge, "#8b949e", 1.2, 0.45);
    });
    edges.forEach((edge) => drawRoad(edge, trafficColor(edge.traffic), 3.5, 0.72, roadWidth(edge.type) * 0.48));
    drawRoundabouts();
    edges.forEach(drawLaneDirection);
    edges.forEach(drawRoadLabel);
  }

  function drawPath(points, progress, color, width, alpha = 1) {
    if (!points.length || progress <= 0) return;
    const segments = points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1] }));
    const exact = progress * segments.length;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    segments.forEach((segment, index) => {
      if (index > exact) return;
      const partial = Math.max(0, Math.min(1, exact - index));
      ctx.moveTo(segment.from.x, segment.from.y);
      ctx.lineTo(segment.from.x + (segment.to.x - segment.from.x) * partial, segment.from.y + (segment.to.y - segment.from.y) * partial);
    });
    ctx.stroke();
    ctx.restore();
  }

  function pointOnPath(points, progress) {
    const segments = points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1] }));
    if (!segments.length) return null;
    const exact = Math.min(segments.length - 0.001, Math.max(0, progress) * segments.length);
    const segment = segments[Math.floor(exact)];
    const local = exact - Math.floor(exact);
    return { x: segment.from.x + (segment.to.x - segment.from.x) * local, y: segment.from.y + (segment.to.y - segment.from.y) * local };
  }

  function drawPin(point, label, color, alpha = 1) {
    if (!point) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 12px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, point.x, point.y);
    ctx.restore();
  }

  function draw(state, getPathPoints) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawTrafficRoads();
    if (state.routeStarted) {
      state.possiblePaths.forEach(({ path }) => {
        const points = getPathPoints(path);
        drawPath(points, state.allRouteProgress, "#fbbc04", 8, 0.22);
        drawPath(points, state.allRouteProgress, "#202124", 3, 0.5);
      });
      const bestPoints = getPathPoints(state.bestPath);
      drawPath(bestPoints, state.bestRouteProgress, "#fbbc04", 11, 0.96);
      drawPath(bestPoints, state.bestRouteProgress, "#202124", 4, 0.96);
      const vehicle = pointOnPath(bestPoints, state.bestRouteProgress);
      if (vehicle) {
        ctx.fillStyle = "#202124";
        ctx.beginPath();
        ctx.arc(vehicle.x, vehicle.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(vehicle.x, vehicle.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state.hoverPinPoint) drawPin(state.hoverPinPoint, state.nextClickTarget === "start" ? "S" : "E", "#5f6368", 0.42);
    drawPin(state.startPoint, "S", "#1a73e8");
    drawPin(state.endPoint, "E", "#ea4335");
  }

  return { draw };
}
