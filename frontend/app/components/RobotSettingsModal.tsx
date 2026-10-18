"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Save,
  Bot,
  Check,
  Key,
  CreditCard,
  Terminal,
  Lock,
  ShieldCheck,
  Receipt,
  Loader2,
} from "lucide-react";
import {
  SubscriptionTier,
  WorkspaceInfo,
  PaymentReceipt,
  api,
} from "../lib/api";
import { UserProfile } from "../lib/googleAuth";

interface RobotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onSave: (url: string) => void;
  workspaceInfo?: WorkspaceInfo | null;
  userProfile?: UserProfile | null;
  onSelectTier?: (tier: SubscriptionTier) => void;
  onBillingSuccess?: (workspace: WorkspaceInfo, orderId: string) => void;
  onRequestGoogleLogin?: () => void;
}

const SAAS_PLANS: {
  id: SubscriptionTier;
  name: string;
  monthlyKrw: string;
  annualKrw: string;
  monthlyUsd: string;
  annualUsd: string;
  audience: string;
  scans: string;
  highlights: string[];
}[] = [
  {
    id: "free",
    name: "Starter B2C (Free)",
    monthlyKrw: "₩0",
    annualKrw: "₩0",
    monthlyUsd: "$0 / mo",
    annualUsd: "$0 / yr",
    audience: "Individual users & free evaluation",
    scans: "10 room scans / mo",
    highlights: [
      "3.8 Flash low-latency VLA (Free Mode)",
      "2D Orthographic Blueprint & 3D Voxel Twin",
      "JSON spatial property graph export",
    ],
  },
  {
    id: "pro",
    name: "Pro Space Architect",
    monthlyKrw: "₩65,000 / 월",
    annualKrw: "₩52,000 / 월 (연 ₩624,000)",
    monthlyUsd: "$49 / mo",
    annualUsd: "$39 / mo ($470/yr)",
    audience: "AEC, PropTech, Interior Design & Surveyors",
    scans: "50 room scans / mo",
    highlights: [
      "v4 Argon deep SLAM & 360° loop closure",
      "AutoCAD R12 (.DXF) & Parametric .SVG export",
      "Multi-room graph stitching & floor inspector",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Robotics API",
    monthlyKrw: "₩390,000 / 월",
    annualKrw: "₩312,000 / 월 (연 ₩3,744,000)",
    monthlyUsd: "$299 / mo",
    annualUsd: "$239 / mo ($2,870/yr)",
    audience: "AMR fleets, warehouse automation & Digital Twins",
    scans: "Unlimited scans",
    highlights: [
      "v4 Argon multi-room trajectory planner",
      "Direct ROS2 Nav2 FollowWaypoints REST bridge",
      "Dedicated tenant workspace & SLA",
    ],
  },
];

export default function RobotSettingsModal({
  isOpen,
  onClose,
  apiUrl,
  onSave,
  workspaceInfo,
  userProfile,
  onSelectTier,
  onBillingSuccess,
  onRequestGoogleLogin,
}: RobotSettingsModalProps) {
  const [url, setUrl] = useState(apiUrl);
  const [activeTab, setActiveTab] = useState<"PLANS" | "CHECKOUT" | "HISTORY" | "HARDWARE">("PLANS");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier>("pro");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "kakaopay" | "stripe">("card");
  const [cardNumber, setCardNumber] = useState("4579-8200-1234-4242");
  const [cardExpiry, setCardExpiry] = useState("08/28");
  const [cardCvc, setCardCvc] = useState("842");
  const [orgName, setOrgName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);

  const isAdmin = Boolean(userProfile?.is_admin);
  const currentTier = workspaceInfo?.tier || "free";
  const wsId = workspaceInfo?.workspace_id || "default";

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.getBillingHistory(wsId);
      setPayments(res.payments || []);
    } catch {
      setPayments([]);
    }
  }, [wsId]);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setErrorMessage(null);
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(url);
    onClose();
  };

  const handlePlanAction = (planId: SubscriptionTier) => {
    setErrorMessage(null);
    setStatusMessage(null);
    if (isAdmin || planId === "free") {
      onSelectTier?.(planId);
      return;
    }
    setCheckoutTier(planId);
    setActiveTab("CHECKOUT");
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const payerEmail = userProfile?.email || "subscriber@spatialos.cloud";
    setIsProcessing(true);
    try {
      const last4 = cardNumber.replace(/\D/g, "").slice(-4) || "4242";
      const res = await api.createBillingCheckout({
        workspace_id: wsId,
        user_email: payerEmail,
        user_name: userProfile?.name,
        tier: checkoutTier,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        card_last4: last4,
        organization_name: orgName.trim() || undefined,
      });
      setStatusMessage(`${res.message} (Order ID: ${res.receipt.order_id})`);
      onBillingSuccess?.(res.workspace, res.receipt.order_id);
      await loadHistory();
      setActiveTab("PLANS");
    } catch (err: any) {
      setErrorMessage(err?.message || "Payment authorization failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async (orderId?: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const payerEmail = userProfile?.email || "subscriber@spatialos.cloud";
    setIsProcessing(true);
    try {
      const res = await api.cancelSubscription({
        workspace_id: wsId,
        user_email: payerEmail,
        order_id: orderId,
      });
      setStatusMessage(res.message);
      onBillingSuccess?.(res.workspace, res.canceled_order_id || "canceled");
      await loadHistory();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to cancel subscription.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPlanObj = SAAS_PLANS.find((p) => p.id === checkoutTier) || SAAS_PLANS[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 6, 23, 0.78)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-semibold text-sm text-slate-100">
                  SPATIAL_OS Subscription &amp; Payment Checkout (결제 시스템)
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    ADMIN UNLOCKED (ALL TIERS)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Individual Default: Free Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Individual users start on Free mode; upgrade via Toss / KakaoPay / Stripe checkout to unlock Pro &amp; Enterprise
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("PLANS")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "PLANS"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Plans &amp; Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CHECKOUT")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "CHECKOUT"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              결제하기 (Checkout)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("HISTORY")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "HISTORY"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              결제 내역 ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("HARDWARE")}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "HARDWARE"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              ROS2 Nav2 &amp; API
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 mb-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              월간 결제 (Monthly)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                billingCycle === "annual"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              연간 결제 (20% 할인)
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-medium flex items-center justify-between">
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 font-medium">
              {errorMessage}
            </div>
          )}

          {activeTab === "PLANS" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAAS_PLANS.map((plan) => {
                const isCurrent = currentTier === plan.id;
                const priceKrw = billingCycle === "annual" ? plan.annualKrw : plan.monthlyKrw;
                const priceUsd = billingCycle === "annual" ? plan.annualUsd : plan.monthlyUsd;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl p-4 flex flex-col justify-between border transition-all ${
                      isCurrent
                        ? "bg-emerald-950/20 border-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col mb-2">
                        <span className="text-xl font-bold text-slate-100 tabular-nums">
                          {priceKrw}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{priceUsd}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">{plan.audience}</p>
                      <div className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded px-2 py-1 mb-3">
                        Quota: {plan.scans}
                      </div>
                      <ul className="space-y-2 mb-4">
                        {plan.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isCurrent ? (
                      plan.id !== "free" ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled
                            className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-emerald-400"
                          >
                            Current Active Plan
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleCancelSubscription()}
                            className="w-full py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 transition-all cursor-pointer disabled:opacity-50"
                          >
                            구독 해지하기 (Cancel Subscription)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400"
                        >
                          Current Active Plan (Free)
                        </button>
                      )
                    ) : isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handlePlanAction(plan.id)}
                        className="w-full py-2 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer"
                      >
                        Admin Instant Switch → {plan.id.toUpperCase()}
                      </button>
                    ) : plan.id === "free" ? (
                      <button
                        type="button"
                        onClick={() => handlePlanAction("free")}
                        className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                      >
                        Switch to Free Mode
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlanAction(plan.id)}
                        className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>구독 결제하기 (Subscribe)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "CHECKOUT" && (
            <form onSubmit={handleCompletePayment} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-4">
                <div className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-200">
                    1. 구독 플랜 선택 (Select Subscription Plan)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(["pro", "enterprise"] as SubscriptionTier[]).map((tid) => {
                      const p = SAAS_PLANS.find((x) => x.id === tid)!;
                      const active = checkoutTier === tid;
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => setCheckoutTier(tid)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? "bg-emerald-950/30 border-emerald-400 text-slate-100"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <div className="text-xs font-bold text-emerald-400">{p.name}</div>
                          <div className="text-sm font-bold mt-1">
                            {billingCycle === "annual" ? p.annualKrw : p.monthlyKrw}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-200">
                    2. 결제 수단 선택 (Payment Gateway)
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "card", label: "Toss · 신용/체크카드" },
                      { id: "kakaopay", label: "KakaoPay 정기결제" },
                      { id: "stripe", label: "Stripe Global (USD)" },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          paymentMethod === pm.id
                            ? "bg-sky-500/20 border-sky-400 text-sky-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod !== "kakaopay" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          카드 번호 (Card Number)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full rounded-lg px-3 py-2 font-mono text-xs bg-slate-900 border border-slate-700 text-slate-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">MM/YY</label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full rounded-lg px-2.5 py-2 font-mono text-xs bg-slate-900 border border-slate-700 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">CVC</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full rounded-lg px-2.5 py-2 font-mono text-xs bg-slate-900 border border-slate-700 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      소속 기관 / 워크스페이스 명 (Optional Organization)
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Spatial Robotics Lab / Interior Studio"
                      className="w-full rounded-lg px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col justify-between rounded-xl p-5 bg-slate-950 border border-slate-800 space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    결제 요약 (Order Summary)
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Selected Plan</span>
                    <span className="font-bold text-slate-100">{selectedPlanObj.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Billing Cycle</span>
                    <span className="font-mono text-sky-400 uppercase">{billingCycle}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Subscriber Account</span>
                    <span className="font-mono text-slate-200 truncate max-w-[170px]">
                      {userProfile?.email || "Not signed in"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2">
                    <span className="text-xs font-semibold text-slate-300">Total Due</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400 tabular-nums">
                        {billingCycle === "annual"
                          ? selectedPlanObj.annualKrw
                          : selectedPlanObj.monthlyKrw}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {billingCycle === "annual"
                          ? selectedPlanObj.annualUsd
                          : selectedPlanObj.monthlyUsd}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {!userProfile && onRequestGoogleLogin && (
                    <button
                      type="button"
                      onClick={onRequestGoogleLogin}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 border border-sky-500/30 cursor-pointer"
                    >
                      Sign in with Google first (Recommended)
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>결제 승인 및 Firestore 동기화 중...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>구독 결제 완료하기 (Authorize &amp; Subscribe)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === "HISTORY" && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-950/60 border border-slate-800">
                  No subscription payment records found for this workspace yet.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                        <th className="py-2.5 px-4">Order ID</th>
                        <th className="py-2.5 px-4">Plan</th>
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4">Amount</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Paid At</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {payments.map((p) => (
                        <tr key={p.order_id}>
                          <td className="py-2.5 px-4 text-slate-200">{p.order_id}</td>
                          <td className="py-2.5 px-4 text-emerald-400 font-semibold">
                            {p.plan_name}
                          </td>
                          <td className="py-2.5 px-4 uppercase text-slate-300">
                            {p.payment_method}
                          </td>
                          <td className="py-2.5 px-4 text-slate-200">{p.amount_label}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                p.status === "canceled"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">
                            {new Date(p.paid_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {p.status === "paid" ? (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleCancelSubscription(p.order_id)}
                                className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                구독 해지 (Cancel)
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500">Canceled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "HARDWARE" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ROS2 Nav2 FollowWaypoints Webhook Endpoint
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg px-3.5 py-2.5 font-mono text-xs bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="http://localhost:8080/nav2/follow_waypoints"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Receives <code>geometry_msgs/PoseStamped[]</code> waypoints scaled to metric room coordinates (<code>1% = 0.1m</code>).
                </p>
              </div>

              <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-sky-400" />
                    Workspace REST API Integration (cURL)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    workspace_id={wsId}
                  </span>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-3 rounded-lg bg-slate-900 border border-slate-800">
{`curl -X POST http://localhost:8000/api/upload-node \\
  -F "node_name=warehouse_zone_a" \\
  -F "engine=gemini-4-argon" \\
  -F "workspace_id=${wsId}" \\
  -F "images=@sector_0_N.jpg"`}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 flex items-center justify-between border-t border-slate-800 bg-slate-950/80">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Active Plan:{" "}
            <strong className="text-slate-200">
              {workspaceInfo?.plan_name || "Starter B2C (Free)"}
            </strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 cursor-pointer"
            >
              Close
            </button>
            <button type="button" onClick={handleSave} className="cyber-btn">
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
