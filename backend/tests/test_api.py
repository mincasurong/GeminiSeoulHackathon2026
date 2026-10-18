from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_engines_endpoint():
    response = client.get("/api/engines")
    assert response.status_code == 200
    data = response.json()
    assert "engines" in data
    ids = [e["id"] for e in data["engines"]]
    assert "gemini-4-argon" in ids
    assert "gemini-3.8-flash" in ids


def test_graph_endpoint_empty():
    response = client.get("/api/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert len(data["nodes"]) >= 1
    first = data["nodes"][0]
    assert first.get("parametric_svg", "").startswith("data:image/svg+xml;base64,")
    assert len(first.get("locations", [])) >= 1


def test_workspace_and_tier_switching():
    res = client.get("/api/workspace?workspace_id=test_tenant")
    assert res.status_code == 200
    ws = res.json()
    assert ws["workspace_id"] == "test_tenant"
    assert ws["tier"] == "free"

    unpaid_res = client.post(
        "/api/workspace/tier",
        json={"workspace_id": "test_tenant", "tier": "enterprise", "user_email": "user@example.com"},
    )
    assert unpaid_res.status_code == 402

    admin_tier_res = client.post(
        "/api/workspace/tier",
        json={"workspace_id": "test_tenant", "tier": "enterprise", "user_email": "produsoup@gmail.com"},
    )
    assert admin_tier_res.status_code == 200
    updated = admin_tier_res.json()
    assert updated["tier"] == "enterprise"
    assert "gemini-4-argon" in updated["allowed_engines"]

    checkout_res = client.post(
        "/api/billing/checkout",
        json={
            "workspace_id": "paid_tenant",
            "user_email": "buyer@example.com",
            "tier": "pro",
            "billing_cycle": "monthly",
            "payment_method": "kakaopay",
        },
    )
    assert checkout_res.status_code == 200
    checkout_data = checkout_res.json()
    assert checkout_data["status"] == "paid"
    assert checkout_data["workspace"]["tier"] == "pro"
    assert checkout_data["receipt"]["amount_krw"] == 65000

    hist_res = client.get("/api/billing/history?workspace_id=paid_tenant")
    assert hist_res.status_code == 200
    assert hist_res.json()["count"] >= 1

    cancel_res = client.post(
        "/api/billing/cancel",
        json={
            "workspace_id": "paid_tenant",
            "user_email": "buyer@example.com",
            "order_id": checkout_data["receipt"]["order_id"],
        },
    )
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["status"] == "canceled"
    assert cancel_data["workspace"]["tier"] == "free"
    assert cancel_data["workspace"]["subscription_status"] == "free_tier"

    hist_after = client.get("/api/billing/history?workspace_id=paid_tenant").json()
    assert hist_after["payments"][0]["status"] == "canceled"


def test_cad_and_ros2_exports():
    node_name = "Building Elevator Lobby and Stairwell"
    svg_res = client.get(f"/api/node/{node_name}/export?format=svg")
    assert svg_res.status_code == 200
    assert "<svg" in svg_res.text
    assert "CAD BLUEPRINT" in svg_res.text

    dxf_res = client.get(f"/api/node/{node_name}/export?format=dxf")
    assert dxf_res.status_code == 200
    assert "AC1009" in dxf_res.text
    assert "WALLS" in dxf_res.text

    ros_res = client.get(f"/api/node/{node_name}/export?format=ros2")
    assert ros_res.status_code == 200
    ros_data = ros_res.json()
    assert ros_data["action"] == "Nav2_FollowWaypoints"
    assert len(ros_data["waypoints"]) > 0


def test_query_planner_with_waypoints():
    res = client.post(
        "/api/query-planner",
        json={
            "user_query": "Navigate to the golden_door",
            "current_node": "Building Elevator Lobby and Stairwell",
            "engine": "gemini-4-argon",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["plan"]) >= 1
    assert isinstance(data["waypoints"], list)
    assert len(data["waypoints"]) >= 1


def test_node_detail_not_found():
    response = client.get("/api/node/nonexistent_room")
    assert response.status_code == 404


def test_runtime_config_and_google_oauth_verify():
    cfg_res = client.get("/api/config")
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert cfg["service"] == "SPATIAL_OS Cloud"
    assert "googleClientId" in cfg

    auth_res = client.post(
        "/api/auth/google/verify",
        json={"email": "architect@spatialos.ai", "name": "Lead Architect"},
    )
    assert auth_res.status_code == 200
    auth_data = auth_res.json()
    assert auth_data["success"] is True
    assert auth_data["profile"]["email"] == "architect@spatialos.ai"
    assert auth_data["profile"]["name"] == "Lead Architect"
    assert auth_data["profile"]["is_admin"] is False
    assert auth_data["workspace"]["workspace_id"] == "architect_spatialos_ai"
    assert auth_data["workspace"]["tier"] == "free"

    admin_res = client.post(
        "/api/auth/google/verify",
        json={"email": "produsoup@gmail.com", "name": "Project Owner"},
    )
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["profile"]["is_admin"] is True
    assert admin_data["profile"]["role"] == "admin"

    forbidden_res = client.get("/api/admin/overview?admin_email=architect@spatialos.ai")
    assert forbidden_res.status_code == 403

    overview_res = client.get("/api/admin/overview?admin_email=produsoup@gmail.com")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["status"] == "ok"
    assert overview["total_users"] >= 2
