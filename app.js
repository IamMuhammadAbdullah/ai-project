const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const pinModeBtn = document.getElementById("pinModeBtn");
const clearPinsBtn = document.getElementById("clearPinsBtn");
const startRouteBtn = document.getElementById("startRouteBtn");
const mapHint = document.getElementById("mapHint");
const routeSummary = document.getElementById("routeSummary");

const nodes = [
  { id: "A", name: "North Gate", x: 115, y: 120 },
  { id: "B", name: "Lake View", x: 330, y: 90 },
  { id: "C", name: "Tech Park", x: 560, y: 125 },
  { id: "D", name: "Old Town", x: 800, y: 85 },
  { id: "E", name: "Hill Road", x: 1080, y: 130 },
  { id: "F", name: "Airport Link", x: 1330, y: 110 },
  { id: "G", name: "Museum", x: 160, y: 310 },
  { id: "H", name: "Central Mall", x: 410, y: 290 },
  { id: "I", name: "City Hall", x: 650, y: 325 },
  { id: "J", name: "Business Bay", x: 910, y: 300 },
  { id: "K", name: "Harbor", x: 1160, y: 340 },
  { id: "L", name: "East Market", x: 1390, y: 300 },
  { id: "M", name: "University", x: 105, y: 535 },
  { id: "N", name: "Stadium", x: 350, y: 520 },
  { id: "O", name: "Medical City", x: 585, y: 555 },
  { id: "P", name: "Railway Hub", x: 840, y: 520 },
  { id: "Q", name: "Garden Town", x: 1105, y: 565 },
  { id: "R", name: "Expo Center", x: 1340, y: 520 },
  { id: "S", name: "South Park", x: 180, y: 760 },
  { id: "T", name: "West End", x: 460, y: 790 },
  { id: "U", name: "Industrial Zone", x: 730, y: 760 },
  { id: "V", name: "River Bridge", x: 995, y: 795 },
  { id: "W", name: "Logistics Yard", x: 1235, y: 745 },
  { id: "X", name: "South Terminal", x: 1410, y: 815 }
];

const roads = [
  ["A", "B", 1, "Lake Road", "primary"], ["B", "C", 1.2, "Lake Road", "primary"], ["C", "D", 1.8, "University Ave", "primary"], ["D", "E", 1.1, "Hill Road", "primary"], ["E", "F", 1.5, "Airport Road", "highway"],
  ["G", "H", 1.1, "Museum Street", "secondary"], ["H", "I", 1.6, "Central Avenue", "primary"], ["I", "J", 1, "Central Avenue", "primary"], ["J", "K", 1.9, "Harbor Road", "primary"], ["K", "L", 1.2, "Market Road", "secondary"],
  ["M", "N", 1.3, "Campus Drive", "secondary"], ["N", "O", 1, "Stadium Road", "secondary"], ["O", "P", 1.7, "Medical Road", "primary"], ["P", "Q", 1.1, "Garden Boulevard", "primary"], ["Q", "R", 1.4, "Expo Road", "secondary"],
  ["S", "T", 1.2, "South Park Way", "secondary"], ["T", "U", 1.5, "West End Road", "secondary"], ["U", "V", 1, "Industrial Link", "primary"], ["V", "W", 1.8, "River Bridge", "highway"], ["W", "X", 1.1, "Terminal Road", "highway"],
  ["A", "G", 1.4, "North Gate Road", "secondary"], ["G", "M", 1, "Museum Road", "secondary"], ["M", "S", 1.7, "University Road", "primary"], ["B", "H", 1, "Mall Road", "secondary"], ["H", "N", 1.4, "Stadium Link", "secondary"],
  ["N", "T", 1.2, "Arena Road", "secondary"], ["C", "I", 1.2, "Tech Park Road", "secondary"], ["I", "O", 1, "City Hall Road", "secondary"], ["O", "U", 1.8, "Factory Road", "primary"], ["D", "J", 1.3, "Old Town Road", "secondary"],
  ["J", "P", 1.1, "Business Link", "secondary"], ["P", "V", 1.4, "Railway Road", "primary"], ["E", "K", 1.2, "Harbor Link", "secondary"], ["K", "Q", 1.6, "Port Road", "primary"], ["Q", "W", 1, "Logistics Road", "primary"],
  ["F", "L", 1.1, "Airport Link", "highway"], ["L", "R", 1.7, "East Market Road", "primary"], ["R", "X", 1.2, "Expo Terminal", "highway"], ["B", "G", 1.5, "Lake Front", "local"], ["C", "H", 1.2, "Tech Lane", "local"],
  ["D", "I", 1.6, "Civic Street", "local"], ["E", "J", 1.3, "Commerce Street", "local"], ["H", "M", 1.8, "College Lane", "local"], ["I", "N", 1.3, "Green Street", "local"], ["J", "O", 1.7, "Clinic Street", "local"],
  ["K", "P", 1.2, "Harbor Cut", "local"], ["L", "Q", 1.8, "Market Cut", "local"], ["N", "S", 1.1, "Park Road", "local"], ["O", "T", 1.6, "West Medical", "local"], ["P", "U", 1.2, "Railway Cut", "local"],
  ["Q", "V", 1.5, "Garden Cut", "local"], ["R", "W", 1.1, "Expo Service", "local"], ["C", "G", 2.1, "Ring Road", "highway"], ["F", "K", 1.6, "Airport Spur", "highway"], ["S", "U", 2.4, "Southern Ring", "highway"],
  ["T", "V", 2, "South Connector", "highway"], ["U", "W", 1.7, "Cargo Road", "highway"], ["V", "X", 1.9, "Terminal Express", "highway"]
];

