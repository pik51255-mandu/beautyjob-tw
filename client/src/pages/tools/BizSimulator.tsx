import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Download, Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import OwnerGate from "@/components/OwnerGate";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import {
  DEFAULT_UTILIZATION,
  calcBep,
  calcDailyCustomers,
  calcMaxDailyCustomers,
  calcProductContribution,
  calcScenarios,
  calcServiceMix,
  normalizeShares,
  type ServiceRow,
} from "@/lib/openingCostCalc";
import {
  OPENING_COST_STORAGE_KEY,
  PRODUCT_COST_STORAGE_KEY,
  mapOpeningCostToMonthlyFixed,
  mapProductCostToServiceRows,
} from "@/lib/bizSimImport";

// C-4: 經營損益模擬器 — C-2.1에서 보존한 serviceMix(매출 가중)·BEP·캐파·店販·시나리오 모듈 재연결

type SavedInputs = {
  services: ServiceRow[];
  monthlyFixed: number;
  commissionPct: number;
  cardFeePct: number;
  workDays: number;
  designers: number;
  seats: number;
  dailyHours: number;
  utilizationPct: number;
  retailEnabled: boolean;
  retailRevenue: number;
  retailCostPct: number;
  retailIncentivePct: number;
};

const STORAGE_KEY = "bizSimInputs.v1";

// C-2.1 때의 기본 5행 그대로
const DEFAULT_SERVICES: ServiceRow[] = [
  { name: "剪髮", price: 600, materialPct: 0, sharePct: 40, minutes: 40 },
  { name: "燙髮", price: 2_500, materialPct: 30, sharePct: 20, minutes: 120 },
  { name: "染髮", price: 2_200, materialPct: 30, sharePct: 25, minutes: 100 },
  { name: "護髮", price: 1_500, materialPct: 50, sharePct: 10, minutes: 60 },
  { name: "其他", price: 800, materialPct: 10, sharePct: 5, minutes: 40 },
];

const DEFAULTS: SavedInputs = {
  services: DEFAULT_SERVICES,
  monthlyFixed: 96_445,
  commissionPct: 35,
  cardFeePct: 2,
  workDays: 26,
  designers: 1,
  seats: 3,
  dailyHours: 10,
  utilizationPct: DEFAULT_UTILIZATION * 100,
  retailEnabled: false,
  retailRevenue: 30_000,
  retailCostPct: 50,
  retailIncentivePct: 10,
};

function loadSaved(): SavedInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
    if (!Array.isArray(parsed.services) || parsed.services.length === 0) parsed.services = DEFAULT_SERVICES;
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

