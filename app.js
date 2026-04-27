import { createRouteEngine, roadWidth } from "./src/route-engine.mjs";
import { createMapRenderer } from "./src/map-renderer.mjs";

const canvas = document.getElementById("mapCanvas");
const trafficSelect = document.getElementById("trafficSelect");
const clearPinsBtn = document.getElementById("clearPinsBtn");
const startRouteBtn = document.getElementById("startRouteBtn");
const mapHint = document.getElementById("mapHint");
const routeSummary = document.getElementById("routeSummary");

const engine = createRouteEngine();
const renderer = createMapRenderer(canvas, engine);

const state = {
  startId: null,
  endId: null,
  startPoint: null,
  endPoint: null,
  startPin: null,
  endPin: null,
  possiblePaths: [],
  bestPath: [],
  pathPointCache: new Map(),
  allRouteProgress: 0,
  bestRouteProgress: 0,
  animationFrame: null,
  nextClickTarget: "start",
  routeStarted: false,
  pinError: "",
  pinErrorUntil: 0,
  hoverPinPoint: null
};

function canvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function cachedPathToPoints(path) {
  const key = path.join("-");
  if (!state.pathPointCache.has(key)) {
    state.pathPointCache.set(key, engine.pathToPoints(path, state.startPin, state.endPin, state.startPoint, state.endPoint));
  }
  return state.pathPointCache.get(key);
}

function draw() {
  renderer.draw(state, cachedPathToPoints);
}

function updateStats() {
  if (!state.startPoint) {
    routeSummary.textContent = "Click a road for start, then click a road for destination.";
    return;
  }
  if (!state.endPoint) {
    routeSummary.textContent = "Start pin selected. Click the destination pin.";
    return;
  }
  if (!state.bestPath.length) {
    routeSummary.textContent = "Choose two different areas on the map.";
    return;
  }
  const cost = state.routeCost ?? engine.pathCost(state.bestPath);
  const distance = state.routeDistance ?? engine.pathDistance(state.bestPath);
  routeSummary.textContent = `${state.possiblePaths.length} routes | ${trafficSelect.options[trafficSelect.selectedIndex].text} traffic | Cost ${cost.toFixed(1)} | ${distance.toFixed(1)} km`;
}

function updateClickHint() {
  startRouteBtn.disabled = !state.startPoint || !state.endPoint || !state.bestPath.length;
  if (state.pinError && performance.now() < state.pinErrorUntil) {
    mapHint.textContent = state.pinError;
    mapHint.classList.add("error");
    return;
  }
  state.pinError = "";
  mapHint.classList.remove("error");
  mapHint.textContent = !state.startPoint
    ? "Hover over a lane, then click to place the start pin."
    : state.nextClickTarget === "start"
      ? "Hover over a lane, then click to set a new start pin."
      : "Hover over a lane, then click to place the destination pin.";
}

async function getPythonRoutes() {
  const params = new URLSearchParams({
    start: state.startId,
    end: state.endId,
    traffic: trafficSelect.value
  });
  const response = await fetch(`/api/routes?${params.toString()}`);
  if (!response.ok) throw new Error("Python route API unavailable");
  return response.json();
}

async function calculateRoutes(shouldAnimate = true) {
  if (!state.startPoint || !state.endPoint || !state.startId || !state.endId) {
    state.possiblePaths = [];
    state.bestPath = [];
    state.routeCost = 0;
    state.routeDistance = 0;
    state.pathPointCache = new Map();
    state.allRouteProgress = 0;
    state.bestRouteProgress = 0;
    updateStats();
    updateClickHint();
    draw();
    return;
  }

  try {
    const result = await getPythonRoutes();
    state.possiblePaths = result.possiblePaths;
    state.bestPath = result.bestPath;
    state.routeCost = result.cost;
    state.routeDistance = result.distance;
  } catch {
    state.possiblePaths = engine.findAllPaths(state.startId, state.endId);
    state.bestPath = engine.aStar(state.startId, state.endId);
    state.routeCost = engine.pathCost(state.bestPath);
    state.routeDistance = engine.pathDistance(state.bestPath);
  }
  state.pathPointCache = new Map();
  state.allRouteProgress = shouldAnimate ? 0 : 1;
  state.bestRouteProgress = shouldAnimate ? 0 : 1;
  state.routeStarted = shouldAnimate;
  updateStats();
  updateClickHint();
  draw();
  if (shouldAnimate) animateRoute();
}

