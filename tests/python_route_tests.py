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

    heavy = RouteEngine("heavy")
    heavy_best = heavy.a_star("A", "X")
    assert len(heavy_best) > 1
    assert heavy.path_cost(heavy_best) > 0
    print("python_route_tests passed")


if __name__ == "__main__":
    run()