function numOr0(v: string): number {
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const fmt = (n: number) => `NT$ ${Math.round(n).toLocaleString("zh-TW")}`;
const fmtSigned = (n: number) => `${n >= 0 ? "+" : "−"}NT$ ${Math.abs(Math.round(n)).toLocaleString("zh-TW")}`;

export default function BizSimulator() {
  return (
    <OwnerGate>
      <BizSimulatorInner />
    </OwnerGate>
  );
}

function BizSimulatorInner() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [state, setState] = useState<SavedInputs>(loadSaved);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.title = t("bsPageTitle");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("bsMetaDescription");
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (lang === "ko") {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex";
    } else if (robots) {
      robots.remove();
    }
    return () => {
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 저장 불가 환경은 무시
    }
  }, [state]);

  const set = <K extends keyof SavedInputs>(key: K, value: SavedInputs[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const setService = (i: number, patch: Partial<ServiceRow>) =>
    setState((s) => {
      const services = [...s.services];
      services[i] = { ...services[i], ...patch };
      return { ...s, services };
    });

  // ─── 크로스 도구 가져오기 ───
  const readLs = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const productImport = mapProductCostToServiceRows(readLs(PRODUCT_COST_STORAGE_KEY));
  const openingImport = mapOpeningCostToMonthlyFixed(readLs(OPENING_COST_STORAGE_KEY));

  const importFromProductCost = () => {
    if (!productImport) return;
    set("services", productImport);
    toast.success(`${t("bsImportDone")} — ${t("bsImportHintMix")}`);
  };
  const importFromOpeningCost = () => {
    if (openingImport === null) return;
    set("monthlyFixed", openingImport);
    toast.success(t("bsImportDone"));
  };

  // ─── 계산 (보존 모듈) ───
  const mix = useMemo(() => calcServiceMix(state.services), [state.services]);
  const shareSumOk = Math.abs(mix.shareSum - 100) < 0.05;

  const variableRatio = mix.materialRate + state.commissionPct / 100 + state.cardFeePct / 100;
  const variableTooHigh = variableRatio > 0.95;

  const productContribution = state.retailEnabled
    ? calcProductContribution(state.retailRevenue, state.retailCostPct, state.retailIncentivePct)
    : 0;

  const bep = calcBep(state.monthlyFixed, variableRatio);
  const bepPossible = Number.isFinite(bep);
  const dailyNeed = calcDailyCustomers(bep, mix.avgTicket, state.workDays);
  const maxDaily = calcMaxDailyCustomers(
    state.designers,
    state.seats,
    state.dailyHours,
    mix.avgMinutes,
    state.utilizationPct / 100
  );
  const capacityExceeded = bepPossible && Number.isFinite(maxDaily) && dailyNeed > maxDaily;

  const scenarios = useMemo(
    () => (bepPossible ? calcScenarios(bep, variableRatio, state.monthlyFixed, 0, productContribution) : []),
    [bep, variableRatio, state.monthlyFixed, productContribution, bepPossible]
  );

  // ─── 결과 이미지 저장 ───
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bepPossible) return;
    const scale = 2;
    const W = 420;
    const rows: [string, string][] = [
      [t("ocFixedTotal"), fmt(state.monthlyFixed)],
      [t("ocVariableRatio"), `${Math.round(variableRatio * 1000) / 10}%`],
      [t("ocMixAvgTicket"), fmt(mix.avgTicket)],
      [t("ocDailyCustomers"), `${dailyNeed} ${t("ocCustomersUnit")}`],
      [t("ocMaxDaily"), `${maxDaily} ${t("ocCustomersUnit")}`],
      ...(productContribution > 0
        ? [[t("ocRetailContribution"), fmtSigned(productContribution)] as [string, string]]
        : []),
    ];
    const H = 180 + rows.length * 34 + 50;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px 'Noto Sans TC', sans-serif";
    ctx.fillText(t("hubBizSimTitle"), 24, 40);
    let y = 76;
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    for (const [label, value] of rows) {
      ctx.fillStyle = "#555555";
      ctx.fillText(label.length > 18 ? label.slice(0, 18) + "…" : label, 24, y);
      ctx.fillStyle = "#111111";
      ctx.textAlign = "right";
      ctx.fillText(value, W - 24, y);
      ctx.textAlign = "left";
      y += 34;
    }
    ctx.strokeStyle = "#dddddd";
    ctx.beginPath();
    ctx.moveTo(24, y - 14);
    ctx.lineTo(W - 24, y - 14);
    ctx.stroke();
    ctx.font = "bold 20px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#be123c";
    ctx.fillText(t("ocBepLabel"), 24, y + 16);
    ctx.textAlign = "right";
    ctx.fillText(fmt(bep), W - 24, y + 16);
    ctx.textAlign = "left";

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "biz-simulation.png";
    a.click();
    toast.success(t("saveImage"));
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LineChart className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("hubBizSimTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("bsSubheading")}</p>
      </div>

      {/* A. 시술 믹스 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold">{t("bsSectionMix")}</h2>
          <div className="text-right">
            <Button variant="outline" size="sm" disabled={!productImport} onClick={importFromProductCost}>
              {t("bsImportFromProductCost")}
            </Button>
            {!productImport && (
              <p className="text-[10px] text-muted-foreground mt-1">{t("bsNoImportData")}</p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left pb-2 font-medium">{t("ocServiceName")}</th>
                <th className="text-right pb-2 font-medium">{t("ocServicePrice")}</th>
                <th className="text-right pb-2 font-medium">{t("ocServiceMaterial")}</th>
                <th className="text-right pb-2 font-medium">{t("ocServiceShare")}</th>
                <th className="text-right pb-2 font-medium">{t("ocServiceMinutes")}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {state.services.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 pr-2">
                    <Input className="h-8 text-xs" value={row.name} onChange={(e) => setService(i, { name: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2 w-24">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={row.price || ""} onChange={(e) => setService(i, { price: numOr0(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2 w-20">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={row.materialPct || ""} placeholder="0" onChange={(e) => setService(i, { materialPct: Math.min(100, numOr0(e.target.value)) })} />
                  </td>
                  <td className="py-1.5 pr-2 w-20">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={row.sharePct || ""} placeholder="0" onChange={(e) => setService(i, { sharePct: Math.min(100, numOr0(e.target.value)) })} />
                  </td>
                  <td className="py-1.5 pr-2 w-20">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={row.minutes || ""} onChange={(e) => setService(i, { minutes: Math.min(600, numOr0(e.target.value)) })} />
                  </td>
                  <td className="py-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                      disabled={state.services.length <= 1}
                      onClick={() => set("services", state.services.filter((_, j) => j !== i))}
                      aria-label={t("pcRemove")}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="gap-1 mt-2"
          onClick={() => set("services", [...state.services, { name: "", price: 1_000, materialPct: 10, sharePct: 0, minutes: 60 }])}>
          <Plus className="w-3.5 h-3.5" />{t("ocServiceAdd")}
        </Button>

        {!shareSumOk && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("ocShareSumWarning").replace("{sum}", String(mix.shareSum))}</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => set("services", normalizeShares(state.services))}>
              {t("ocNormalizeShares")}
            </Button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <DerivedCard label={t("ocMixAvgTicket")} value={fmt(mix.avgTicket)} />
          <DerivedCard label={t("ocMixMaterialRate")} value={`${Math.round(mix.materialRate * 1000) / 10}%`} />
          <DerivedCard label={t("ocMixAvgMinutes")} value={`${mix.avgMinutes} ${t("ocMinutesUnit")}`} />
        </div>
      </div>

      {/* B. 월 고정비 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold">{t("bsSectionFixed")}</h2>
          <div className="text-right">
            <Button variant="outline" size="sm" disabled={openingImport === null} onClick={importFromOpeningCost}>
              {t("bsImportFromOpeningCost")}
            </Button>
            {openingImport === null && (
              <p className="text-[10px] text-muted-foreground mt-1">{t("bsNoImportData")}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("bsFixedLabel")}</Label>
          <Input inputMode="numeric" value={state.monthlyFixed || ""} onChange={(e) => set("monthlyFixed", numOr0(e.target.value))} />
        </div>
      </div>

      {/* C. 변동비 구조 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <h2 className="font-semibold mb-3">{t("bsSectionVariable")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocCommissionRatio")}</Label>
            <Input inputMode="numeric" value={state.commissionPct || ""} placeholder="0" onChange={(e) => set("commissionPct", Math.min(100, numOr0(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocCardFee")}</Label>
            <Input inputMode="numeric" value={state.cardFeePct || ""} placeholder="0" onChange={(e) => set("cardFeePct", Math.min(100, numOr0(e.target.value)))} />
          </div>
        </div>
        {variableTooHigh && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("ocVariableWarning")}</span>
          </div>
        )}

        {/* 店販 토글 */}
        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("ocRetailToggle")}</Label>
            <Switch checked={state.retailEnabled} onCheckedChange={(v) => set("retailEnabled", v)} />
          </div>
          {state.retailEnabled && (
            <>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("ocRetailRevenue")}</Label>
                  <Input inputMode="numeric" value={state.retailRevenue || ""} onChange={(e) => set("retailRevenue", numOr0(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("ocRetailCost")}</Label>
                  <Input inputMode="numeric" value={state.retailCostPct || ""} placeholder="0" onChange={(e) => set("retailCostPct", Math.min(100, numOr0(e.target.value)))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("ocRetailIncentive")}</Label>
                  <Input inputMode="numeric" value={state.retailIncentivePct || ""} placeholder="0" onChange={(e) => set("retailIncentivePct", Math.min(100, numOr0(e.target.value)))} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("ocRetailContribution")}</span>
                <span className="font-semibold">{fmtSigned(productContribution)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* D. 캐파 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="font-semibold mb-3">{t("bsSectionCapacity")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocDesigners")}</Label>
            <Input inputMode="numeric" value={state.designers || ""} placeholder="0" onChange={(e) => set("designers", Math.min(50, numOr0(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocSeats")}</Label>
            <Input inputMode="numeric" value={state.seats || ""} placeholder="0" onChange={(e) => set("seats", Math.min(50, numOr0(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocDailyHours")}</Label>
            <Input inputMode="numeric" value={state.dailyHours || ""} onChange={(e) => set("dailyHours", Math.min(24, numOr0(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ocUtilization")}</Label>
            <Input inputMode="numeric" value={state.utilizationPct || ""} onChange={(e) => set("utilizationPct", Math.min(100, numOr0(e.target.value)))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("bsWorkDaysLabel")}</Label>
            <Input inputMode="numeric" value={state.workDays || ""} onChange={(e) => set("workDays", Math.min(31, numOr0(e.target.value)))} />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
          <span className="font-medium">{t("ocMaxDaily")}</span>
          <span className="text-lg font-bold text-primary">
            {Number.isFinite(maxDaily) ? maxDaily : "—"} {t("ocCustomersUnit")}
          </span>
        </div>
      </div>

      {/* 결과 */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{t("ocResultTitle")}</h2>
          <Badge variant="secondary" className="text-xs">2026</Badge>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label={t("ocFixedTotal")} value={fmt(state.monthlyFixed)} />
          <Row label={t("ocVariableRatio")} value={`${Math.round(variableRatio * 1000) / 10}%`} />
          {state.retailEnabled && <Row label={t("ocRetailContribution")} value={fmtSigned(productContribution)} />}

          {bepPossible ? (
            <>
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="font-semibold">{t("ocBepLabel")}</span>
                <span className="text-2xl font-bold text-primary">{fmt(bep)}{t("perMonth")}</span>
              </div>
              <Row
                label={t("ocDailyCustomers")}
                value={`${dailyNeed} ${t("ocCustomersUnit")}（${fmt(mix.avgTicket)} × ${state.workDays}）`}
                strong
              />
              <Row label={t("ocMaxDaily")} value={`${Number.isFinite(maxDaily) ? maxDaily : "—"} ${t("ocCustomersUnit")}`} />

              {capacityExceeded && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("ocCapacityWarning")}</span>
                </div>
              )}

              {/* 시나리오 80/100/130% */}
              <div className="pt-4">
                <p className="font-medium mb-2">{t("ocScenarioTitle")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border rounded-lg overflow-hidden min-w-[440px]">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium"></th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioRevenue")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioProfit")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioDaily")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioCapacity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => {
                        const daily = calcDailyCustomers(s.revenue, mix.avgTicket, state.workDays);
                        const capPct = Number.isFinite(maxDaily) && maxDaily > 0
                          ? Math.round((daily / maxDaily) * 100)
                          : null;
                        const overCap = capPct !== null && capPct > 100;
                        return (
                          <tr key={s.pct} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">{Math.round(s.pct * 100)}%</td>
                            <td className="px-3 py-2 text-right">{fmt(s.revenue)}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${s.profit > 0 ? "text-emerald-600" : s.profit < 0 ? "text-red-500" : ""}`}>
                              {fmtSigned(s.profit)}
                            </td>
                            <td className={`px-3 py-2 text-right ${overCap ? "text-red-500 font-semibold" : ""}`}>{daily}</td>
                            <td className={`px-3 py-2 text-right ${overCap ? "text-red-500 font-semibold" : ""}`}>
                              {capPct !== null ? `${capPct}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button onClick={saveImage} variant="outline" className="w-full gap-2 mt-2">
                <Download className="w-4 h-4" />{t("saveImage")}
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed">
              {t("ocBepImpossible")}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5 px-1">
        <p>⚠️ {t("ocDisclaimer")}</p>
        <p>{t("ratesNote")}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function DerivedCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border px-2 py-3">
      <p className="text-[11px] text-muted-foreground leading-tight mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
