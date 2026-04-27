const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const listeners = {};
const context = {
  console,
  performance,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setTimeout,
  document: {
    getElementById(id) {
      if (id === "mapCanvas") {
        return {
          width: 1800,
          height: 1100,
          getContext: () => new Proxy({}, { get: () => () => {} }),
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 1800, height: 1100 }),
          addEventListener: (event, handler) => {
            listeners[event] = handler;
          }
        };
      }

      if (id === "trafficSelect") {
        return {
          value: "normal",
          selectedIndex: 0,
          options: [{ text: "Normal" }],
          addEventListener: () => {}
        };
      }

      return {
        textContent: "",
        disabled: false,
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        addEventListener: () => {}
      };
    }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js", "utf8"), context);

assert.deepStrictEqual(context.aStar("A", "X").at(0), "A");
assert.deepStrictEqual(context.aStar("A", "X").at(-1), "X");

const roadPick = context.nearestRoadPoint({ x: 170, y: 165 });
assert.ok(roadPick.distance < 40, "road pick should snap to a nearby lane");
assert.notStrictEqual(roadPick.laneStartNode, roadPick.laneEndNode, "lane should have direction");

listeners.click({ clientX: 170, clientY: 165 });
listeners.click({ clientX: 1050, clientY: 410 });

const best = context.aStar("A", "X");
assert.ok(best.length > 1, "A* should return a multi-node route");

console.log("route-tests passed");
