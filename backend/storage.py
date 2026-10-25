import os
import json
import time
import urllib.parse
import urllib.request
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import networkx as nx

from exporters import (
    compute_polygon_from_keypoints,
    derive_default_locations,
    generate_parametric_svg,
    generate_parametric_svg_data_url,
    generate_dxf_blueprint,
    generate_ros2_mission,
)

logger = logging.getLogger("spatial_os_backend.storage")

__all__ = [
    "TIER_CONFIG",
    "ADMIN_EMAILS",
    "is_admin_email",
    "WorkspaceStore",
    "compute_polygon_from_keypoints",
    "derive_default_locations",
    "generate_parametric_svg",
    "generate_parametric_svg_data_url",
    "generate_dxf_blueprint",
    "generate_ros2_mission",
]

DEFAULT_GOOGLE_CLIENT_ID = "551236665243-dpibfooc45gqd1u9b5d10gkc2m6bktj3.apps.googleusercontent.com"
OWNER_ADMIN_EMAIL = (os.environ.get("ADMIN_EMAIL") or "produsoup@gmail.com").strip().lower()

extra_admins = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}
ADMIN_EMAILS = {OWNER_ADMIN_EMAIL} | extra_admins

GCP_PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "gemini-gcp-511712"
FIRESTORE_COLLECTION = "spatial_os_users"
FIRESTORE_PAYMENTS_COLLECTION = "spatial_os_payments"

PLAN_PRICING: Dict[str, Dict[str, int]] = {
    "pro": {
        "monthly_krw": 65000,
        "annual_krw": 624000,
        "monthly_usd": 49,
        "annual_usd": 470,
    },
    "enterprise": {
        "monthly_krw": 390000,
        "annual_krw": 3744000,
        "monthly_usd": 299,
        "annual_usd": 2870,
    },
}


def is_admin_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.strip().lower() in ADMIN_EMAILS


_cached_gcp_token: Optional[str] = None
_gcp_token_expires_at: float = 0.0
_metadata_unavailable_until: float = 0.0


def _get_gcp_access_token() -> Optional[str]:
    global _cached_gcp_token, _gcp_token_expires_at, _metadata_unavailable_until
    env_token = os.environ.get("GCP_ACCESS_TOKEN")
    if env_token:
        return env_token
    now = time.time()
    if _cached_gcp_token and now < _gcp_token_expires_at:
        return _cached_gcp_token
    if now < _metadata_unavailable_until:
        return None
    req = urllib.request.Request(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        headers={"Metadata-Flavor": "Google"},
    )
    try:
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                token = data.get("access_token")
                expires_in = float(data.get("expires_in", 3600))
                if token:
                    _cached_gcp_token = token
                    _gcp_token_expires_at = now + max(60.0, expires_in - 60.0)
                return token
    except Exception:
        _metadata_unavailable_until = now + 300.0
        return None
    return None


