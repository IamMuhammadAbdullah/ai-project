# A* Traffic Route Planner

This project implements the route-planning requirements from `AI_ProjectProposal.pdf` as an interactive browser application.

## Features

- Clean white map canvas with labeled roads.
- Expanded map layout with extra-wide two-lane roads, lane direction arrows, varied road types, roundabouts, and U-turns.
- Traffic constraints on every road segment using low, medium, and heavy traffic weights.
- Select Pin mode lets you place a start pin and destination pin directly on the map. Pins must be placed on roads and snap to the nearest lane for accurate route traversal.
- Remove Pins clears the current selection.
- Start begins the route animation after both pins are selected.
- Possible routes reveal at the same drawing speed as the final route.
- The most efficient route is calculated with the A* algorithm using traffic-weighted cost.
- The best route has unique highlighting and an animated travel marker from start to destination.
- Route transitions stay on road geometry, including curved movement through roundabouts.
- Clicking again after a route is complete starts a new route selection.

## Run

Open `index.html` in a browser. No installation is required.