const roundabouts = [
  { x: 650, y: 325, r: 42, label: "Civic Roundabout" },
  { x: 840, y: 520, r: 38, label: "Railway Circle" },
  { x: 1105, y: 565, r: 36, label: "Garden Circle" }
];

const uTurns = [
  { x: 565, y: 210, r: 30, start: -0.45, end: Math.PI + 0.45, label: "U-turn" },
  { x: 1260, y: 420, r: 34, start: Math.PI * 0.55, end: Math.PI * 1.78, label: "U-turn" },
  { x: 460, y: 710, r: 32, start: -Math.PI * 0.78, end: Math.PI * 0.52, label: "U-turn" }
];

const mapAreas = [
  { label: "Lake View Park", color: "#c8e6c9", points: [[72, 42], [430, 35], [385, 190], [105, 220]] },
  { label: "Old Town", color: "#f5ead4", points: [[660, 28], [960, 42], [930, 220], [690, 238]] },
  { label: "Financial District", color: "#e8f0fe", points: [[780, 228], [1215, 238], [1180, 470], [770, 455]] },
  { label: "University Grounds", color: "#d7ead2", points: [[48, 460], [420, 430], [405, 650], [60, 675]] },
  { label: "Industrial Estate", color: "#eceff1", points: [[610, 645], [1045, 640], [1080, 890], [630, 878]] },
  { label: "Airport Zone", color: "#e6e0f8", points: [[1190, 40], [1460, 62], [1450, 242], [1220, 230]] },
  { label: "South Park", color: "#cdeccf", points: [[82, 690], [430, 675], [405, 900], [90, 890]] }
];

const waterways = [
  [[-40, 370], [200, 410], [375, 385], [560, 420], [760, 395], [955, 450], [1160, 430], [1540, 485]],
  [[1015, 650], [1120, 700], [1245, 690], [1370, 735], [1535, 720]]
];

function expandPoint(point) {
  return {
    x: Math.round(point.x * 1.16 + 34),
    y: Math.round(point.y * 1.12 + 28)
  };
}

nodes.forEach((node) => {
  const expanded = expandPoint(node);
  node.x = expanded.x;
  node.y = expanded.y;
});

roundabouts.forEach((roundabout) => {
  const expanded = expandPoint(roundabout);
  roundabout.x = expanded.x;
  roundabout.y = expanded.y;
  roundabout.r = Math.round(roundabout.r * 1.2);
});

uTurns.forEach((turn) => {
  const expanded = expandPoint(turn);
  turn.x = expanded.x;
  turn.y = expanded.y;
  turn.r = Math.round(turn.r * 1.18);
});

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const adjacency = new Map(nodes.map((node) => [node.id, []]));
const edgeMap = new Map();
const roundaboutByNode = new Map();
let startId = null;
let endId = null;
let startPoint = null;
let endPoint = null;
let possiblePaths = [];
let bestPath = [];
let allRouteProgress = 0;
let bestRouteProgress = 0;
let animationFrame = null;
let nextClickTarget = "start";
let pinModeEnabled = true;
let routeStarted = false;
let pinError = "";
let pinErrorUntil = 0;
let hoverPinPoint = null;

