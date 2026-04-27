import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from python.route_engine import RouteEngine


def run():
    engine = RouteEngine()
    best = engine.a_star("A", "X")
    assert best[0] == "A"
    assert best[-1] == "X"
    assert engine.path_cost(best) > 0
    assert engine.find_all_paths("A", "X")

    snap = engine.nearest_road_point({"x": 170, "y": 165})
    assert snap["edge"]
    assert snap["laneStartNode"] != snap["laneEndNode"]
    assert snap["distance"] < 60

    route_points = engine.path_to_points(best, snap, None, snap["point"], engine.node_by_id["X"])
    assert len(route_points) > len(best)
    assert abs(route_points[0]["x"] - snap["point"]["x"]) < 1
    assert all("x" in point and "y" in point for point in route_points)

    heavy = RouteEngine("heavy")
    heavy_best = heavy.a_star("A", "X")
    assert len(heavy_best) > 1
    assert heavy.path_cost(heavy_best) > 0
    print("python_route_tests passed")


if __name__ == "__main__":
    run()
