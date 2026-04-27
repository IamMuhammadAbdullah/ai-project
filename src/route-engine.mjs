import { rawNodes, rawRoads, rawRoundabouts, rawUTurns } from "./map-data.mjs";

const perf = globalThis.performance ?? { now: () => Date.now() };

function expandPoint(point) {
  return { x: Math.round(point.x * 1.16 + 34), y: Math.round(point.y * 1.12 + 28) };
}

export function edgeKey(a, b) {
  return [a, b].sort().join("-");
}

export function roadWidth(type) {
  return { highway: 52, primary: 44, secondary: 35, local: 28 }[type] || 30;
}

export function createRouteEngine() {
  const nodes = rawNodes.map((node) => ({ ...node, ...expandPoint(node) }));
  const roundabouts = rawRoundabouts.map((roundabout) => {
    const expanded = expandPoint(roundabout);
    return { ...roundabout, ...expanded, r: Math.round(roundabout.r * 1.2) };
  });
  const uTurns = rawUTurns.map((turn) => {
    const expanded = expandPoint(turn);
    return { ...turn, ...expanded, r: Math.round(turn.r * 1.18) };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  const edgeMap = new Map();
  const roundaboutByNode = new Map();
  let trafficMode = "normal";

  const distance = (a, b) => {
    const from = nodeById.get(a);
    const to = nodeById.get(b);
    return Math.hypot(from.x - to.x, from.y - to.y) / 18;
  };

  rawRoads.forEach(([from, to, traffic, name, type]) => {
    const baseDistance = distance(from, to);
    const edge = { from, to, baseTraffic: traffic, traffic, name, type, distance: baseDistance, cost: baseDistance * traffic };
    edgeMap.set(edgeKey(from, to), edge);
    adjacency.get(from).push({ id: to, from, to, laneSide: -1, traffic, distance: baseDistance, cost: edge.cost });
    adjacency.get(to).push({ id: from, from: to, to: from, laneSide: 1, traffic, distance: baseDistance, cost: edge.cost });
  });

  function nearestNode(point, excludedId = null) {
    return nodes.reduce((nearest, node) => {
      if (node.id === excludedId) return nearest;
      const currentDistance = Math.hypot(node.x - point.x, node.y - point.y);
      return currentDistance < nearest.distance ? { node, distance: currentDistance } : nearest;
    }, { node: nodes[0], distance: Infinity }).node;
  }

  roundabouts.forEach((roundabout) => {
    roundaboutByNode.set(nearestNode(roundabout).id, roundabout);
  });

  const heuristic = (from, to) => distance(from, to);

  function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      path.unshift(current);
    }
    return path;
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

  function findAllPaths(start, goal, maxPaths = 14, maxDepth = 9) {
    const paths = [];
    const stack = [[start, [start], 0]];
    const startedAt = perf.now();
    while (stack.length && paths.length < maxPaths) {
      if (perf.now() - startedAt > 45) break;
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

  const pathCost = (path) => path.slice(0, -1).reduce((sum, id, index) => sum + edgeMap.get(edgeKey(id, path[index + 1])).cost, 0);
  const pathDistance = (path) => path.slice(0, -1).reduce((sum, id, index) => sum + edgeMap.get(edgeKey(id, path[index + 1])).distance, 0);

  function trafficForMode(edge, index) {
    if (trafficMode === "light") return Math.max(1, edge.baseTraffic * 0.72);
    if (trafficMode === "heavy") return Math.min(2.8, edge.baseTraffic * 1.45);
    if (trafficMode === "rush") return Math.min(2.9, Math.max(1, edge.baseTraffic * (0.86 + ((index * 37) % 80) / 50)));
    return edge.baseTraffic;
  }

  function applyTrafficMode(mode = trafficMode) {
    trafficMode = mode;
    [...edgeMap.values()].forEach((edge, index) => {
      edge.traffic = trafficForMode(edge, index);
      edge.cost = edge.distance * edge.traffic;
    });
    adjacency.forEach((neighbors, from) => {
      neighbors.forEach((neighbor) => {
        const edge = edgeMap.get(edgeKey(from, neighbor.id));
        neighbor.traffic = edge.traffic;
        neighbor.cost = edge.cost;
        neighbor.distance = edge.distance;
      });
    });
  }

  function directedLaneSide(fromId, toId) {
    const edge = edgeMap.get(edgeKey(fromId, toId));
    return edge?.from === fromId && edge?.to === toId ? -1 : 1;
  }

  function lanePointOnEdge(edge, t, laneSide) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const laneOffset = Math.max(7, roadWidth(edge.type) * 0.24);
    return { x: from.x + dx * t + nx * laneOffset * laneSide, y: from.y + dy * t + ny * laneOffset * laneSide };
  }

  const travelTForNode = (edge, nodeId) => edge.from === nodeId ? 0 : 1;

  function roundaboutTrimmedT(edge, nodeId) {
    const roundabout = roundaboutByNode.get(nodeId);
    if (!roundabout) return travelTForNode(edge, nodeId);
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const trim = Math.min(0.35, (roundabout.r + roadWidth(edge.type) * 0.08) / length);
    return edge.from === nodeId ? trim : 1 - trim;
  }

  function lanePointForDirectedNode(nodeId, fromId, toId) {
    const edge = edgeMap.get(edgeKey(fromId, toId));
    if (!edge) return nodeById.get(nodeId);
    return lanePointOnEdge(edge, roundaboutTrimmedT(edge, nodeId), directedLaneSide(fromId, toId));
  }

  function sampleDirectedEdge(fromId, toId, startT = null, endT = null) {
    const edge = edgeMap.get(edgeKey(fromId, toId));
    if (!edge) return [];
    const fromT = startT ?? roundaboutTrimmedT(edge, fromId);
    const toT = endT ?? roundaboutTrimmedT(edge, toId);
    const steps = Math.max(4, Math.ceil(Math.abs(toT - fromT) * edge.distance / 2.4));
    return Array.from({ length: steps + 1 }, (_, i) => lanePointOnEdge(edge, fromT + (toT - fromT) * (i / steps), directedLaneSide(fromId, toId)));
  }

  function tForPointOnEdge(point, edge) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
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
      const laneSide = signedDistance < 0 ? -1 : 1;
      const laneStartNode = laneSide === -1 ? edge.from : edge.to;
      const laneEndNode = laneSide === -1 ? edge.to : edge.from;
      const graphNode = laneStartNode === excludedId ? laneEndNode : laneStartNode;
      const distanceToRoad = Math.abs(signedDistance);
      return distanceToRoad < nearest.distance
        ? { point: lanePointOnEdge(edge, t, laneSide), graphNode, laneStartNode, laneEndNode, laneT: t, distance: distanceToRoad, edge, laneSide }
        : nearest;
    }, { point, graphNode: nearestNode(point, excludedId).id, laneStartNode: null, laneEndNode: null, laneT: 0, distance: Infinity, edge: null, laneSide: 1 });
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
    const start = normalizeAngle(angleBetweenPoints(roundabout, entryPoint));
    const end = normalizeAngle(angleBetweenPoints(roundabout, exitPoint));
    let delta = end - start;
    if (delta < 0) delta += Math.PI * 2;
    if (delta > Math.PI * 1.35) delta -= Math.PI * 2;
    const steps = Math.max(5, Math.ceil(Math.abs(delta) / (Math.PI / 8)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const angle = start + delta * (i / steps);
      return { x: roundabout.x + Math.cos(angle) * roundabout.r, y: roundabout.y + Math.sin(angle) * roundabout.r };
    });
  }

  const samePoint = (a, b) => a && b && Math.hypot(a.x - b.x, a.y - b.y) < 0.5;
  const pushPoint = (points, point) => { if (point && !samePoint(points[points.length - 1], point)) points.push(point); };

  function pathToPoints(path, startPin, endPin, startPoint, endPoint) {
    if (!path.length) return [];
    const routedPoints = [];
    if (startPin?.edge) {
      sampleDirectedEdge(startPin.laneStartNode, startPin.laneEndNode, tForPointOnEdge(startPoint, startPin.edge), null).forEach((point) => pushPoint(routedPoints, point));
    } else {
      pushPoint(routedPoints, startPoint);
    }
    path.slice(0, -1).forEach((fromId, index) => {
      const toId = path[index + 1];
      const previousPoint = routedPoints[routedPoints.length - 1];
      const nextStart = lanePointForDirectedNode(fromId, fromId, toId);
      const roundabout = roundaboutByNode.get(fromId);
      if (roundabout && previousPoint && nextStart && !samePoint(previousPoint, nextStart)) {
        sampleRoundaboutArc(roundabout, previousPoint, nextStart).forEach((point) => pushPoint(routedPoints, point));
      } else {
        pushPoint(routedPoints, nextStart);
      }
      sampleDirectedEdge(fromId, toId).forEach((point) => pushPoint(routedPoints, point));
    });
    if (endPin?.edge) {
      const finalNode = path[path.length - 1];
      const endEdgeStart = lanePointForDirectedNode(finalNode, endPin.laneStartNode, endPin.laneEndNode);
      const roundabout = roundaboutByNode.get(finalNode);
      if (roundabout && !samePoint(routedPoints[routedPoints.length - 1], endEdgeStart)) {
        sampleRoundaboutArc(roundabout, routedPoints[routedPoints.length - 1], endEdgeStart).forEach((point) => pushPoint(routedPoints, point));
      } else {
        pushPoint(routedPoints, endEdgeStart);
      }
      sampleDirectedEdge(endPin.laneStartNode, endPin.laneEndNode, null, tForPointOnEdge(endPoint, endPin.edge)).forEach((point) => pushPoint(routedPoints, point));
    } else {
      pushPoint(routedPoints, endPoint);
    }
    return routedPoints;
  }

  applyTrafficMode("normal");
  return { nodes, nodeById, adjacency, edgeMap, roundabouts, uTurns, roundaboutByNode, aStar, findAllPaths, pathCost, pathDistance, applyTrafficMode, nearestRoadPoint, pathToPoints, roadWidth };
}
