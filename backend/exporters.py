import math
import time
import base64
from typing import Dict, List, Any, Optional

from vla_service import DIRECTION_PRESETS


def compute_polygon_from_keypoints(topology: Dict[str, Any]) -> List[List[float]]:
    rg = topology.get("room_geometry") or {}
    existing_poly = rg.get("polygon_points")
    if isinstance(existing_poly, list) and len(existing_poly) >= 3:
        valid = []
        for pt in existing_poly:
            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                try:
                    x = max(4.0, min(96.0, float(pt[0])))
                    y = max(4.0, min(96.0, float(pt[1])))
                    valid.append([round(x, 1), round(y, 1)])
                except Exception:
                    pass
        if len(valid) >= 3:
            return valid

    kps = topology.get("seam_keypoints") or []
    if len(kps) >= 3:
        sorted_kps = sorted(kps, key=lambda k: float(k.get("bearing_degrees", 0.0)) % 360.0)
        dists = [float(k.get("estimated_distance_m") or 4.0) for k in sorted_kps]
        max_dist = max(max(dists), 3.0)
        pts: List[List[float]] = []
        for kp in sorted_kps:
            deg = float(kp.get("bearing_degrees", 0.0)) % 360.0
            dist = float(kp.get("estimated_distance_m") or 4.0)
            radius_pct = 26.0 + min(18.0, (dist / max_dist) * 18.0)
            rad = math.radians(deg - 90.0)
            x = max(6.0, min(94.0, 50.0 + radius_pct * math.cos(rad)))
            y = max(6.0, min(94.0, 50.0 + radius_pct * math.sin(rad)))
            pts.append([round(x, 1), round(y, 1)])
        return pts

    return [[10.0, 10.0], [90.0, 10.0], [90.0, 90.0], [10.0, 90.0]]


def derive_default_locations(topology: Dict[str, Any]) -> List[Dict[str, Any]]:
    locations: List[Dict[str, Any]] = []
    seen = set()

    kps_by_id = {
        kp.get("keypoint_id"): kp
        for kp in (topology.get("seam_keypoints") or [])
        if kp.get("keypoint_id")
    }

    items: List[Dict[str, Any]] = []
    for a in topology.get("static_anchors") or []:
        items.append({
            "id": a.get("anchor_id", ""),
            "bbox": a.get("bbox"),
            "indices": a.get("image_indices") or [],
            "kps": a.get("associated_keypoints") or [],
            "is_static": True,
        })
    for d in topology.get("dynamic_objects") or []:
        rel_kp = d.get("relative_to_keypoint")
        items.append({
            "id": d.get("object_id", ""),
            "bbox": d.get("bbox"),
            "indices": d.get("image_indices") or [],
            "kps": [rel_kp] if rel_kp else [],
            "is_static": False,
        })

    for idx, item in enumerate(items):
        oid = item["id"]
        if not oid or oid in seen:
            continue
        seen.add(oid)

        bbox = item.get("bbox")
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            try:
                ymin, xmin, ymax, xmax = [float(v) for v in bbox]
                ymin = max(2.0, min(90.0, min(ymin, ymax)))
                xmin = max(2.0, min(90.0, min(xmin, xmax)))
                ymax = max(ymin + 5.0, min(98.0, max(ymin, ymax)))
                xmax = max(xmin + 5.0, min(98.0, max(xmin, xmax)))
                locations.append({
                    "object_id": oid,
                    "ymin": round(ymin, 1),
                    "xmin": round(xmin, 1),
                    "ymax": round(ymax, 1),
                    "xmax": round(xmax, 1),
                })
                continue
            except Exception:
                pass

        kp_list = [kps_by_id[k] for k in item["kps"] if k in kps_by_id]
        if kp_list:
            deg = float(kp_list[0].get("bearing_degrees", 0.0)) % 360.0
            rad = math.radians(deg - 90.0)
            ring = 32.0 if item["is_static"] else 22.0
            cx = 50.0 + ring * math.cos(rad)
            cy = 50.0 + ring * math.sin(rad)
            half_w = 9.0 if item["is_static"] else 6.0
            half_h = 7.5 if item["is_static"] else 5.5
            xmin = max(4.0, min(88.0, cx - half_w))
            ymin = max(4.0, min(88.0, cy - half_h))
            xmax = min(96.0, xmin + half_w * 2)
            ymax = min(96.0, ymin + half_h * 2)
            locations.append({
                "object_id": oid,
                "ymin": round(ymin, 1),
                "xmin": round(xmin, 1),
                "ymax": round(ymax, 1),
                "xmax": round(xmax, 1),
            })
            continue

        indices = item.get("indices") or []
        primary_idx = indices[0] if indices else (idx % 8)
        preset = DIRECTION_PRESETS.get(primary_idx % 8, (40, 40, 60, 60))
        locations.append({
            "object_id": oid,
            "ymin": float(preset[0]),
            "xmin": float(preset[1]),
            "ymax": float(preset[2]),
            "xmax": float(preset[3]),
        })

    return locations