function edgeKey(a, b) {
  return [a, b].sort().join("-");
}

function distance(a, b) {
  const from = nodeById.get(a);
  const to = nodeById.get(b);
  return Math.hypot(from.x - to.x, from.y - to.y) / 18;
}

roads.forEach(([from, to, traffic, name, type]) => {
  const baseDistance = distance(from, to);
  const edge = { from, to, traffic, name, type, distance: baseDistance, cost: baseDistance * traffic };
  edgeMap.set(edgeKey(from, to), edge);
  adjacency.get(from).push({ id: to, traffic, distance: baseDistance, cost: baseDistance * traffic });
  adjacency.get(to).push({ id: from, traffic, distance: baseDistance, cost: baseDistance * traffic });
});

roundabouts.forEach((roundabout) => {
  const node = nearestNode({ x: roundabout.x, y: roundabout.y });
  roundaboutByNode.set(node.id, roundabout);
});

function heuristic(from, to) {
  return distance(from, to);
}

function aStar(start, goal) {
  const open = new Set([start]);
  const cameFrom = new Map();
  const gScore = new Map(nodes.map((node) => [node.id, Infinity]));
  const fScore = new Map(nodes.map((node) => [node.id, Infinity]));
  gScore.set(start, 0);
  fScore.set(start, heuristic(start, goal));

  while (open.size > 0) {
    const current = [...open].reduce((best, node) => fScore.get(node) < fScore.get(best) ? node : best);
    if (current === goal) return reconstructPath(cameFrom, current);
    open.delete(current);

    adjacency.get(current).forEach((neighbor) => {
      const tentative = gScore.get(current) + neighbor.cost;
      if (tentative < gScore.get(neighbor.id)) {
        cameFrom.set(neighbor.id, current);
        gScore.set(neighbor.id, tentative);
        fScore.set(neighbor.id, tentative + heuristic(neighbor.id, goal));
        open.add(neighbor.id);
      }
    });
  }

  return [];
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    path.unshift(current);
  }
  return path;
}

function findAllPaths(start, goal, maxPaths = 40, maxDepth = 12) {
  const paths = [];
  const stack = [[start, [start], 0]];

  while (stack.length && paths.length < maxPaths) {
    const [current, path, cost] = stack.pop();
    if (current === goal) {
      paths.push({ path, cost });
      continue;
    }
    if (path.length >= maxDepth) continue;

    [...adjacency.get(current)]
      .filter((neighbor) => !path.includes(neighbor.id))
      .sort((a, b) => (cost + b.cost + heuristic(b.id, goal)) - (cost + a.cost + heuristic(a.id, goal)))
      .forEach((neighbor) => stack.push([neighbor.id, [...path, neighbor.id], cost + neighbor.cost]));
  }

  return paths.sort((a, b) => a.cost - b.cost);
}

function pathCost(path) {
  return path.slice(0, -1).reduce((sum, id, index) => sum + edgeMap.get(edgeKey(id, path[index + 1])).cost, 0);
}

function pathDistance(path) {
  return path.slice(0, -1).reduce((sum, id, index) => sum + edgeMap.get(edgeKey(id, path[index + 1])).distance, 0);
}

function calculateRoutes(shouldAnimate = true) {
  if (!startPoint || !endPoint || !startId || !endId || startId === endId) {
    possiblePaths = [];
    bestPath = [];
    allRouteProgress = 0;
    bestRouteProgress = 0;
    updateStats();
    draw();
    return;
  }

  possiblePaths = findAllPaths(startId, endId);
  bestPath = aStar(startId, endId);
  allRouteProgress = shouldAnimate ? 0 : 1;
  bestRouteProgress = shouldAnimate ? 0 : 1;
  routeStarted = shouldAnimate;
  updateStats();
  draw();
  if (shouldAnimate) animateRoute();
}

function updateStats() {
  if (!startPoint) {
    routeSummary.textContent = "Click once for start, then click again for destination.";
    return;
  }

  if (!endPoint) {
    routeSummary.textContent = "Start pin selected. Click the destination pin.";
    return;
  }

  if (!bestPath.length) {
    routeSummary.textContent = "Choose two different areas on the map.";
    return;
  }

  routeSummary.textContent = `${possiblePaths.length} routes ready | A* cost ${pathCost(bestPath).toFixed(1)} | ${pathDistance(bestPath).toFixed(1)} km`;
}

