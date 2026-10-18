"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SpatialNode,
  ObjectLocation,
  EngineType,
  SubscriptionTier,
  WorkspaceInfo,
  api,
} from "./api";
import {
  UserProfile,
  getSavedUserProfile,
  clearSavedUserProfile,
  triggerGoogleOAuthLogin,
} from "./googleAuth";

export interface GraphNodeSummary {
  id: string;
  vla?: SpatialNode;
  map_image?: string;
  parametric_svg?: string;
  locations?: ObjectLocation[];
}

export function useSpatialWorkspace(initialWorkspaceId = "default") {
  const [topology, setTopology] = useState<SpatialNode | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [parametricSvg, setParametricSvg] = useState<string | null>(null);
  const [locations, setLocations] = useState<ObjectLocation[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [availableNodes, setAvailableNodes] = useState<GraphNodeSummary[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"MAP" | "GRAPH" | "FLEET" | "TWIN">("MAP");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fontSize, setFontSize] = useState<"S" | "M" | "L">("M");
  const [selectedEngine, setSelectedEngine] = useState<EngineType>("gemini-3.8-flash");
  const [workspaceId, setWorkspaceId] = useState<string>(initialWorkspaceId);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [robotApiUrl, setRobotApiUrl] = useState("http://localhost:8080/nav2/follow_waypoints");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const addSystemLog = useCallback((msg: string) => {
    setSystemLogs((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    const saved = getSavedUserProfile();
    if (saved) {
      setUserProfile(saved);
      if (saved.workspace_id) {
        setWorkspaceId(saved.workspace_id);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const refreshWorkspaceAndGraph = useCallback(async () => {
    try {
      const [ws, graph] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getGraph(workspaceId),
      ]);
      if (ws && ws.workspace_id) {
        setWorkspaceInfo(ws);
      }
      if (graph?.nodes && graph.nodes.length > 0) {
        setAvailableNodes(graph.nodes);
        const latest = graph.nodes[graph.nodes.length - 1];
        setTopology((prev) => prev || latest.vla || null);
        setMapImage((prev) => prev || latest.map_image || "/default_blueprint.png");
        setParametricSvg((prev) => prev || latest.parametric_svg || null);
        setLocations((prev) => (prev.length > 0 ? prev : latest.locations || []));
      }
    } catch {
      try {
        const res = await fetch("/topology.json");
        if (res.ok) {
          const sample = await res.json();
          setTopology((prev) => prev || sample);
          setMapImage((prev) => prev || "/default_blueprint.png");
        }
      } catch (offlineErr) {
        void offlineErr;
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    refreshWorkspaceAndGraph();
  }, [refreshWorkspaceAndGraph]);

  const handleGoogleAuthSuccess = useCallback(
    (profile: UserProfile) => {
      setUserProfile(profile);
      if (profile.workspace_id) {
        setWorkspaceId(profile.workspace_id);
      }
      if (profile.is_admin) {
        setSelectedEngine("gemini-4-argon");
      }
      addSystemLog(
        `[AUTH] Signed in via Google OAuth as ${profile.name} (${profile.email})${
          profile.is_admin ? " [ADMIN]" : ""
        }`
      );
    },
    [addSystemLog]
  );

  const handleTriggerGoogleLogin = useCallback(() => {
    triggerGoogleOAuthLogin(
      (profile) => {
        handleGoogleAuthSuccess(profile);
      },
      () => {
        setIsAuthModalOpen(true);
      }
    );
  }, [handleGoogleAuthSuccess]);

  const handleLogout = useCallback(() => {
    clearSavedUserProfile();
    setUserProfile(null);
    setIsAdminModalOpen(false);
    setWorkspaceId("default");
    setSelectedEngine("gemini-3.8-flash");
    addSystemLog("[AUTH] Signed out of Google account; reverted to default free workspace.");
  }, [addSystemLog]);

  const handleTierChange = async (newTier: SubscriptionTier) => {
    try {
      const updated = await api.setWorkspaceTier(
        newTier,
        workspaceId,
        userProfile?.email
      );
      setWorkspaceInfo(updated);
      if (newTier === "free" && !userProfile?.is_admin && selectedEngine === "gemini-4-argon") {
        setSelectedEngine("gemini-3.8-flash");
      } else if (newTier !== "free") {
        setSelectedEngine("gemini-4-argon");
      }
      addSystemLog(`[SAAS] Switched workspace '${workspaceId}' to ${updated.plan_name}`);
    } catch (err: any) {
      addSystemLog(`[BILLING] ${err?.message || "Subscription checkout required to upgrade plan."}`);
    }
  };

  const handleBillingSuccess = useCallback(
    (updatedWorkspace: WorkspaceInfo, orderId: string) => {
      setWorkspaceInfo(updatedWorkspace);
      if (updatedWorkspace.tier === "free" && !userProfile?.is_admin) {
        setSelectedEngine("gemini-3.8-flash");
        addSystemLog(
          `[BILLING] Subscription canceled (${orderId}) — reverted to ${updatedWorkspace.plan_name}`
        );
      } else {
        setSelectedEngine("gemini-4-argon");
        addSystemLog(
          `[BILLING] Subscription payment completed (${orderId}) — unlocked ${updatedWorkspace.plan_name}`
        );
      }
    },
    [addSystemLog, userProfile?.is_admin]
  );

  const handleAnalysisComplete = async (
    newTopology: SpatialNode,
    newMapImage: string,
    newLocations: ObjectLocation[],
    newParametricSvg?: string
  ) => {
    setTopology(newTopology);
    setMapImage(newMapImage);
    setParametricSvg(newParametricSvg || newMapImage);
    setLocations(newLocations);
    addSystemLog(
      `[VLA] Synthesized room node '${newTopology.node_name}' with ${newLocations.length} grounded objects.`
    );
    try {
      const [imgData, wsData, graphData] = await Promise.all([
        api.getNodeImages(newTopology.node_name, workspaceId),
        api.getWorkspace(workspaceId),
        api.getGraph(workspaceId),
      ]);
      setSourceImages(imgData.images || []);
      if (wsData?.workspace_id) setWorkspaceInfo(wsData);
      if (graphData?.nodes) setAvailableNodes(graphData.nodes);
    } catch (err) {
      console.error("Failed to fetch post-analysis metadata:", err);
    }
  };

  const handleSelectFleetNode = async (nodeId: string, nodeDataObj: any) => {
    const vla = nodeDataObj?.vla;
    if (vla) {
      setTopology(vla);
      if (nodeDataObj.map_image) setMapImage(nodeDataObj.map_image);
      if (nodeDataObj.parametric_svg) setParametricSvg(nodeDataObj.parametric_svg);
      if (nodeDataObj.locations) setLocations(nodeDataObj.locations);
      setSelectedObjectId(null);
      addSystemLog(`[FLEET] Switched active room node to '${nodeId}'`);
      try {
        const imgData = await api.getNodeImages(nodeId, workspaceId);
        setSourceImages(imgData.images || []);
      } catch {
        setSourceImages([]);
      }
    }
  };

  const handleExportArtifact = (fmt: "svg" | "dxf" | "ros2" | "json") => {
    if (!topology) return;
    if (fmt === "json") {
      const json = JSON.stringify({ topology, locations }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute(
        "download",
        `topology_${topology.node_name.replace(/[^a-zA-Z0-9]/g, "_")}.json`
      );
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const url = api.getExportUrl(topology.node_name, fmt, workspaceId);
    addSystemLog(`[EXPORT] Downloading ${fmt.toUpperCase()} artifact for '${topology.node_name}'`);
    window.open(url, "_blank");
  };

  return {
    topology,
    mapImage,
    parametricSvg,
    locations,
    sourceImages,
    availableNodes,
    selectedObjectId,
    setSelectedObjectId,
    viewMode,
    setViewMode,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    selectedEngine,
    setSelectedEngine,
    workspaceId,
    workspaceInfo,
    userProfile,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isAdminModalOpen,
    setIsAdminModalOpen,
    handleTriggerGoogleLogin,
    handleGoogleAuthSuccess,
    handleLogout,
    refreshWorkspaceAndGraph,
    robotApiUrl,
    setRobotApiUrl,
    isSettingsOpen,
    setIsSettingsOpen,
    systemLogs,
    isBusy,
    setIsBusy,
    addSystemLog,
    handleTierChange,
    handleBillingSuccess,
    handleAnalysisComplete,
    handleSelectFleetNode,
    handleExportArtifact,
  };
}