def generate_parametric_svg(topology: Dict[str, Any], locations: Optional[List[Dict[str, Any]]] = None) -> str:
    W, H = 1600, 900
    locs = locations if locations else derive_default_locations(topology)
    poly = compute_polygon_from_keypoints(topology)
    node_name = topology.get("node_name", "Spatial Node")
    rg = topology.get("room_geometry") or {}
    dims = rg.get("approx_dimensions") or "10.0m x 10.0m"
    floor_mat = rg.get("flooring_material") or "Orthographic SLAM Surface"

    static_map = {a.get("anchor_id"): a for a in (topology.get("static_anchors") or [])}
    loc_map = {l.get("object_id"): l for l in locs if l.get("object_id")}

    poly_svg_pts = " ".join(f"{pt[0] * 16.0:.1f},{pt[1] * 9.0:.1f}" for pt in poly)

    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
        '<defs>',
        '  <pattern id="cadSubGrid" width="40" height="40" patternUnits="userSpaceOnUse">',
        '    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" stroke-width="1"/>',
        '  </pattern>',
        '  <pattern id="cadMainGrid" width="160" height="90" patternUnits="userSpaceOnUse">',
        '    <rect width="160" height="90" fill="url(#cadSubGrid)"/>',
        '    <path d="M 160 0 L 0 0 0 90" fill="none" stroke="#1e293b" stroke-width="1.5"/>',
        '  </pattern>',
        '  <pattern id="floorTile" width="80" height="80" patternUnits="userSpaceOnUse">',
        '    <rect width="80" height="80" fill="#1e293b"/>',
        '    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#334155" stroke-width="1" opacity="0.55"/>',
        '  </pattern>',
        '</defs>',
        f'<rect width="{W}" height="{H}" fill="#020617"/>',
        f'<rect width="{W}" height="{H}" fill="url(#cadMainGrid)"/>',
        f'<polygon points="{poly_svg_pts}" fill="url(#floorTile)" stroke="#0f172a" stroke-width="26" stroke-linejoin="round"/>',
        f'<polygon points="{poly_svg_pts}" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linejoin="round"/>',
        '<circle cx="800" cy="450" r="90" fill="none" stroke="#00ff9d" stroke-width="1" stroke-dasharray="6,6" opacity="0.35"/>',
        '<line x1="760" y1="450" x2="840" y2="450" stroke="#00ff9d" stroke-width="1.5" opacity="0.6"/>',
        '<line x1="800" y1="410" x2="800" y2="490" stroke="#00ff9d" stroke-width="1.5" opacity="0.6"/>',
        '<circle cx="800" cy="450" r="6" fill="#00ff9d"/>',
    ]

    for rel in topology.get("spatial_relations") or []:
        src = loc_map.get(rel.get("source"))
        tgt = loc_map.get(rel.get("target"))
        if src and tgt:
            sx = ((src["xmin"] + src["xmax"]) / 2.0) * 16.0
            sy = ((src["ymin"] + src["ymax"]) / 2.0) * 9.0
            tx = ((tgt["xmin"] + tgt["xmax"]) / 2.0) * 16.0
            ty = ((tgt["ymin"] + tgt["ymax"]) / 2.0) * 9.0
            svg_lines.append(
                f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" '
                f'stroke="#38bdf8" stroke-width="2" stroke-dasharray="6,6" opacity="0.55"/>'
            )

    for loc in locs:
        oid = loc.get("object_id", "item")
        x = float(loc.get("xmin", 40.0)) * 16.0
        y = float(loc.get("ymin", 40.0)) * 9.0
        w = max(48.0, (float(loc.get("xmax", 50.0)) - float(loc.get("xmin", 40.0))) * 16.0)
        h = max(36.0, (float(loc.get("ymax", 50.0)) - float(loc.get("ymin", 40.0))) * 9.0)
        is_static = oid in static_map
        stroke = "#00ff9d" if is_static else "#f59e0b"
        fill = "#064e3b" if is_static else "#451a03"
        svg_lines.append(
            f'<g>'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="6" '
            f'fill="{fill}" fill-opacity="0.72" stroke="{stroke}" stroke-width="3"/>'
            f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x + w:.1f}" y2="{y + h:.1f}" stroke="{stroke}" stroke-width="1" opacity="0.3"/>'
            f'</g>'
        )

    for pt in poly:
        kx, ky = pt[0] * 16.0, pt[1] * 9.0
        svg_lines.append(
            f'<circle cx="{kx:.1f}" cy="{ky:.1f}" r="7" fill="#00ff9d" stroke="#020617" stroke-width="2.5"/>'
        )

    safe_title = str(node_name).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_dims = str(dims).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_mat = str(floor_mat).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    svg_lines.extend([
        '<rect x="24" y="20" width="520" height="58" rx="8" fill="#020617" fill-opacity="0.85" stroke="#1e293b" stroke-width="1.5"/>',
        f'<text x="40" y="44" fill="#00ff9d" font-family="monospace" font-size="16" font-weight="bold">CAD BLUEPRINT // {safe_title}</text>',
        f'<text x="40" y="65" fill="#94a3b8" font-family="monospace" font-size="12">SCALE: {safe_dims} | SURFACE: {safe_mat[:48]}</text>',
        '</svg>',
    ])
    return "\n".join(svg_lines)


