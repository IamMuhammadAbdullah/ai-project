import heapq
import math
import time
from .map_data import RAW_NODES, RAW_ROADS, RAW_ROUNDABOUTS


ROAD_WIDTHS = {"highway": 52, "primary": 44, "secondary": 35, "local": 28}


def expand_point(point):
    return {
        **point,
        "x": round(point["x"] * 1.16 + 34),
        "y": round(point["y"] * 1.12 + 28),
    }


def edge_key(a, b):
    return "-".join(sorted((a, b)))


def road_width(road_type):
    return ROAD_WIDTHS.get(road_type, 30)


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
        self.roundabouts = [
            {**roundabout, **expand_point(roundabout), "r": round(roundabout["r"] * 1.2)}
            for roundabout in RAW_ROUNDABOUTS
        ]
        self.node_by_id = {node["id"]: node for node in self.nodes}
        self.adjacency = {node["id"]: [] for node in self.nodes}
        self.edge_map = {}
        self.roundabout_by_node = {}
        self.traffic_mode = traffic_mode
        self._build_graph()
        for roundabout in self.roundabouts:
            self.roundabout_by_node[self.nearest_node(roundabout)["id"]] = roundabout

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
            self.adjacency[from_id].append({
                "id": to_id,
                "from": from_id,
                "to": to_id,
                "laneSide": -1,
                "cost": edge["cost"],
                "distance": distance,
                "traffic": traffic,
            })
            self.adjacency[to_id].append({
                "id": from_id,
                "from": to_id,
                "to": from_id,
                "laneSide": 1,
                "cost": edge["cost"],
                "distance": distance,
                "traffic": traffic,
            })

    def nearest_node(self, point, excluded_id=None):
        nearest = None
        nearest_distance = math.inf
        for node in self.nodes:
            if node["id"] == excluded_id:
                continue
            current_distance = math.hypot(node["x"] - point["x"], node["y"] - point["y"])
            if current_distance < nearest_distance:
                nearest = node
                nearest_distance = current_distance
        return nearest

    def directed_lane_side(self, from_id, to_id):
        edge = self.edge_map.get(edge_key(from_id, to_id))
        return -1 if edge and edge["from"] == from_id and edge["to"] == to_id else 1

    def lane_point_on_edge(self, edge, t, lane_side):
        from_node = self.node_by_id[edge["from"]]
        to_node = self.node_by_id[edge["to"]]
        dx = to_node["x"] - from_node["x"]
        dy = to_node["y"] - from_node["y"]
        length = math.hypot(dx, dy) or 1
        nx = -dy / length
        ny = dx / length
        lane_offset = max(7, road_width(edge["type"]) * 0.24)
        return {
            "x": from_node["x"] + dx * t + nx * lane_offset * lane_side,
            "y": from_node["y"] + dy * t + ny * lane_offset * lane_side,
        }

    @staticmethod
    def travel_t_for_node(edge, node_id):
        return 0 if edge["from"] == node_id else 1

    def roundabout_trimmed_t(self, edge, node_id):
        roundabout = self.roundabout_by_node.get(node_id)
        if not roundabout:
            return self.travel_t_for_node(edge, node_id)
        from_node = self.node_by_id[edge["from"]]
        to_node = self.node_by_id[edge["to"]]
        length = math.hypot(to_node["x"] - from_node["x"], to_node["y"] - from_node["y"]) or 1
        trim = min(0.35, (roundabout["r"] + road_width(edge["type"]) * 0.08) / length)
        return trim if edge["from"] == node_id else 1 - trim

    def lane_point_for_directed_node(self, node_id, from_id, to_id):
        edge = self.edge_map.get(edge_key(from_id, to_id))
        if not edge:
            return self.node_by_id[node_id]
        return self.lane_point_on_edge(
            edge,
            self.roundabout_trimmed_t(edge, node_id),
            self.directed_lane_side(from_id, to_id),
        )

    def sample_directed_edge(self, from_id, to_id, start_t=None, end_t=None):
        edge = self.edge_map.get(edge_key(from_id, to_id))
        if not edge:
            return []
        from_t = self.roundabout_trimmed_t(edge, from_id) if start_t is None else start_t
        to_t = self.roundabout_trimmed_t(edge, to_id) if end_t is None else end_t
        steps = max(4, math.ceil(abs(to_t - from_t) * edge["distance"] / 2.4))
        return [
            self.lane_point_on_edge(
                edge,
                from_t + (to_t - from_t) * (index / steps),
                self.directed_lane_side(from_id, to_id),
            )
            for index in range(steps + 1)
        ]

    def t_for_point_on_edge(self, point, edge):
        from_node = self.node_by_id[edge["from"]]
        to_node = self.node_by_id[edge["to"]]
        dx = to_node["x"] - from_node["x"]
        dy = to_node["y"] - from_node["y"]
        denominator = dx * dx + dy * dy or 1
        return max(0, min(1, ((point["x"] - from_node["x"]) * dx + (point["y"] - from_node["y"]) * dy) / denominator))

    def nearest_road_point(self, point, excluded_id=None):
        nearest = {
            "point": point,
            "graphNode": self.nearest_node(point, excluded_id)["id"],
            "laneStartNode": None,
            "laneEndNode": None,
            "laneT": 0,
            "distance": math.inf,
            "edge": None,
            "laneSide": 1,
        }
        for edge in self.edge_map.values():
            from_node = self.node_by_id[edge["from"]]
            to_node = self.node_by_id[edge["to"]]
            dx = to_node["x"] - from_node["x"]
            dy = to_node["y"] - from_node["y"]
            length_squared = dx * dx + dy * dy or 1
            t = max(0, min(1, ((point["x"] - from_node["x"]) * dx + (point["y"] - from_node["y"]) * dy) / length_squared))
            candidates = []
            for lane_side in (-1, 1):
                lane_point = self.lane_point_on_edge(edge, t, lane_side)
                candidates.append({
                    "laneSide": lane_side,
                    "lanePoint": lane_point,
                    "distance": math.hypot(point["x"] - lane_point["x"], point["y"] - lane_point["y"]),
                })
            closest = candidates[0] if candidates[0]["distance"] <= candidates[1]["distance"] else candidates[1]
            lane_side = closest["laneSide"]
            lane_start_node = edge["from"] if lane_side == -1 else edge["to"]
            lane_end_node = edge["to"] if lane_side == -1 else edge["from"]
            graph_node = lane_end_node if lane_start_node == excluded_id else lane_start_node
            if closest["distance"] < nearest["distance"]:
                nearest = {
                    "point": closest["lanePoint"],
                    "graphNode": graph_node,
                    "laneStartNode": lane_start_node,
                    "laneEndNode": lane_end_node,
                    "laneT": t,
                    "distance": closest["distance"],
                    "edge": edge,
                    "laneSide": lane_side,
                }
        return nearest

    @staticmethod
    def angle_between_points(from_point, to_point):
        return math.atan2(to_point["y"] - from_point["y"], to_point["x"] - from_point["x"])

    @staticmethod
    def normalize_angle(angle):
        while angle < 0:
            angle += math.pi * 2
        while angle >= math.pi * 2:
            angle -= math.pi * 2
        return angle

    def sample_roundabout_arc(self, roundabout, entry_point, exit_point):
        start = self.normalize_angle(self.angle_between_points(roundabout, entry_point))
        end = self.normalize_angle(self.angle_between_points(roundabout, exit_point))
        delta = end - start
        if delta < 0:
            delta += math.pi * 2
        if delta > math.pi * 1.35:
            delta -= math.pi * 2
        steps = max(5, math.ceil(abs(delta) / (math.pi / 8)))
        return [
            {
                "x": roundabout["x"] + math.cos(start + delta * (index / steps)) * roundabout["r"],
                "y": roundabout["y"] + math.sin(start + delta * (index / steps)) * roundabout["r"],
            }
            for index in range(steps + 1)
        ]

    @staticmethod
    def same_point(a, b):
        return bool(a and b and math.hypot(a["x"] - b["x"], a["y"] - b["y"]) < 0.5)

    def push_point(self, points, point):
        if point and not self.same_point(points[-1] if points else None, point):
            points.append(point)

    def path_to_points(self, path, start_pin=None, end_pin=None, start_point=None, end_point=None):
        if not path:
            return []
        routed_points = []
        if start_pin and start_pin.get("edge"):
            self.push_point(routed_points, start_pin["point"])
            for point in self.sample_directed_edge(
                start_pin["laneStartNode"],
                start_pin["laneEndNode"],
                self.t_for_point_on_edge(start_point or start_pin["point"], start_pin["edge"]),
                None,
            ):
                self.push_point(routed_points, point)
        elif start_point:
            self.push_point(routed_points, start_point)

        for index, from_id in enumerate(path[:-1]):
            to_id = path[index + 1]
            previous_point = routed_points[-1] if routed_points else None
            next_start = self.lane_point_for_directed_node(from_id, from_id, to_id)
            roundabout = self.roundabout_by_node.get(from_id)
            if roundabout and previous_point and next_start and not self.same_point(previous_point, next_start):
                for point in self.sample_roundabout_arc(roundabout, previous_point, next_start):
                    self.push_point(routed_points, point)
            else:
                self.push_point(routed_points, next_start)
            for point in self.sample_directed_edge(from_id, to_id):
                self.push_point(routed_points, point)

        if end_pin and end_pin.get("edge"):
            final_node = path[-1]
            end_edge_start = self.lane_point_for_directed_node(final_node, end_pin["laneStartNode"], end_pin["laneEndNode"])
            roundabout = self.roundabout_by_node.get(final_node)
            if roundabout and routed_points and not self.same_point(routed_points[-1], end_edge_start):
                for point in self.sample_roundabout_arc(roundabout, routed_points[-1], end_edge_start):
                    self.push_point(routed_points, point)
            else:
                self.push_point(routed_points, end_edge_start)
            for point in self.sample_directed_edge(
                end_pin["laneStartNode"],
                end_pin["laneEndNode"],
                None,
                self.t_for_point_on_edge(end_point or end_pin["point"], end_pin["edge"]),
            ):
                self.push_point(routed_points, point)
        elif end_point:
            self.push_point(routed_points, end_point)

        return routed_points

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