function trafficColor(traffic) {
  if (traffic >= 1.7) return "#ea4335";
  if (traffic >= 1.3) return "#fbbc04";
  return "#34a853";
}

function roadWidth(type) {
  return { highway: 52, primary: 44, secondary: 35, local: 28 }[type] || 30;
}

function drawPolygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function drawCurvedLine(points, color, width, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
  }
  ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
  ctx.stroke();
  ctx.restore();
}

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
    drawArrow(from.x + dx * t + nx * laneOffset, from.y + dy * t + ny * laneOffset, angle, "#6f7782", 7, 0.8);
    drawArrow(to.x - dx * t - nx * laneOffset, to.y - dy * t - ny * laneOffset, angle + Math.PI, "#6f7782", 7, 0.8);
  });
}

function drawRoadLabel(edge) {
  if (edge.type === "local") return;
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 170) return;

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

function drawPartialPath(path, progress, color, width, alpha = 1) {
  if (!path.length || progress <= 0) return;
  const points = pathToPoints(path);
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
    const x = segment.from.x + (segment.to.x - segment.from.x) * partial;
    const y = segment.from.y + (segment.to.y - segment.from.y) * partial;
    ctx.moveTo(segment.from.x, segment.from.y);
    ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawMapBase() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTrafficRoads() {
  const edges = [...edgeMap.values()].sort((a, b) => roadWidth(a.type) - roadWidth(b.type));
  edges.forEach((edge) => drawRoad(edge, edge.type === "highway" ? "#f6c453" : "#ffffff", roadWidth(edge.type) + 12, 1));
  edges.forEach((edge) => drawRoad(edge, edge.type === "highway" ? "#eeb84b" : "#d0d4da", roadWidth(edge.type) + 5, 1));
  edges.forEach((edge) => {
    const width = roadWidth(edge.type);
    const laneOffset = width * 0.24;
    const laneColor = edge.type === "highway" ? "#fff0bf" : "#ffffff";
    drawRoad(edge, laneColor, Math.max(4, width * 0.38), 1, -laneOffset);
    drawRoad(edge, laneColor, Math.max(4, width * 0.38), 1, laneOffset);
    drawRoad(edge, "#8b949e", 1.2, 0.45);
  });
  edges.forEach((edge) => drawRoad(edge, trafficColor(edge.traffic), 3.5, 0.72, roadWidth(edge.type) * 0.48));
  drawRoundabouts();
  drawUTurns();
  edges.forEach(drawLaneDirection);
  edges.forEach(drawRoadLabel);
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

    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI * 0.5 + 0.65;
      drawArrow(
        roundabout.x + Math.cos(angle) * roundabout.r,
        roundabout.y + Math.sin(angle) * roundabout.r,
        angle + Math.PI * 0.5,
        "#6f7782",
        8,
        0.86
      );
    }

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

function drawUTurns() {
  uTurns.forEach((turn) => {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.arc(turn.x, turn.y, turn.r, turn.start, turn.end);
    ctx.stroke();
    ctx.strokeStyle = "#d0d4da";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(turn.x, turn.y, turn.r, turn.start, turn.end);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(turn.x, turn.y, turn.r, turn.start, turn.end);
    ctx.stroke();

    const arrowAngle = turn.end;
    drawArrow(
      turn.x + Math.cos(arrowAngle) * turn.r,
      turn.y + Math.sin(arrowAngle) * turn.r,
      arrowAngle + Math.PI * 0.5,
      "#6f7782",
      8,
      0.9
    );

    ctx.fillStyle = "#6b7280";
    ctx.font = "600 11px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(turn.label, turn.x, turn.y + turn.r + 17);
    ctx.restore();
  });
}

function drawHighlights() {
  if (!routeStarted) return;

  possiblePaths.forEach(({ path }) => {
    drawPartialPath(path, allRouteProgress, "#fbbc04", 20, 0.2);
    drawPartialPath(path, allRouteProgress, "#202124", 9, 0.34);
  });

  drawPartialPath(bestPath, bestRouteProgress, "#fbbc04", 28, 0.96);
  drawPartialPath(bestPath, bestRouteProgress, "#202124", 12, 0.96);
}

function pointOnPath(path, progress) {
  const points = pathToPoints(path);
  const segments = points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1] }));
  if (!segments.length) return null;
  const exact = Math.min(segments.length - 0.001, Math.max(0, progress) * segments.length);
  const current = Math.floor(exact);
  const local = exact - current;
  const segment = segments[current];
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * local,
    y: segment.from.y + (segment.to.y - segment.from.y) * local
  };
}