def generate_parametric_svg_data_url(topology: Dict[str, Any], locations: Optional[List[Dict[str, Any]]] = None) -> str:
    svg_xml = generate_parametric_svg(topology, locations)
    b64 = base64.b64encode(svg_xml.encode("utf-8")).decode("utf-8")
    return f"data:image/svg+xml;base64,{b64}"


def generate_dxf_blueprint(topology: Dict[str, Any], locations: Optional[List[Dict[str, Any]]] = None) -> str:
    locs = locations if locations else derive_default_locations(topology)
    poly = compute_polygon_from_keypoints(topology)
    static_ids = {a.get("anchor_id") for a in (topology.get("static_anchors") or [])}

    lines = [
        "0", "SECTION",
        "2", "HEADER",
        "9", "$ACADVER",
        "1", "AC1009",
        "0", "ENDSEC",
        "0", "SECTION",
        "2", "ENTITIES",
    ]

    if len(poly) >= 2:
        for i in range(len(poly)):
            p1 = poly[i]
            p2 = poly[(i + 1) % len(poly)]
            x1, y1 = round(p1[0] * 0.1, 3), round((100.0 - p1[1]) * 0.1, 3)
            x2, y2 = round(p2[0] * 0.1, 3), round((100.0 - p2[1]) * 0.1, 3)
            lines.extend([
                "0", "LINE",
                "8", "WALLS",
                "10", str(x1), "20", str(y1), "30", "0.0",
                "11", str(x2), "21", str(y2), "31", "2.8",
            ])

    for loc in locs:
        oid = loc.get("object_id", "ENTITY")
        layer = "STATIC_ANCHORS" if oid in static_ids else "DYNAMIC_OBJECTS"
        x1 = round(float(loc.get("xmin", 0.0)) * 0.1, 3)
        x2 = round(float(loc.get("xmax", 0.0)) * 0.1, 3)
        y1 = round((100.0 - float(loc.get("ymax", 0.0))) * 0.1, 3)
        y2 = round((100.0 - float(loc.get("ymin", 0.0))) * 0.1, 3)
        corners = [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]
        for i in range(4):
            c1, c2 = corners[i], corners[(i + 1) % 4]
            lines.extend([
                "0", "LINE",
                "8", layer,
                "10", str(c1[0]), "20", str(c1[1]), "30", "0.0",
                "11", str(c2[0]), "21", str(c2[1]), "31", "0.0",
            ])
        lines.extend([
            "0", "TEXT",
            "8", "LABELS",
            "10", str(round((x1 + x2) / 2.0, 3)),
            "20", str(round((y1 + y2) / 2.0, 3)),
            "30", "0.0",
            "40", "0.18",
            "1", str(oid),
        ])

    lines.extend(["0", "ENDSEC", "0", "EOF"])
    return "\n".join(lines) + "\n"


def generate_ros2_mission(node_name: str, topology: Dict[str, Any], locations: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    locs = locations if locations else derive_default_locations(topology)
    waypoints = []
    now_sec = int(time.time())
    for loc in locs:
        cx = (float(loc.get("xmin", 50.0)) + float(loc.get("xmax", 50.0))) / 2.0
        cy = (float(loc.get("ymin", 50.0)) + float(loc.get("ymax", 50.0))) / 2.0
        mx = round(cx * 0.1, 3)
        my = round(cy * 0.1, 3)
        yaw = math.atan2(my - 5.0, mx - 5.0)
        qz = round(math.sin(yaw / 2.0), 4)
        qw = round(math.cos(yaw / 2.0), 4)
        waypoints.append({
            "object_id": loc.get("object_id"),
            "header": {"frame_id": "map", "stamp": {"sec": now_sec, "nanosec": 0}},
            "pose": {
                "position": {"x": mx, "y": my, "z": 0.0},
                "orientation": {"x": 0.0, "y": 0.0, "z": qz, "w": qw},
            },
        })
    return {
        "action": "Nav2_FollowWaypoints",
        "frame_id": "map",
        "node_name": node_name,
        "waypoints_count": len(waypoints),
        "waypoints": waypoints,
    }
