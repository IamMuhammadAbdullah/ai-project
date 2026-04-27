const assert = require("assert");

(async () => {
  const { createRouteEngine } = await import("../src/route-engine.js");
  const engine = createRouteEngine();

  const best = engine.aStar("A", "X");
  assert.strictEqual(best[0], "A");
  assert.strictEqual(best.at(-1), "X");

  const roadPick = engine.nearestRoadPoint({ x: 170, y: 165 });
  assert.ok(roadPick.distance < 40, "road pick should snap to a nearby lane");
  assert.notStrictEqual(roadPick.laneStartNode, roadPick.laneEndNode, "lane should have direction");

  const possible = engine.findAllPaths("A", "X");
  assert.ok(possible.length > 0, "possible routes should be found");
  assert.ok(engine.pathCost(best) > 0, "best path should have a positive cost");

  const points = engine.pathToPoints(best, roadPick, roadPick, roadPick.point, roadPick.point);
  assert.ok(points.length > best.length, "lane geometry should be sampled into multiple points");

  engine.applyTrafficMode("heavy");
  assert.ok(engine.aStar("A", "X").length > 1, "A* should still work after traffic changes");

  console.log("route-tests passed");
})();