def _sync_user_to_firestore(user: Dict[str, Any]) -> bool:
    token = _get_gcp_access_token()
    if not token:
        return False
    doc_id = urllib.parse.quote(user["email"].lower())
    url = (
        f"https://firestore.googleapis.com/v1/projects/{GCP_PROJECT_ID}"
        f"/databases/(default)/documents/{FIRESTORE_COLLECTION}/{doc_id}"
    )
    fields = {
        "email": {"stringValue": str(user.get("email", ""))},
        "name": {"stringValue": str(user.get("name", ""))},
        "avatarUrl": {"stringValue": str(user.get("avatarUrl") or "")},
        "role": {"stringValue": str(user.get("role", "user"))},
        "is_admin": {"booleanValue": bool(user.get("is_admin", False))},
        "workspace_id": {"stringValue": str(user.get("workspace_id", "default"))},
        "tier": {"stringValue": str(user.get("tier", "free"))},
        "login_count": {"integerValue": str(int(user.get("login_count", 1)))},
        "last_login": {"stringValue": str(user.get("last_login", ""))},
    }
    body = json.dumps({"fields": fields}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            return 200 <= resp.status < 300
    except Exception as e:
        logger.warning(f"Firestore user sync warning: {e}")
        return False


def _sync_payment_to_firestore(receipt: Dict[str, Any]) -> bool:
    token = _get_gcp_access_token()
    if not token:
        return False
    doc_id = urllib.parse.quote(str(receipt.get("order_id", f"ord_{int(time.time())}")))
    url = (
        f"https://firestore.googleapis.com/v1/projects/{GCP_PROJECT_ID}"
        f"/databases/(default)/documents/{FIRESTORE_PAYMENTS_COLLECTION}/{doc_id}"
    )
    fields = {
        "order_id": {"stringValue": str(receipt.get("order_id", ""))},
        "workspace_id": {"stringValue": str(receipt.get("workspace_id", "default"))},
        "user_email": {"stringValue": str(receipt.get("user_email", ""))},
        "tier": {"stringValue": str(receipt.get("tier", "pro"))},
        "plan_name": {"stringValue": str(receipt.get("plan_name", ""))},
        "billing_cycle": {"stringValue": str(receipt.get("billing_cycle", "monthly"))},
        "payment_method": {"stringValue": str(receipt.get("payment_method", "card"))},
        "amount_krw": {"integerValue": str(int(receipt.get("amount_krw", 0)))},
        "amount_usd": {"integerValue": str(int(receipt.get("amount_usd", 0)))},
        "amount_label": {"stringValue": str(receipt.get("amount_label", ""))},
        "status": {"stringValue": str(receipt.get("status", "paid"))},
        "paid_at": {"stringValue": str(receipt.get("paid_at", ""))},
    }
    body = json.dumps({"fields": fields}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            return 200 <= resp.status < 300
    except Exception as e:
        logger.warning(f"Firestore payment sync warning: {e}")
        return False


def _fetch_users_from_firestore() -> List[Dict[str, Any]]:
    token = _get_gcp_access_token()
    if not token:
        return []
    url = (
        f"https://firestore.googleapis.com/v1/projects/{GCP_PROJECT_ID}"
        f"/databases/(default)/documents/{FIRESTORE_COLLECTION}?pageSize=100"
    )
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            if resp.status != 200:
                return []
            payload = json.loads(resp.read().decode("utf-8"))
            docs = payload.get("documents") or []
            out: List[Dict[str, Any]] = []
            for d in docs:
                f = d.get("fields") or {}
                out.append({
                    "email": f.get("email", {}).get("stringValue", ""),
                    "name": f.get("name", {}).get("stringValue", ""),
                    "avatarUrl": f.get("avatarUrl", {}).get("stringValue", "") or None,
                    "role": f.get("role", {}).get("stringValue", "user"),
                    "is_admin": bool(f.get("is_admin", {}).get("booleanValue", False)),
                    "workspace_id": f.get("workspace_id", {}).get("stringValue", "default"),
                    "tier": f.get("tier", {}).get("stringValue", "free"),
                    "login_count": int(f.get("login_count", {}).get("integerValue", "1")),
                    "last_login": f.get("last_login", {}).get("stringValue", ""),
                })
            return out
    except Exception as e:
        logger.warning(f"Firestore list users warning: {e}")
        return []


TIER_CONFIG: Dict[str, Dict[str, Any]] = {
    "free": {
        "plan_name": "Starter B2C (Free)",
        "scans_limit": 10,
        "allowed_engines": ["gemini-3.8-flash"],
        "features": [
            "3.8 Flash Low-Latency VLA",
            "Photorealistic 2D Blueprint & CAD Mode",
            "3D Voxel Digital Twin",
            "JSON Topology Export",
        ],
    },
    "pro": {
        "plan_name": "Pro Space Architect (B2C / AEC)",
        "scans_limit": 50,
        "allowed_engines": ["gemini-3.8-flash", "gemini-4-argon"],
        "features": [
            "v4 Argon Deep SLAM & Loop Closure",
            "Parametric CAD SVG & AutoCAD DXF Export",
            "Multi-Room Graph Stitching",
            "3D Voxel + Parametric Wall Twin",
        ],
    },
    "enterprise": {
        "plan_name": "Enterprise Robotics & Fleet API (B2B)",
        "scans_limit": 9999,
        "allowed_engines": ["gemini-3.8-flash", "gemini-4-argon"],
        "features": [
            "v4 Argon SLAM & Trajectory Planner",
            "ROS2 Nav2 FollowWaypoints Mission Dispatch",
            "Parametric CAD DXF / SVG / JSON Exports",
            "Multi-Room Autonomous Fleet Graph",
            "Unlimited Workspace Scans",
        ],
    },
}


class WorkspaceStore:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.environ.get(
            "SPATIAL_OS_DB_PATH",
            os.path.join(os.path.dirname(__file__), ".spatial_os.db"),
        )
        self.graphs: Dict[str, nx.DiGraph] = {}
        self.node_data: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self.node_locations: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
        self.node_images: Dict[str, Dict[str, List[Dict[str, str]]]] = {}
        self.node_map_images: Dict[str, Dict[str, str]] = {}
        self.node_parametric_svgs: Dict[str, Dict[str, str]] = {}
        self.workspaces: Dict[str, Dict[str, Any]] = {}
        self.users: Dict[str, Dict[str, Any]] = {}
        self.payments: List[Dict[str, Any]] = []
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        try:
            with self._connect() as conn:
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS workspaces ("
                    "workspace_id TEXT PRIMARY KEY, "
                    "tier TEXT NOT NULL DEFAULT 'free', "
                    "scans_used INTEGER NOT NULL DEFAULT 0, "
                    "updated_at REAL NOT NULL)"
                )
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS nodes ("
                    "workspace_id TEXT NOT NULL, "
                    "node_name TEXT NOT NULL, "
                    "topology_json TEXT NOT NULL, "
                    "locations_json TEXT NOT NULL, "
                    "map_image TEXT NOT NULL, "
                    "parametric_svg TEXT NOT NULL, "
                    "created_at REAL NOT NULL, "
                    "PRIMARY KEY (workspace_id, node_name))"
                )
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS edges ("
                    "workspace_id TEXT NOT NULL, "
                    "source TEXT NOT NULL, "
                    "target TEXT NOT NULL, "
                    "PRIMARY KEY (workspace_id, source, target))"
                )
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS users ("
                    "email TEXT PRIMARY KEY, "
                    "name TEXT NOT NULL, "
                    "avatar_url TEXT, "
                    "role TEXT NOT NULL DEFAULT 'user', "
                    "is_admin INTEGER NOT NULL DEFAULT 0, "
                    "workspace_id TEXT NOT NULL, "
                    "login_count INTEGER NOT NULL DEFAULT 1, "
                    "last_login TEXT NOT NULL)"
                )
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS payments ("
                    "order_id TEXT PRIMARY KEY, "
                    "workspace_id TEXT NOT NULL, "
                    "user_email TEXT NOT NULL, "
                    "tier TEXT NOT NULL, "
                    "plan_name TEXT NOT NULL, "
                    "billing_cycle TEXT NOT NULL, "
                    "payment_method TEXT NOT NULL, "
                    "amount_krw INTEGER NOT NULL, "
                    "amount_usd INTEGER NOT NULL, "
                    "amount_label TEXT NOT NULL, "
                    "status TEXT NOT NULL, "
                    "paid_at TEXT NOT NULL)"
                )
                rows = conn.execute(
                    "SELECT email, name, avatar_url, role, is_admin, workspace_id, login_count, last_login FROM users"
                ).fetchall()
                for email, name, avatar_url, role, is_admin_flag, ws_id, login_cnt, last_login in rows:
                    self.users[email.lower()] = {
                        "email": email,
                        "name": name,
                        "avatarUrl": avatar_url,
                        "role": role,
                        "is_admin": bool(is_admin_flag),
                        "workspace_id": ws_id,
                        "login_count": int(login_cnt),
                        "last_login": last_login,
                    }
                pay_rows = conn.execute(
                    "SELECT order_id, workspace_id, user_email, tier, plan_name, billing_cycle, "
                    "payment_method, amount_krw, amount_usd, amount_label, status, paid_at "
                    "FROM payments ORDER BY paid_at DESC"
                ).fetchall()
                for r in pay_rows:
                    self.payments.append({
                        "order_id": r[0],
                        "workspace_id": r[1],
                        "user_email": r[2],
                        "tier": r[3],
                        "plan_name": r[4],
                        "billing_cycle": r[5],
                        "payment_method": r[6],
                        "amount_krw": int(r[7]),
                        "amount_usd": int(r[8]),
                        "amount_label": r[9],
                        "status": r[10],
                        "paid_at": r[11],
                    })
                conn.commit()
        except Exception as e:
            logger.warning(f"SQLite initialization warning: {e}")

    def upsert_user(
        self,
        email: str,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        sync_firestore: bool = True,
    ) -> Dict[str, Any]:
        clean_email = email.strip()
        key = clean_email.lower()
        existing = self.users.get(key)
        admin_flag = is_admin_email(clean_email)
        role = "admin" if admin_flag else "user"
        ws_slug = "".join(c if c.isalnum() else "_" for c in key)[:48] or "default"

        self.ensure_workspace(ws_slug, default_tier="enterprise" if admin_flag else "free")
        if admin_flag:
            self.set_workspace_tier(ws_slug, "enterprise")

        login_count = (int(existing.get("login_count", 0)) + 1) if existing else 1
        display_name = (name or "").strip() or (existing.get("name") if existing else "") or clean_email.split("@")[0]
        now_iso = datetime.now(timezone.utc).isoformat()
        ws_info = self.get_workspace_info(ws_slug)

        record = {
            "email": clean_email,
            "name": display_name,
            "avatarUrl": avatar_url or (existing.get("avatarUrl") if existing else None),
            "role": role,
            "is_admin": admin_flag,
            "workspace_id": ws_slug,
            "tier": ws_info["tier"],
            "login_count": login_count,
            "last_login": now_iso,
        }
        self.users[key] = record

        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO users "
                    "(email, name, avatar_url, role, is_admin, workspace_id, login_count, last_login) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        clean_email,
                        display_name,
                        record["avatarUrl"],
                        role,
                        1 if admin_flag else 0,
                        ws_slug,
                        login_count,
                        now_iso,
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not save user '{clean_email}' to SQLite: {e}")

        firestore_ok = False
        if sync_firestore:
            firestore_ok = _sync_user_to_firestore(record)
        record["firestore_synced"] = firestore_ok
        return record

    def list_users(self) -> List[Dict[str, Any]]:
        remote_users = _fetch_users_from_firestore()
        for ru in remote_users:
            em = (ru.get("email") or "").lower()
            if em and em not in self.users:
                self.users[em] = ru

        result: List[Dict[str, Any]] = []
        for u in self.users.values():
            ws_id = u.get("workspace_id", "default")
            ws_info = self.get_workspace_info(ws_id)
            result.append({
                **u,
                "tier": ws_info["tier"],
                "plan_name": ws_info["plan_name"],
                "scans_used": ws_info["scans_used"],
                "scans_limit": ws_info["scans_limit"],
                "nodes_count": ws_info["nodes_count"],
            })
        result.sort(key=lambda x: (not x.get("is_admin", False), x.get("email", "")))
        return result

    def ensure_workspace(self, workspace_id: str = "default", default_tier: str = "free") -> Dict[str, Any]:
        ws_id = (workspace_id or "default").strip() or "default"
        if ws_id not in self.workspaces:
            tier = default_tier if default_tier in TIER_CONFIG else "free"
            scans_used = 0
            try:
                with self._connect() as conn:
                    row = conn.execute(
                        "SELECT tier, scans_used FROM workspaces WHERE workspace_id = ?",
                        (ws_id,),
                    ).fetchone()
                    if row:
                        tier, scans_used = row[0], int(row[1])
                    else:
                        conn.execute(
                            "INSERT INTO workspaces (workspace_id, tier, scans_used, updated_at) VALUES (?, ?, ?, ?)",
                            (ws_id, tier, scans_used, time.time()),
                        )
                        conn.commit()
            except Exception as e:
                logger.warning(f"Workspace DB read fallback for '{ws_id}': {e}")

            self.workspaces[ws_id] = {"tier": tier, "scans_used": scans_used}
            self.graphs.setdefault(ws_id, nx.DiGraph())
            self.node_data.setdefault(ws_id, {})
            self.node_locations.setdefault(ws_id, {})
            self.node_images.setdefault(ws_id, {})
            self.node_map_images.setdefault(ws_id, {})
            self.node_parametric_svgs.setdefault(ws_id, {})
            self._load_workspace_nodes_from_db(ws_id)

        return self.get_workspace_info(ws_id)

    def _load_workspace_nodes_from_db(self, ws_id: str) -> None:
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT node_name, topology_json, locations_json, map_image, parametric_svg "
                    "FROM nodes WHERE workspace_id = ? ORDER BY created_at ASC",
                    (ws_id,),
                ).fetchall()
                for node_name, topo_str, loc_str, map_img, param_svg in rows:
                    topo = json.loads(topo_str)
                    locs = json.loads(loc_str)
                    self.graphs[ws_id].add_node(node_name, captured=True)
                    self.node_data[ws_id][node_name] = topo
                    self.node_locations[ws_id][node_name] = locs
                    self.node_map_images[ws_id][node_name] = map_img
                    self.node_parametric_svgs[ws_id][node_name] = param_svg

                edge_rows = conn.execute(
                    "SELECT source, target FROM edges WHERE workspace_id = ?",
                    (ws_id,),
                ).fetchall()
                for u, v in edge_rows:
                    self.graphs[ws_id].add_edge(u, v)
        except Exception as e:
            logger.warning(f"Could not hydrate workspace '{ws_id}' from SQLite: {e}")

    def get_workspace_info(self, workspace_id: str = "default") -> Dict[str, Any]:
        ws_id = (workspace_id or "default").strip() or "default"
        if ws_id not in self.workspaces:
            self.ensure_workspace(ws_id)
        ws = self.workspaces[ws_id]
        tier_key = ws.get("tier", "free")
        cfg = TIER_CONFIG.get(tier_key, TIER_CONFIG["free"])
        ws_payments = [p for p in self.payments if p.get("workspace_id") == ws_id]
        paid_payments = [p for p in ws_payments if p.get("status") == "paid"]
        last_order = paid_payments[0]["order_id"] if paid_payments else (ws_payments[0]["order_id"] if ws_payments else None)
        last_cycle = paid_payments[0]["billing_cycle"] if paid_payments else "monthly"
        sub_status = "active_paid" if (tier_key != "free" and paid_payments) else ("admin_unlocked" if tier_key != "free" else "free_tier")
        return {
            "workspace_id": ws_id,
            "tier": tier_key,
            "plan_name": cfg["plan_name"],
            "scans_used": int(ws.get("scans_used", 0)),
            "scans_limit": int(cfg["scans_limit"]),
            "allowed_engines": cfg["allowed_engines"],
            "features": cfg["features"],
            "nodes_count": len(self.graphs.get(ws_id, nx.DiGraph()).nodes()),
            "subscription_status": sub_status,
            "billing_cycle": last_cycle,
            "last_order_id": last_order,
        }

    def process_subscription_payment(
        self,
        workspace_id: str,
        user_email: str,
        tier: str,
        billing_cycle: str = "monthly",
        payment_method: str = "card",
    ) -> Dict[str, Any]:
        tier_norm = tier.strip().lower()
        if tier_norm not in ("pro", "enterprise"):
            raise ValueError("Subscription checkout is only required for 'pro' or 'enterprise' plans.")
        cycle_norm = "annual" if billing_cycle.strip().lower() == "annual" else "monthly"
        pricing = PLAN_PRICING[tier_norm]
        amount_krw = pricing["annual_krw"] if cycle_norm == "annual" else pricing["monthly_krw"]
        amount_usd = pricing["annual_usd"] if cycle_norm == "annual" else pricing["monthly_usd"]
        amount_label = f"₩{amount_krw:,} (${amount_usd}) / {'yr' if cycle_norm == 'annual' else 'mo'}"

        order_id = f"ord_{int(time.time())}_{abs(hash((workspace_id, user_email, time.time()))) % 1000000:06d}"
        now_iso = datetime.now(timezone.utc).isoformat()
        cfg = TIER_CONFIG[tier_norm]

        receipt = {
            "order_id": order_id,
            "workspace_id": (workspace_id or "default").strip() or "default",
            "user_email": user_email.strip(),
            "tier": tier_norm,
            "plan_name": cfg["plan_name"],
            "billing_cycle": cycle_norm,
            "payment_method": payment_method.strip().lower() or "card",
            "amount_krw": amount_krw,
            "amount_usd": amount_usd,
            "amount_label": amount_label,
            "status": "paid",
            "paid_at": now_iso,
        }
        self.payments.insert(0, receipt)
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO payments "
                    "(order_id, workspace_id, user_email, tier, plan_name, billing_cycle, "
                    "payment_method, amount_krw, amount_usd, amount_label, status, paid_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        receipt["order_id"],
                        receipt["workspace_id"],
                        receipt["user_email"],
                        receipt["tier"],
                        receipt["plan_name"],
                        receipt["billing_cycle"],
                        receipt["payment_method"],
                        receipt["amount_krw"],
                        receipt["amount_usd"],
                        receipt["amount_label"],
                        receipt["status"],
                        receipt["paid_at"],
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not save payment receipt to SQLite: {e}")

        _sync_payment_to_firestore(receipt)
        self.set_workspace_tier(receipt["workspace_id"], tier_norm)
        u_key = user_email.strip().lower()
        if u_key in self.users:
            self.users[u_key]["tier"] = tier_norm
            _sync_user_to_firestore(self.users[u_key])
        return receipt

    def cancel_subscription(
        self,
        workspace_id: str,
        user_email: str,
        order_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        ws_id = (workspace_id or "default").strip() or "default"
        clean_email = (user_email or "").strip()
        u_key = clean_email.lower()

        canceled_order_id: Optional[str] = None
        for p in self.payments:
            match_ws = p.get("workspace_id") == ws_id or (
                clean_email and p.get("user_email", "").lower() == u_key
            )
            match_order = (order_id is None) or (p.get("order_id") == order_id)
            if match_ws and match_order and p.get("status") == "paid":
                p["status"] = "canceled"
                canceled_order_id = canceled_order_id or p.get("order_id")
                try:
                    with self._connect() as conn:
                        conn.execute(
                            "UPDATE payments SET status = 'canceled' WHERE order_id = ?",
                            (p["order_id"],),
                        )
                        conn.commit()
                except Exception as e:
                    logger.warning(f"Could not update canceled payment in SQLite: {e}")
                _sync_payment_to_firestore(p)
                if order_id is not None:
                    break

        ws_info = self.set_workspace_tier(ws_id, "free")
        firestore_synced = False
        if u_key in self.users:
            self.users[u_key]["tier"] = "free"
            firestore_synced = _sync_user_to_firestore(self.users[u_key])
        elif clean_email and "@" in clean_email:
            user_rec = self.upsert_user(email=clean_email, sync_firestore=False)
            user_rec["tier"] = "free"
            self.set_workspace_tier(user_rec["workspace_id"], "free")
            firestore_synced = _sync_user_to_firestore(user_rec)

        return {
            "canceled_order_id": canceled_order_id,
            "workspace": ws_info,
            "firestore_synced": firestore_synced,
        }

    def set_workspace_tier(self, workspace_id: str, tier: str) -> Dict[str, Any]:
        ws_id = (workspace_id or "default").strip() or "default"
        tier_norm = tier.strip().lower()
        if tier_norm not in TIER_CONFIG:
            tier_norm = "free"
        self.ensure_workspace(ws_id)
        self.workspaces[ws_id]["tier"] = tier_norm
        try:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE workspaces SET tier = ?, updated_at = ? WHERE workspace_id = ?",
                    (tier_norm, time.time(), ws_id),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not persist tier update: {e}")
        return self.get_workspace_info(ws_id)

    def save_node(
        self,
        workspace_id: str,
        node_name: str,
        topology: Dict[str, Any],
        locations: List[Dict[str, Any]],
        map_image: str,
        parametric_svg: str,
        images: Optional[List[Dict[str, str]]] = None,
        increment_scan: bool = True,
    ) -> None:
        ws_id = (workspace_id or "default").strip() or "default"
        self.ensure_workspace(ws_id)

        rg = topology.setdefault("room_geometry", {})
        if not rg.get("polygon_points"):
            rg["polygon_points"] = compute_polygon_from_keypoints(topology)

        g = self.graphs[ws_id]
        g.add_node(node_name, captured=True)
        self.node_data[ws_id][node_name] = topology
        self.node_locations[ws_id][node_name] = locations
        self.node_map_images[ws_id][node_name] = map_image
        self.node_parametric_svgs[ws_id][node_name] = parametric_svg
        if images is not None:
            self.node_images[ws_id][node_name] = images

        nodes = list(g.nodes())
        prev_node: Optional[str] = None
        if len(nodes) > 1 and nodes[-1] == node_name:
            prev_node = nodes[-2]
            g.add_edge(prev_node, node_name)

        if increment_scan:
            self.workspaces[ws_id]["scans_used"] = int(self.workspaces[ws_id].get("scans_used", 0)) + 1

        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO nodes "
                    "(workspace_id, node_name, topology_json, locations_json, map_image, parametric_svg, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        ws_id,
                        node_name,
                        json.dumps(topology),
                        json.dumps(locations),
                        map_image,
                        parametric_svg,
                        time.time(),
                    ),
                )
                if prev_node:
                    conn.execute(
                        "INSERT OR IGNORE INTO edges (workspace_id, source, target) VALUES (?, ?, ?)",
                        (ws_id, prev_node, node_name),
                    )
                if increment_scan:
                    conn.execute(
                        "UPDATE workspaces SET scans_used = ?, updated_at = ? WHERE workspace_id = ?",
                        (self.workspaces[ws_id]["scans_used"], time.time(), ws_id),
                    )
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to persist node '{node_name}' to SQLite: {e}")
