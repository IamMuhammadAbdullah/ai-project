# Codebase Guide

This document explains the project structure and main logic so the codebase is easier to understand during evaluation.

## Project Summary

The project is an interactive A* Traffic Route Planner. The user clicks a start lane and an end lane on a city-style map. The app finds possible routes, calculates the most efficient route with A*, applies traffic constraints, and animates the routes on the road lanes.

The browser UI is written in JavaScript because `index.html`, DOM events, canvas drawing, and animation must run in the browser. The algorithmic logic that can reasonably exist in Python is also implemented in `python/route_engine.py` for the Python requirement.

## Folder Structure

```text
ai-project/
  index.html                 Main browser page
  styles.css                 Layout and UI styling
  app.js                     UI state, click handling, traffic selection, animation control
  README.md                  Short run/test instructions
  CODEBASE_GUIDE.md          Detailed explanation of the codebase

  src/
    map-data.js              Browser map data: nodes, roads, roundabouts
    route-engine.js          Browser route engine used by the canvas UI
    map-renderer.js          Canvas map, roads, pins, paths, and animation drawing

  python/
    map_data.py              Python copy of map data for algorithm utilities
    route_engine.py          Python A*, all-path search, traffic, lane snapping, route geometry
    __init__.py              Marks python/ as a package

  tests/
    route-tests.js           JavaScript route/geometry checks
    python_route_tests.py    Python route/geometry checks
```

## Main Runtime Flow

1. `index.html` loads `app.js` as a browser module.
2. `app.js` creates the route engine from `src/route-engine.js`.
3. `app.js` creates the canvas renderer from `src/map-renderer.js`.
4. The user clicks on the canvas.
5. `engine.nearestRoadPoint()` snaps the click to the nearest valid lane.
6. First valid click becomes the start pin. Second valid click becomes the end pin.
7. `calculateRoutes()` runs:
   - `findAllPaths()` for possible route options.
   - `aStar()` for the best traffic-aware route.
   - `pathCost()` and `pathDistance()` for the route summary.
8. Pressing Start calls `animateRoute()`.
9. `map-renderer.js` progressively draws possible routes first, then the A* route with a moving marker.

## Why JavaScript and Python Both Exist

The browser cannot directly execute local Python functions from `index.html` without a backend server or a Python-in-browser runtime. Because the requirement is not to use a Python HTTP server, the UI uses JavaScript route logic for real-time browser interaction.

Python is still used for the parts that are naturally convertible:

- A* search.
- Possible path search.
- Traffic-weighted costs.
- Route distance and route cost.
- Lane snapping.
- Route geometry sampling.
- Roundabout arc sampling.

This means `python/route_engine.py` demonstrates the AI/search logic in Python, while the JavaScript files keep the browser UI usable.

## Important JavaScript Files

### `app.js`

This is the UI controller.

Responsibilities:

- Reads DOM elements such as the canvas, traffic dropdown, buttons, and status text.
- Stores route state in the `state` object.
- Converts mouse clicks into canvas coordinates.
- Places start and end pins.
- Calls route engine functions.
- Starts and controls animation progress.
- Updates UI messages and button states.

Helpful functions:

- `canvasPoint(clientX, clientY)`: converts screen coordinates into canvas coordinates.
- `clearRouteResults()`: clears route paths, cost, distance, cache, and animation progress.
- `clearPinSelection()`: clears both pins and route data.
- `cachedPathToPoints(path)`: avoids recalculating sampled route geometry every frame.
- `calculateRoutes(shouldAnimate)`: finds possible routes and best route.
- `animateRoute()`: updates progress values using `requestAnimationFrame`.

### `src/map-data.js`

This file contains the map definition.

Data types:

- `rawNodes`: intersections/landmarks with ids like `A`, `B`, `C`.
- `rawRoads`: road connections between nodes.
- `rawRoundabouts`: roundabout positions and radius values.

Each road has:

```js
["A", "B", traffic, "Road Name", "roadType"]
```

Road type affects visual width:

- `highway`
- `primary`
- `secondary`
- `local`

### `src/route-engine.js`

This is the browser route engine.

Responsibilities:

- Expands raw map coordinates for a larger visible canvas.
- Builds an adjacency list graph from roads.
- Applies traffic modes.
- Runs A*.
- Finds possible paths.
- Snaps clicked points to the nearest lane.
- Converts node paths into lane-following route points.
- Handles roundabout curve sampling.

Core functions:

- `aStar(start, goal)`: finds the lowest-cost path using traffic-weighted road costs.
- `findAllPaths(start, goal)`: finds multiple possible paths without revisiting nodes.
- `applyTrafficMode(mode)`: changes traffic values and recalculates costs.
- `nearestRoadPoint(point, excludedId)`: snaps a click to a lane center.
- `pathToPoints(path, startPin, endPin, startPoint, endPoint)`: creates smooth drawable points for animation.

### `src/map-renderer.js`

This file owns canvas drawing only.

Responsibilities:

- Draws the white map background.
- Draws road bodies, lane centers, traffic colors, road names, arrows, and roundabouts.
- Draws start/end/hover pins.
- Draws partial route lines based on animation progress.
- Draws the moving route marker.

Important functions:

- `drawTrafficRoads()`: draws all road layers and lane arrows.
- `drawPath(points, progress, color, width, alpha)`: draws only part of a route for animation.
- `pointOnPath(points, progress)`: calculates the moving marker position.
- `draw(state, getPathPoints)`: public render function used by `app.js`.

## Python Utility Files

### `python/map_data.py`

This is the Python version of the map data. It mirrors the JavaScript map data so Python tests and algorithm utilities can run independently.

### `python/route_engine.py`

This is the Python route engine.

Main class:

```python
RouteEngine
```

Main methods:

- `a_star(start, goal)`
- `find_all_paths(start, goal)`
- `path_cost(path)`
- `path_distance(path)`
- `nearest_road_point(point, excluded_id=None)`
- `path_to_points(path, start_pin, end_pin, start_point, end_point)`
- `routes(start, end)`

Module-level utility functions:

- `a_star(start, goal, traffic_mode="normal")`
- `find_all_paths(start, goal, traffic_mode="normal")`
- `calculate_routes(start, end, traffic_mode="normal")`
- `nearest_road_point(point, excluded_id=None, traffic_mode="normal")`
- `path_to_points(...)`
- `route_cost(path, traffic_mode="normal")`
- `route_distance(path, traffic_mode="normal")`

These functions make the Python code easy to demonstrate without needing to instantiate the class manually.

## A* Algorithm Explanation

A* searches for the cheapest route from a start node to a goal node.

In this project:

- Each road is an edge in the graph.
- Each edge has a physical distance.
- Each edge has a traffic multiplier.
- The actual edge cost is:

```text
cost = distance * traffic
```

A* keeps:

- `gScore`: actual known cost from start to current node.
- `heuristic`: estimated remaining distance to the goal.
- priority value: `gScore + heuristic`.

The heuristic uses straight-line distance between nodes. This guides the search toward the destination without ignoring traffic cost.

## Traffic Modes

Traffic modes modify road multipliers:

- `normal`: original traffic values.
- `light`: lower traffic values.
- `heavy`: higher traffic values.
- `rush`: varied traffic pattern across roads.

Changing traffic recalculates route costs, so the A* best path may change.

## Lane Mechanism

Each road is treated as two directed lanes:

- One lane goes from `from` to `to`.
- The opposite lane goes from `to` to `from`.

When the user clicks:

1. The nearest road is found.
2. Both lane centers are checked.
3. The click snaps to the closest lane.
4. The selected lane determines route direction.

This prevents route animation from travelling in the middle of the road or against lane direction.

## Roundabout Handling

Roundabouts are drawn as circular intersections. Route geometry avoids cutting through the center by trimming road segments near roundabout nodes and sampling a curved arc around the circle.

Important idea:

- Straight roads stop before the roundabout center.
- A curved arc connects the incoming lane to the outgoing lane.

## Animation Logic

Animation is controlled by two progress values in `app.js`:

- `allRouteProgress`: reveals all possible routes first.
- `bestRouteProgress`: reveals the final A* route afterward.

`map-renderer.js` draws only a percentage of route segments according to those progress values.

## Tests

Run JavaScript tests:

```bash
node tests/route-tests.js
```

Run Python tests:

```bash
python tests/python_route_tests.py
```

The tests check:

- A* returns a start-to-end route.
- Possible paths exist.
- Cost is positive.
- Lane snapping returns a directed lane.
- Route geometry contains multiple drawable points.
- Traffic changes do not break route search.

## Evaluation Talking Points

- The graph uses nodes and weighted edges.
- Traffic is implemented as a multiplier on edge distance.
- A* is used for the most efficient route.
- `findAllPaths` is used to display alternate possible routes.
- Pins snap to lanes, not arbitrary canvas points.
- Route animation follows sampled lane geometry.
- Roundabouts use curved sampled points.
- JavaScript is required for browser canvas and DOM work.
- Python contains the convertible algorithmic utilities required by the project.