function drawRouteTracker(path, progress, color, radius, alpha) {
  if (progress <= 0 || progress >= 1) return;
  const point = pointOnPath(path, progress);
  if (!point) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

function drawMarkers() {
  if (hoverPinPoint && pinModeEnabled) {
    drawPin(hoverPinPoint, nextClickTarget === "start" ? "S" : "E", "#5f6368", 0.42);
  }
  drawPin(startPoint, "S", "#1a73e8");
  drawPin(endPoint, "E", "#ea4335");
}

function drawVehicle() {
  if (!bestPath.length || bestRouteProgress <= 0) return;
  const points = pathToPoints(bestPath);
  const segments = points.slice(0, -1).map((point, index) => ({ from: point, to: points[index + 1] }));
  const exact = Math.min(segments.length - 0.001, bestRouteProgress * segments.length);
  const current = Math.floor(exact);
  const local = exact - current;
  const segment = segments[current];
  if (!segment) return;
  const x = segment.from.x + (segment.to.x - segment.from.x) * local;
  const y = segment.from.y + (segment.to.y - segment.from.y) * local;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#202124";
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMapBase();
  drawTrafficRoads();
  drawHighlights();
  drawVehicle();
  drawMarkers();
}

function animateRoute() {
  if (!startPoint || !endPoint || !bestPath.length) return;
  cancelAnimationFrame(animationFrame);
  const startedAt = performance.now();
  const duration = 22000;
  allRouteProgress = 0;
  bestRouteProgress = 0;
  routeStarted = true;

  function tick(now) {
    const elapsed = now - startedAt;
    allRouteProgress = Math.min(1, elapsed / (duration * 0.45));
    bestRouteProgress = elapsed < duration * 0.55 ? 0 : Math.min(1, (elapsed - duration * 0.55) / (duration * 0.45));
    draw();
    if (elapsed < duration) animationFrame = requestAnimationFrame(tick);
  }

  animationFrame = requestAnimationFrame(tick);
}

function canvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function nearestNode(point, excludedId = null) {
  return nodes.reduce((nearest, node) => {
    if (node.id === excludedId) return nearest;
    const currentDistance = Math.hypot(node.x - point.x, node.y - point.y);
    return currentDistance < nearest.distance ? { node, distance: currentDistance } : nearest;
  }, { node: nodes[0], distance: Infinity }).node;
}

function nearestRoadPoint(point, excludedId = null) {
  return [...edgeMap.values()].reduce((nearest, edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const length = Math.sqrt(lengthSquared);
    const nx = -dy / length;
    const ny = dx / length;
    const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
    const center = { x: from.x + dx * t, y: from.y + dy * t };
    const signedDistance = (point.x - center.x) * nx + (point.y - center.y) * ny;
    const laneOffset = Math.max(7, roadWidth(edge.type) * 0.24);
    const laneSide = signedDistance < 0 ? -1 : 1;
    const snapped = {
      x: center.x + nx * laneOffset * laneSide,
      y: center.y + ny * laneOffset * laneSide
    };
    const distanceToRoad = Math.abs(signedDistance);
    const fromDistance = Math.hypot(center.x - from.x, center.y - from.y);
    const toDistance = Math.hypot(center.x - to.x, center.y - to.y);
    let graphNode = fromDistance <= toDistance ? edge.from : edge.to;

    if (graphNode === excludedId) {
      graphNode = graphNode === edge.from ? edge.to : edge.from;
    }

    return distanceToRoad < nearest.distance
      ? { point: snapped, graphNode, distance: distanceToRoad, edge }
      : nearest;
  }, { point, graphNode: nearestNode(point, excludedId).id, distance: Infinity, edge: null });
}

function angleBetweenPoints(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function normalizeAngle(angle) {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

function sampleRoundaboutArc(roundabout, entryPoint, exitPoint) {
  const radius = roundabout.r;
  const start = normalizeAngle(angleBetweenPoints(roundabout, entryPoint));
  const end = normalizeAngle(angleBetweenPoints(roundabout, exitPoint));
  let delta = end - start;
  if (delta < 0) delta += Math.PI * 2;

  const samples = [];
  const steps = Math.max(5, Math.ceil(delta / (Math.PI / 8)));
  for (let i = 0; i <= steps; i++) {
    const angle = start + delta * (i / steps);
    samples.push({
      x: roundabout.x + Math.cos(angle) * radius,
      y: roundabout.y + Math.sin(angle) * radius
    });
  }
  return samples;
}

function pathToPoints(path) {
  if (!path.length) return [];
  const rawPoints = [
    startPoint,
    ...path.map((id) => nodeById.get(id)),
    endPoint
  ].filter(Boolean);

  const routedPoints = [];
  rawPoints.forEach((point, index) => {
    const id = index > 0 && index <= path.length ? path[index - 1] : null;
    const roundabout = id ? roundaboutByNode.get(id) : null;

    if (!roundabout || index === 0 || index === rawPoints.length - 1) {
      routedPoints.push(point);
      return;
    }

    const previous = rawPoints[index - 1];
    const next = rawPoints[index + 1];
    routedPoints.push(...sampleRoundaboutArc(roundabout, previous, next));
  });

  return routedPoints;
}

function updateClickHint() {
  pinModeBtn.classList.toggle("active", pinModeEnabled);
  startRouteBtn.disabled = !startPoint || !endPoint || !bestPath.length;

  if (pinError && performance.now() < pinErrorUntil) {
    mapHint.textContent = pinError;
    mapHint.classList.add("error");
    return;
  }

  pinError = "";
  mapHint.classList.remove("error");

  if (!pinModeEnabled) {
    mapHint.textContent = "Select Pin is off. Turn it on to place pins.";
    return;
  }

  if (!startPoint) {
    mapHint.textContent = "Click anywhere to set the start point.";
    return;
  }

  mapHint.textContent = nextClickTarget === "start"
    ? "Click anywhere to set a new start point."
    : "Click anywhere to set the end point.";
}

canvas.addEventListener("click", (event) => {
  if (!pinModeEnabled) return;
  const point = canvasPoint(event.clientX, event.clientY);
  const picked = nearestRoadPoint(point, nextClickTarget === "end" ? startId : null);
  const maxRoadDistance = picked.edge ? roadWidth(picked.edge.type) * 0.72 : 36;

  if (picked.distance > maxRoadDistance) {
    pinError = "Pin must be placed on a road. Click closer to a lane.";
    pinErrorUntil = performance.now() + 2200;
    updateClickHint();
    draw();
    setTimeout(updateClickHint, 2300);
    return;
  }

  pinError = "";

  if (nextClickTarget === "start") {
    cancelAnimationFrame(animationFrame);
    startPoint = picked.point;
    endPoint = null;
    startId = picked.graphNode;
    endId = null;
    possiblePaths = [];
    bestPath = [];
    allRouteProgress = 0;
    bestRouteProgress = 0;
    routeStarted = false;
    nextClickTarget = "end";
    updateClickHint();
    updateStats();
    draw();
    return;
  }

  if (picked.graphNode !== startId) {
    endPoint = picked.point;
    endId = picked.graphNode;
    nextClickTarget = "start";
    routeStarted = false;
    updateClickHint();
    calculateRoutes(false);
  }
});

canvas.addEventListener("mousemove", (event) => {
  if (!pinModeEnabled) {
    hoverPinPoint = null;
    return;
  }

  const picked = nearestRoadPoint(canvasPoint(event.clientX, event.clientY), nextClickTarget === "end" ? startId : null);
  const maxRoadDistance = picked.edge ? roadWidth(picked.edge.type) * 0.72 : 36;
  hoverPinPoint = picked.distance <= maxRoadDistance ? picked.point : null;
  draw();
});

canvas.addEventListener("mouseleave", () => {
  hoverPinPoint = null;
  draw();
});

pinModeBtn.addEventListener("click", () => {
  pinModeEnabled = !pinModeEnabled;
  updateClickHint();
});

clearPinsBtn.addEventListener("click", () => {
  cancelAnimationFrame(animationFrame);
  startId = null;
  endId = null;
  startPoint = null;
  endPoint = null;
  hoverPinPoint = null;
  possiblePaths = [];
  bestPath = [];
  allRouteProgress = 0;
  bestRouteProgress = 0;
  routeStarted = false;
  nextClickTarget = "start";
  pinModeEnabled = true;
  updateClickHint();
  updateStats();
  draw();
});

startRouteBtn.addEventListener("click", animateRoute);

updateClickHint();
updateStats();
draw();
