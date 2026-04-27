# A* Traffic Route Planner

This project implements the route-planning requirements from `AI_ProjectProposal.pdf` as an interactive browser application.

## Features

- Clean white map canvas with labeled roads.
- Expanded map layout with extra-wide two-lane roads, lane direction arrows, varied road types, and roundabouts.
- Roads are represented as directed lane edges. Start pins continue to the downstream lane node, destination pins are reached from the upstream lane node, and route traversal follows the lane direction shown on the map.
- Traffic constraints on every road segment using low, medium, and heavy traffic weights.
- Traffic can be changed from Normal, Light, Heavy, and Rush hour modes; route costs and A* selection recalculate after changes.
- Click directly on roads to place a start pin and destination pin. Pins must be placed on roads and snap to the nearest lane for accurate route traversal.
- Remove Pins clears the current selection.
- Start begins the route animation after both pins are selected.
- Possible routes reveal at the same drawing speed as the final route.
- The most efficient route is calculated with the A* algorithm using traffic-weighted cost.
- The best route has unique highlighting and an animated travel marker from start to destination.
- Route transitions stay on road geometry, including curved movement through roundabouts.
- Clicking again after a route is complete starts a new route selection.

## Run

Open `index.html` with your editor's browser preview.

The browser UI runs through JavaScript because DOM and canvas interaction happen in the browser. The convertible AI/route logic is also provided as reusable Python utilities in `python/route_engine.py`: A*, all-path search, traffic-weighted costs, lane snapping, and route geometry helpers.

## Structure

- `python/` contains Python utility functions for A*, route search, snapping, traffic cost, and route geometry.
- `src/` contains browser-side map data, canvas rendering helpers, and the browser script modules used by `index.html`.
- `app.js` contains UI state, event handling, and animation orchestration.
- `tests/` contains Python and JavaScript route checks.

## Test

Run `python tests/python_route_tests.py` to check the Python route engine.
Run `node tests/route-tests.js` to check the JavaScript lane snapping and route geometry used by the browser.

## Evaluation Guide

Read `CODEBASE_GUIDE.md` for a full explanation of the file structure, A* flow, lane snapping, traffic weighting, animation, and the JavaScript/Python split.