function animateRoute() {
  if (!state.startPoint || !state.endPoint || !state.bestPath.length) return;
  cancelAnimationFrame(state.animationFrame);
  const startedAt = performance.now();
  const duration = 22000;
  state.allRouteProgress = 0;
  state.bestRouteProgress = 0;
  state.routeStarted = true;

  function tick(now) {
    const elapsed = now - startedAt;
    state.allRouteProgress = Math.min(1, elapsed / (duration * 0.45));
    state.bestRouteProgress = elapsed < duration * 0.55 ? 0 : Math.min(1, (elapsed - duration * 0.55) / (duration * 0.45));
    draw();
    if (elapsed < duration) state.animationFrame = requestAnimationFrame(tick);
  }

  state.animationFrame = requestAnimationFrame(tick);
}

function maxRoadDistance(picked) {
  return picked.edge ? Math.max(14, roadWidth(picked.edge.type) * 0.34) : 18;
}

canvas.addEventListener("click", (event) => {
  const picked = engine.nearestRoadPoint(canvasPoint(event.clientX, event.clientY), state.nextClickTarget === "end" ? state.startId : null);
  if (picked.distance > maxRoadDistance(picked)) {
    state.pinError = "Move over a lane until the preview pin appears, then click.";
    state.pinErrorUntil = performance.now() + 2200;
    updateClickHint();
    draw();
    setTimeout(updateClickHint, 2300);
    return;
  }

  state.pinError = "";
  if (state.nextClickTarget === "start") {
    cancelAnimationFrame(state.animationFrame);
    Object.assign(state, {
      startPoint: picked.point,
      startPin: picked,
      endPoint: null,
      endPin: null,
      startId: picked.laneEndNode,
      endId: null,
      possiblePaths: [],
      bestPath: [],
      pathPointCache: new Map(),
      allRouteProgress: 0,
      bestRouteProgress: 0,
      routeStarted: false,
      nextClickTarget: "end"
    });
    updateClickHint();
    updateStats();
    draw();
    return;
  }

  if (picked.laneStartNode !== state.startId || picked.laneEndNode !== state.startId) {
    state.endPoint = picked.point;
    state.endPin = picked;
    state.endId = picked.laneStartNode;
    state.nextClickTarget = "start";
    state.routeStarted = false;
    updateClickHint();
    void calculateRoutes(false);
  }
});

canvas.addEventListener("mousemove", (event) => {
  const picked = engine.nearestRoadPoint(canvasPoint(event.clientX, event.clientY), state.nextClickTarget === "end" ? state.startId : null);
  state.hoverPinPoint = picked.distance <= maxRoadDistance(picked) ? picked.point : null;
  draw();
});

canvas.addEventListener("mouseleave", () => {
  state.hoverPinPoint = null;
  draw();
});

clearPinsBtn.addEventListener("click", () => {
  cancelAnimationFrame(state.animationFrame);
  Object.assign(state, {
    startId: null,
    endId: null,
    startPoint: null,
    endPoint: null,
    startPin: null,
    endPin: null,
    hoverPinPoint: null,
    possiblePaths: [],
    bestPath: [],
    pathPointCache: new Map(),
    allRouteProgress: 0,
    bestRouteProgress: 0,
    routeStarted: false,
    nextClickTarget: "start"
  });
  updateClickHint();
  updateStats();
  draw();
});

trafficSelect.addEventListener("change", () => {
  cancelAnimationFrame(state.animationFrame);
  engine.applyTrafficMode(trafficSelect.value);
  state.routeStarted = false;
  state.allRouteProgress = 0;
  state.bestRouteProgress = 0;
  state.pathPointCache = new Map();
  if (state.startPoint && state.endPoint) void calculateRoutes(false);
  else {
    updateStats();
    draw();
  }
});

startRouteBtn.addEventListener("click", animateRoute);

updateClickHint();
updateStats();
draw();
