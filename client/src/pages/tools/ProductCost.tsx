import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { FlaskConical, Download, Plus, X, AlertTriangle, Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import OwnerGate from "@/components/OwnerGate";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import {
  DEFAULT_CHEMICALS,
  DEFAULT_TREATMENTS,
  MONTHLY_WARN_THRESHOLD,
  calcChemicalCostPerUse,
  calcMonthlyExpected,
  calcTreatmentCost,
  evaluateMonthly,
  type Chemical,
  type Treatment,
} from "@/lib/productCostCalc";

// C-3: 藥水成本計算器 — 準備中 페이지를 실도구로 교체 (老闆專區, OwnerGate 적용)

type MonthRecord = {
  month: string;      // YYYY-MM
  expected: number;
  actual: number;
  diff: number;
};

type SavedState = {
  chemicals: Chemical[];
  treatments: Treatment[];
  counts: Record<number, number>;
  month: string;
  actual: number;
  records: MonthRecord[];
};

const STORAGE_KEY = "productCostInputs.v1";

const DEFAULTS: SavedState = {
  chemicals: DEFAULT_CHEMICALS,
  treatments: DEFAULT_TREATMENTS,
  counts: { 1: 30, 2: 15, 3: 20 },
  month: "",
  actual: 0,
  records: [],
};

function loadSaved(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
    if (!Array.isArray(parsed.chemicals) || parsed.chemicals.length === 0) parsed.chemicals = DEFAULT_CHEMICALS;
    if (!Array.isArray(parsed.treatments) || parsed.treatments.length === 0) parsed.treatments = DEFAULT_TREATMENTS;
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
const fmt1 = (n: number) => `NT$ ${(Math.round(n * 10) / 10).toLocaleString("zh-TW")}`;
const pct1 = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default function ProductCost() {
  return (
    <OwnerGate>
      <ProductCostInner />
    </OwnerGate>
  );
}

function ProductCostInner() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [state, setState] = useState<SavedState>(loadSaved);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SEO: zh-TW title/meta, ?lang=ko는 noindex (老闆專區는 게이트 뒤라 색인 가치 낮지만 동일 규칙 유지)
  useEffect(() => {
    document.title = t("pcPageTitle");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("pcMetaDescription");
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

  const set = <K extends keyof SavedState>(key: K, value: SavedState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const setChemical = (i: number, patch: Partial<Chemical>) =>
    setState((s) => {
      const chemicals = [...s.chemicals];
      chemicals[i] = { ...chemicals[i], ...patch };
      return { ...s, chemicals };
    });

  const setTreatment = (i: number, patch: Partial<Treatment>) =>
    setState((s) => {
      const treatments = [...s.treatments];
      treatments[i] = { ...treatments[i], ...patch };
      return { ...s, treatments };
    });

  // 시술의 약제 사용 토글/배수
  const toggleTreatmentChemical = (ti: number, chemicalId: number) =>
    setState((s) => {
      const treatments = [...s.treatments];
      const tr = treatments[ti];
      const exists = tr.chemicals.some((c) => c.chemicalId === chemicalId);
      treatments[ti] = {
        ...tr,
        chemicals: exists
          ? tr.chemicals.filter((c) => c.chemicalId !== chemicalId)
          : [...tr.chemicals, { chemicalId, multiplier: 1 }],
      };
      return { ...s, treatments };
    });

  const setMultiplier = (ti: number, chemicalId: number, multiplier: number) =>
    setState((s) => {
      const treatments = [...s.treatments];
      const tr = treatments[ti];
      treatments[ti] = {
        ...tr,
        chemicals: tr.chemicals.map((c) => (c.chemicalId === chemicalId ? { ...c, multiplier } : c)),
      };
      return { ...s, treatments };
    });

  // ─── 계산 ───
  const treatmentResults = useMemo(
    () => state.treatments.map((tr) => ({ treatment: tr, ...calcTreatmentCost(tr, state.chemicals) })),
    [state.treatments, state.chemicals]
  );
  const expected = useMemo(
    () => calcMonthlyExpected(state.treatments, state.counts, state.chemicals),
    [state.treatments, state.counts, state.chemicals]
  );
  const evaluation = evaluateMonthly(expected, state.actual, MONTHLY_WARN_THRESHOLD);

  const saveRecord = () => {
    if (!state.month) {
      toast.error(t("pcMonthLabel"));
      return;
    }
    const record: MonthRecord = {
      month: state.month,
      expected: Math.round(expected),
      actual: Math.round(state.actual),
      diff: evaluation.diff,
    };
    setState((s) => ({
      ...s,
      records: [...s.records.filter((r) => r.month !== record.month), record].sort((a, b) =>
        a.month < b.month ? 1 : -1
      ),
    }));
    toast.success(t("pcRecordSaved"));
  };

  // ─── 결과 이미지 저장 ───
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = 2;
    const W = 420;
    const rows: [string, string][] = treatmentResults.map(({ treatment, cost, materialRate }) => [
      treatment.name || "—",
      `${fmt1(cost)}（${pct1(materialRate)}）`,
    ]);
    rows.push([t("pcExpectedLabel"), fmt(expected)]);
    const H = 170 + rows.length * 34 + 60;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px 'Noto Sans TC', sans-serif";
    ctx.fillText(t("pcHeading"), 24, 40);
    ctx.font = "12px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#888888";
    ctx.fillText(t("pcResultTitle"), 24, 62);
    let y = 96;
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    for (const [label, value] of rows) {
      ctx.fillStyle = "#555555";
      ctx.fillText(label.length > 14 ? label.slice(0, 14) + "…" : label, 24, y);
      ctx.fillStyle = "#111111";
      ctx.textAlign = "right";
      ctx.fillText(value, W - 24, y);
      ctx.textAlign = "left";
      y += 34;
    }
    ctx.font = "10px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#999999";
    ctx.fillText(t("pcSalaryRefNote").slice(0, 40), 24, y + 10);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "product-cost.png";
    a.click();
    toast.success(t("saveImage"));
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("pcHeading")}</h1>
        <p className="text-muted-foreground text-sm">{t("pcSubheading")}</p>
      </div>

      {/* A. 약제 목록 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <h2 className="font-semibold mb-3">{t("pcSectionChemicals")}</h2>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left pb-2 font-medium">{t("pcChemName")}</th>
                <th className="text-right pb-2 font-medium">{t("pcChemPrice")}</th>
                <th className="text-right pb-2 font-medium">{t("pcChemTotal")}</th>
                <th className="text-right pb-2 font-medium">{t("pcChemUsage")}</th>
                <th className="text-right pb-2 font-medium">{t("pcChemCostPerUse")}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {state.chemicals.map((chem, i) => (
                <tr key={chem.id} className="border-t border-border">
                  <td className="py-1.5 pr-2">
                    <Input className="h-8 text-xs" value={chem.name} onChange={(e) => setChemical(i, { name: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2 w-24">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={chem.price || ""} onChange={(e) => setChemical(i, { price: numOr0(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2 w-24">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={chem.totalAmount || ""} onChange={(e) => setChemical(i, { totalAmount: numOr0(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2 w-20">
                    <Input className="h-8 text-xs text-right" inputMode="numeric" value={chem.usagePerService || ""} onChange={(e) => setChemical(i, { usagePerService: numOr0(e.target.value) })} />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-semibold whitespace-nowrap">
                    {fmt1(calcChemicalCostPerUse(chem))}
                  </td>
                  <td className="py-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                      disabled={state.chemicals.length <= 1}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          chemicals: s.chemicals.filter((_, j) => j !== i),
                          treatments: s.treatments.map((tr) => ({
                            ...tr,
                            chemicals: tr.chemicals.filter((c) => c.chemicalId !== chem.id),
                          })),
                        }))
                      }
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
          onClick={() =>
            setState((s) => ({
              ...s,
              chemicals: [...s.chemicals, {
                id: Math.max(0, ...s.chemicals.map((c) => c.id)) + 1,
                name: "", price: 0, totalAmount: 1, usagePerService: 1,
              }],
            }))
          }>
          <Plus className="w-3.5 h-3.5" />{t("pcChemAdd")}
        </Button>
      </div>

      {/* B. 시술 정의 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <h2 className="font-semibold mb-3">{t("pcSectionTreatments")}</h2>
        <div className="space-y-4">
          {state.treatments.map((tr, ti) => {
            const result = treatmentResults[ti];
            return (
              <div key={tr.id} className="rounded-lg border border-border p-4">
                <div className="flex items-end gap-2 mb-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">{t("pcTreatName")}</Label>
                    <Input className="h-8 text-sm" value={tr.name} onChange={(e) => setTreatment(ti, { name: e.target.value })} />
                  </div>
                  <div className="w-28 space-y-1.5">
                    <Label className="text-xs">{t("pcTreatPrice")}</Label>
                    <Input className="h-8 text-sm text-right" inputMode="numeric" value={tr.price || ""} onChange={(e) => setTreatment(ti, { price: numOr0(e.target.value) })} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                    disabled={state.treatments.length <= 1}
                    onClick={() =>
                      setState((s) => {
                        const counts = { ...s.counts };
                        delete counts[tr.id];
                        return { ...s, counts, treatments: s.treatments.filter((_, j) => j !== ti) };
                      })
                    }
                    aria-label={t("pcRemove")}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Label className="text-xs">{t("pcTreatChemicals")}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {state.chemicals.map((chem) => {
                    const used = tr.chemicals.find((c) => c.chemicalId === chem.id);
                    return (
                      <div key={chem.id} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        used ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
                      }`}>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="accent-primary" checked={!!used}
                            onChange={() => toggleTreatmentChemical(ti, chem.id)} />
                          {chem.name || "—"}
                        </label>
                        {used && (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">×</span>
                            <Input className="h-6 w-12 text-xs text-right px-1" inputMode="numeric"
                              value={used.multiplier || ""}
                              onChange={(e) => setMultiplier(ti, chem.id, numOr0(e.target.value))} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm">
                  <span className="text-muted-foreground">{t("pcTreatCost")}</span>
                  <span className="font-semibold">
                    {fmt1(result.cost)}
                    <span className="ml-2 text-primary">{t("pcTreatRate")} {pct1(result.materialRate)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" className="gap-1 mt-3"
          onClick={() =>
            setState((s) => ({
              ...s,
              treatments: [...s.treatments, {
                id: Math.max(0, ...s.treatments.map((tr) => tr.id)) + 1,
                name: "", price: 1_000, chemicals: [],
              }],
            }))
          }>
          <Plus className="w-3.5 h-3.5" />{t("pcTreatAdd")}
        </Button>
      </div>

      {/* 시술별 재료율 카드 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <h2 className="font-semibold mb-3">{t("pcResultTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {treatmentResults.map(({ treatment, cost, materialRate }) => (
            <div key={treatment.id} className="rounded-lg bg-muted/40 border border-border px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{treatment.name || "—"}</p>
              <p className="text-lg font-bold text-primary">{pct1(materialRate)}</p>
              <p className="text-[11px] text-muted-foreground">{fmt1(cost)}／回</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {t("pcSalaryRefNote")}
          <Link href="/tools/salary" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
            {t("pcSalaryRefCta")}<ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>

      {/* C. 월간 검증 */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="font-semibold mb-3">{t("pcSectionMonthly")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs">{t("pcMonthLabel")}</Label>
            <Input type="month" className="h-9 text-sm" value={state.month} onChange={(e) => set("month", e.target.value)} />
          </div>
          {state.treatments.map((tr) => (
            <div key={tr.id} className="space-y-1.5">
              <Label className="text-xs truncate block">{tr.name || "—"}（{t("pcCountUnit")}）</Label>
              <Input className="h-9 text-sm text-right" inputMode="numeric" value={state.counts[tr.id] || ""}
                placeholder="0"
                onChange={(e) => set("counts", { ...state.counts, [tr.id]: numOr0(e.target.value) })} />
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("pcExpectedLabel")}</span>
            <span className="font-semibold">{fmt(expected)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground shrink-0">{t("pcActualLabel")}</span>
            <Input className="h-9 w-36 text-right" inputMode="numeric" value={state.actual || ""}
              placeholder="0"
              onChange={(e) => set("actual", numOr0(e.target.value))} />
          </div>
          {state.actual > 0 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium">{t("pcDiffLabel")}</span>
              <span className={`font-bold ${evaluation.diff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                {evaluation.diff >= 0 ? "+" : "−"}{fmt(Math.abs(evaluation.diff)).replace("NT$ ", "NT$ ")}（{evaluation.diffPct >= 0 ? "+" : ""}{pct1(evaluation.diffPct)}）
              </span>
            </div>
          )}
          {evaluation.warn && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("pcMonthlyWarn")}</span>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={saveRecord}>
            {t("pcSaveRecord")}
          </Button>
        </div>

        {/* 저장된 월별 기록 */}
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("pcSavedRecords")}</p>
          {state.records.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("pcNoRecords")}</p>
          ) : (
            <div className="space-y-1.5">
              {state.records.map((r) => (
                <div key={r.month} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                  <span className="font-medium">{r.month}</span>
                  <span className="text-muted-foreground">
                    {fmt(r.expected)} → {fmt(r.actual)}
                    <span className={`ml-2 font-semibold ${r.diff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {r.diff >= 0 ? "+" : "−"}{Math.abs(r.diff).toLocaleString("zh-TW")}
                    </span>
                  </span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => set("records", state.records.filter((x) => x.month !== r.month))}
                    aria-label={t("pcDeleteRecord")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button onClick={saveImage} variant="outline" className="w-full gap-2 mb-6">
        <Download className="w-4 h-4" />{t("saveImage")}
      </Button>

      <Button asChild size="lg" variant="outline" className="w-full gap-2 mb-6">
        <Link href="/tools/salary">
          <Calculator className="w-5 h-5" />{t("pcSalaryRefCta")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>

      <div className="text-xs text-muted-foreground leading-relaxed px-1">
        <p>{t("ratesNote")}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
