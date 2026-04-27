import heapq
import math
import time
from .map_data import RAW_NODES, RAW_ROADS


def expand_point(point):
    return {
        **point,
        "x": round(point["x"] * 1.16 + 34),
        "y": round(point["y"] * 1.12 + 28),
    }


def edge_key(a, b):
    return "-".join(sorted((a, b)))


def traffic_for_mode(base_traffic, index, mode):
    if mode == "light":
        return max(1, base_traffic * 0.72)
    if mode == "heavy":
        return min(2.8, base_traffic * 1.45)
    if mode == "rush":
        wave = 0.86 + ((index * 37) % 80) / 50
        return min(2.9, max(1, base_traffic * wave))
    return base_traffic


class RouteEngine:
    def __init__(self, traffic_mode="normal"):
        self.nodes = [expand_point(node) for node in RAW_NODES]
        self.node_by_id = {node["id"]: node for node in self.nodes}
        self.adjacency = {node["id"]: [] for node in self.nodes}
        self.edge_map = {}
        self.traffic_mode = traffic_mode
        self._build_graph()

    def distance(self, a, b):
        from_node = self.node_by_id[a]
        to_node = self.node_by_id[b]
        return math.hypot(from_node["x"] - to_node["x"], from_node["y"] - to_node["y"]) / 18

    def _build_graph(self):
        self.adjacency = {node["id"]: [] for node in self.nodes}
        self.edge_map = {}
        for index, (from_id, to_id, base_traffic, name, road_type) in enumerate(RAW_ROADS):
            distance = self.distance(from_id, to_id)
            traffic = traffic_for_mode(base_traffic, index, self.traffic_mode)
            edge = {
                "from": from_id,
                "to": to_id,
                "baseTraffic": base_traffic,
                "traffic": traffic,
                "name": name,
                "type": road_type,
                "distance": distance,
                "cost": distance * traffic,
            }
            self.edge_map[edge_key(from_id, to_id)] = edge
            self.adjacency[from_id].append({"id": to_id, "cost": edge["cost"], "distance": distance, "traffic": traffic})
            self.adjacency[to_id].append({"id": from_id, "cost": edge["cost"], "distance": distance, "traffic": traffic})

    def heuristic(self, start, goal):
        return self.distance(start, goal)

    def a_star(self, start, goal):
        open_heap = [(self.heuristic(start, goal), start)]
        came_from = {}
        g_score = {node["id"]: math.inf for node in self.nodes}
        g_score[start] = 0
        visited = set()

        while open_heap:
            _, current = heapq.heappop(open_heap)
            if current in visited:
                continue
            if current == goal:
                return self.reconstruct_path(came_from, current)
            visited.add(current)

            for neighbor in self.adjacency[current]:
                tentative = g_score[current] + neighbor["cost"]
                if tentative < g_score[neighbor["id"]]:
                    came_from[neighbor["id"]] = current
                    g_score[neighbor["id"]] = tentative
                    heapq.heappush(open_heap, (tentative + self.heuristic(neighbor["id"], goal), neighbor["id"]))

        return []

    @staticmethod
    def reconstruct_path(came_from, current):
        path = [current]
        while current in came_from:
            current = came_from[current]
            path.insert(0, current)
        return path

    def find_all_paths(self, start, goal, max_paths=14, max_depth=9):
        paths = []
        stack = [(start, [start], 0)]
        started_at = time.perf_counter()
        while stack and len(paths) < max_paths:
            if (time.perf_counter() - started_at) * 1000 > 45:
                break
            current, path, cost = stack.pop()
            if current == goal:
                paths.append({"path": path, "cost": cost})
                continue
            if len(path) >= max_depth:
                continue
            neighbors = [neighbor for neighbor in self.adjacency[current] if neighbor["id"] not in path]
            neighbors.sort(key=lambda n: cost + n["cost"] + self.heuristic(n["id"], goal), reverse=True)
            for neighbor in neighbors:
                stack.append((neighbor["id"], path + [neighbor["id"]], cost + neighbor["cost"]))
        return sorted(paths, key=lambda item: item["cost"])

    def path_cost(self, path):
        return sum(self.edge_map[edge_key(path[i], path[i + 1])]["cost"] for i in range(len(path) - 1))

    def path_distance(self, path):
        return sum(self.edge_map[edge_key(path[i], path[i + 1])]["distance"] for i in range(len(path) - 1))

    def routes(self, start, end):
        best_path = self.a_star(start, end)
        possible_paths = self.find_all_paths(start, end)
        return {
            "bestPath": best_path,
            "possiblePaths": possible_paths,
            "cost": self.path_cost(best_path) if best_path else 0,
            "distance": self.path_distance(best_path) if best_path else 0,
            "trafficMode": self.traffic_mode,
            "source": "python",
        }


def calculate_routes(start, end, traffic_mode="normal"):
    return RouteEngine(traffic_mode).routes(start, end)
