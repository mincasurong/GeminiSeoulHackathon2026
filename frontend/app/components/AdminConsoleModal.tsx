"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ShieldAlert, Users, Database, Building2, RefreshCw } from "lucide-react";
import { api, SubscriptionTier } from "../lib/api";

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
  onWorkspaceUpdated?: () => void;
}

export default function AdminConsoleModal({
  isOpen,
  onClose,
  adminEmail,
  onWorkspaceUpdated,
}: AdminConsoleModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!adminEmail) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOverview(adminEmail);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Could not load Administration Console.");
    } finally {
      setIsLoading(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen, fetchOverview]);

  if (!isOpen) return null;

  const handleTierOverride = async (
    targetEmail: string,
    workspaceId: string,
    newTier: SubscriptionTier
  ) => {
    try {
      const updated = await api.adminUpdateUserTier(
        adminEmail,
        targetEmail,
        workspaceId,
        newTier
      );
      if (updated?.users) {
        setData((prev: any) => ({ ...prev, users: updated.users }));
      }
      onWorkspaceUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Failed to update user tier.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 6, 23, 0.82)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-sm text-slate-100">
                  SPATIAL_OS Administration &amp; Google Cloud DB Console
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Google Cloud Firestore ({data?.database?.collection || "spatial_os_users"}) &middot; Multi-Tenant Control Plane
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOverview}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Google DB Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Google Cloud DB Status</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                Firestore Native (Connected)
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Region: {data?.database?.region || "asia-northeast3"}
              </div>
            </div>

            <div className="rounded-xl p-4 bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Registered Google Users</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 font-mono tabular-nums">
                {data?.total_users || 0}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Synced in {data?.database?.collection || "spatial_os_users"}
              </div>
            </div>

            <div className="rounded-xl p-4 bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Spatial Nodes</span>
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-slate-100 font-mono tabular-nums">
                {data?.total_nodes || 0}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Active multi-tenant rooms
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Google Account Users &amp; Tier Management
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Collection: {data?.database?.collection || "spatial_os_users"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-4">Google Email</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Logins</th>
                    <th className="py-2.5 px-4">Scans</th>
                    <th className="py-2.5 px-4">Subscription Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(data?.users || []).map((u: any) => (
                    <tr key={u.email} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 text-slate-200 font-semibold">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{u.name}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.is_admin
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 tabular-nums">
                        {u.login_count || 1}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-400 tabular-nums">
                        {u.scans_used ?? 0} / {u.scans_limit ?? 10}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          {(["free", "pro", "enterprise"] as SubscriptionTier[]).map(
                            (t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() =>
                                  handleTierOverride(
                                    u.email,
                                    u.workspace_id || "default",
                                    t
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold cursor-pointer transition-colors ${
                                  u.tier === t
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {t}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
