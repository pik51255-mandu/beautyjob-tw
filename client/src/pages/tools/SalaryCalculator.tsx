import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Calculator, Download, AlertTriangle, Plus, X, Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import { INSURED_SALARY_BRACKETS } from "@/lib/rates2026";
import { RATE_YEAR } from "@/lib/insuranceTables2026";
import {
  calcAssistantGross,
  calcDeductions,
  calcDesignerGross,
  calcNet,
  HEALTH_DEPENDENT_CAP,
  matchInsuredBracket,
  type PerformanceTier,
} from "@/lib/salaryCalc";

type Mode = "designer" | "assistant";
type Structure = "pure_commission" | "base_plus_commission" | "tiered";

type SavedInputs = {
  mode: Mode;
  structure: Structure;
  performance: number;
  commissionPct: number;
  base: number;
  materialPct: number;
  designationFee: number;
  tiers: PerformanceTier[];
  assistantSalary: number;
  assistantAllowance: number;
  insuredManual: number | null; // null = 자동 매칭
  dependents: number;
  pensionPct: number;
};

const STORAGE_KEY = "salaryCalcInputs.v1";

const DEFAULTS: SavedInputs = {
  mode: "designer",
  structure: "pure_commission",
  performance: 150_000,
  commissionPct: 40,
  base: 0,
  materialPct: 0,
  designationFee: 0,
  tiers: [
    { from: 0, rate: 0.3 },
    { from: 100_000, rate: 0.4 },
  ],
  assistantSalary: 32_000,
  assistantAllowance: 0,
  insuredManual: null,
  dependents: 0,
  pensionPct: 0,
};

function loadSaved(): SavedInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function numOr0(v: string): number {
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const fmt = (n: number) => `NT$ ${n.toLocaleString("zh-TW")}`;

export default function SalaryCalculator() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [state, setState] = useState<SavedInputs>(loadSaved);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SEO: zh-TW title/meta. ?lang=ko(QA용)는 noindex.
  useEffect(() => {
    document.title = t("pageTitle");
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("metaDescription");
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
      // localStorage 불가 환경(사파리 프라이빗 등)은 저장만 생략
    }
  }, [state]);

  const set = <K extends keyof SavedInputs>(key: K, value: SavedInputs[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  // ─── 계산 ───
  const gross = useMemo(() => {
    if (state.mode === "assistant") {
      return calcAssistantGross({ salary: state.assistantSalary, allowance: state.assistantAllowance });
    }
    const common = {
      performance: state.performance,
      materialRate: state.materialPct / 100,
      designationFee: state.designationFee,
    };
    if (state.structure === "pure_commission") {
      return calcDesignerGross({ structure: "pure_commission", ...common, commissionRate: state.commissionPct / 100 });
    }
    if (state.structure === "base_plus_commission") {
      return calcDesignerGross({
        structure: "base_plus_commission",
        ...common,
        base: state.base,
        commissionRate: state.commissionPct / 100,
      });
    }
    return calcDesignerGross({ structure: "tiered", ...common, base: state.base, tiers: state.tiers });
  }, [state]);

  const autoBracket = matchInsuredBracket(gross);
  const insuredBracket = state.insuredManual ?? autoBracket;
  const underReported = insuredBracket < Math.min(autoBracket, gross);

  // 트리거에 그대로 찍을 글자. Radix 포털 복제를 쓰지 않고 state 에서 직접 만든다.
  const insuredLabelText = state.insuredManual === null ? t("insuredAuto") : "";
  const insuredAmountText =
    state.insuredManual === null
      ? `（${autoBracket.toLocaleString("zh-TW")}）`
      : insuredBracket.toLocaleString("zh-TW");

  const deductions = useMemo(
    () =>
      calcDeductions({
        insuredBracket,
        // 健保·勞退는 勞保 급距가 아니라 실급여에서 각자의 분급표로 잡는다.
        grossSalary: gross,
        dependents: state.dependents,
        pensionSelfRate: state.pensionPct / 100,
      }),
    [insuredBracket, gross, state.dependents, state.pensionPct]
  );
  const net = calcNet(gross, deductions);

  // ─── 결과 이미지 저장 (canvas) ───
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = 2;
    const W = 420;
    const rows: [string, string][] = [
      [t("grossLabel"), fmt(gross)],
      [t("laborLabel"), `- ${fmt(deductions.laborInsurance)}`],
      [t("healthLabel"), `- ${fmt(deductions.healthInsurance)}`],
      ...(deductions.pensionSelf > 0 ? [[t("pensionLabel"), `- ${fmt(deductions.pensionSelf)}`] as [string, string]] : []),
      [t("deductionTotal"), `- ${fmt(deductions.total)}`],
    ];
    const H = 210 + rows.length * 34;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px 'Noto Sans TC', sans-serif";
    ctx.fillText(t("heading"), 24, 40);
    ctx.font = "12px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#888888";
    ctx.fillText(t("ratesNote"), 24, 62);
    let y = 100;
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    for (const [label, value] of rows) {
      ctx.fillStyle = "#555555";
      ctx.fillText(label.length > 22 ? label.slice(0, 22) + "…" : label, 24, y);
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
    ctx.font = "bold 22px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#be123c";
    ctx.fillText(t("netLabel"), 24, y + 18);
    ctx.textAlign = "right";
    ctx.fillText(fmt(net), W - 24, y + 18);
    ctx.textAlign = "left";
    ctx.font = "10px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#999999";
    wrapText(ctx, t("disclaimer"), 24, y + 48, W - 48, 14);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "salary-estimate.png";
    a.click();
    toast.success(t("saveImage"));
  };

  const isDesigner = state.mode === "designer";

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calculator className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">{t("subheading")}</p>
      </div>

      {/* 모드 */}
      <Tabs value={state.mode} onValueChange={(v) => set("mode", v as Mode)} className="mb-6">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="designer">{t("modeDesigner")}</TabsTrigger>
          <TabsTrigger value="assistant">{t("modeAssistant")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white rounded-xl border border-border p-6 space-y-5 mb-6">
        {isDesigner ? (
          <>
            {/* 급여 구조 */}
            <div className="space-y-2">
              <Label>{t("structureLabel")}</Label>
              <Select value={state.structure} onValueChange={(v) => set("structure", v as Structure)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pure_commission">{t("structPureCommission")}</SelectItem>
                  <SelectItem value="base_plus_commission">{t("structBasePlus")}</SelectItem>
                  <SelectItem value="tiered">{t("structTiered")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("performance")}>
                <Input inputMode="numeric" value={state.performance || ""} onChange={(e) => set("performance", numOr0(e.target.value))} />
              </Field>
              {state.structure !== "tiered" && (
                <Field label={t("commissionRate")}>
                  <Input inputMode="numeric" value={state.commissionPct || ""} onChange={(e) => set("commissionPct", Math.min(100, numOr0(e.target.value)))} />
                </Field>
              )}
              {state.structure !== "pure_commission" && (
                <Field label={t("baseSalary")}>
                  <Input inputMode="numeric" value={state.base || ""} onChange={(e) => set("base", numOr0(e.target.value))} />
                </Field>
              )}
              <Field label={t("materialRate")}>
                <Input inputMode="numeric" value={state.materialPct || ""} onChange={(e) => set("materialPct", Math.min(100, numOr0(e.target.value)))} />
              </Field>
              <Field label={t("designationFee")}>
                <Input inputMode="numeric" value={state.designationFee || ""} onChange={(e) => set("designationFee", numOr0(e.target.value))} />
              </Field>
            </div>

            {/* 級距制 편집 */}
            {state.structure === "tiered" && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{t("tierHint")}</p>
                {state.tiers.map((tier, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <Field label={i === 0 ? t("tierFrom") : undefined} className="flex-1">
                      <Input inputMode="numeric" value={tier.from || ""} placeholder="0"
                        onChange={(e) => {
                          const tiers = [...state.tiers];
                          tiers[i] = { ...tiers[i], from: numOr0(e.target.value) };
                          set("tiers", tiers);
                        }} />
                    </Field>
                    <Field label={i === 0 ? t("tierRate") : undefined} className="w-28">
                      <Input inputMode="numeric" value={tier.rate * 100 || ""}
                        onChange={(e) => {
                          const tiers = [...state.tiers];
                          tiers[i] = { ...tiers[i], rate: Math.min(100, numOr0(e.target.value)) / 100 };
                          set("tiers", tiers);
                        }} />
                    </Field>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground"
                      disabled={state.tiers.length <= 1}
                      onClick={() => set("tiers", state.tiers.filter((_, j) => j !== i))}
                      aria-label={t("tierRemove")}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1"
                  onClick={() => {
                    const last = state.tiers[state.tiers.length - 1];
                    set("tiers", [...state.tiers, { from: (last?.from ?? 0) + 100_000, rate: last?.rate ?? 0.3 }]);
                  }}>
                  <Plus className="w-3.5 h-3.5" />{t("tierAdd")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("assistantSalary")}>
              <Input inputMode="numeric" value={state.assistantSalary || ""} onChange={(e) => set("assistantSalary", numOr0(e.target.value))} />
            </Field>
            <Field label={t("assistantAllowance")}>
              <Input inputMode="numeric" value={state.assistantAllowance || ""} onChange={(e) => set("assistantAllowance", numOr0(e.target.value))} />
            </Field>
          </div>
        )}

        {/* 投保薪資 */}
        <div className="space-y-2">
          <Label>{t("insuredLabel")}</Label>
          <Select
            value={state.insuredManual === null ? "auto" : String(state.insuredManual)}
            onValueChange={(v) => set("insuredManual", v === "auto" ? null : Number(v))}
          >
            {/* SelectValue 에 children 을 준다 — Radix 기본 동작(선택된 SelectItem 의 텍스트를
                트리거로 포털 복제)을 끄기 위해서다. 기본 동작이면 트리거의 글자가 React 가
                직접 소유하지 않는 복제 노드라, 번역기가 그 노드를 래퍼로 감싸는 순간
                낡은 사본이 남아 가로로 증식하고 값도 낡은 급距에 머문다(실측 2026-08-22).
                여기서 children 을 주면 트리거 글자는 state 에서 파생된 평범한 텍스트가 되어
                항상 하나이고 항상 최신이다. */}
            <SelectTrigger>
              {/* 숫자만 translate="no" — 라벨은 번역되게 둔다. 중국어를 못 읽는 방문자의
                  접근성은 지키면서, 번역기가 금액 노드를 갈아끼우는 것만 막는다. */}
              <SelectValue>
                <span>{insuredLabelText}</span>
                <span translate="no">{insuredAmountText}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* 항목 텍스트에는 변하는 숫자를 넣지 않는다 — 열려 있는 동안 값이 바뀌면
                  같은 문제의 씨앗이 된다. 실제 적용 급距는 아래 줄에 따로 보여준다. */}
              <SelectItem value="auto">{t("insuredAuto")}</SelectItem>
              {INSURED_SALARY_BRACKETS.map((b) => (
                <SelectItem key={b} value={String(b)}>{b.toLocaleString("zh-TW")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground" data-testid="insured-applied">
            {t("insuredApplied")}{" "}
            <strong translate="no">{insuredBracket.toLocaleString("zh-TW")}</strong>
          </p>
          {underReported && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("insuredWarning")}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("dependents")}>
            {/* 健保法 第18條第2項 — 眷屬은 3口까지만 계산된다. 4명 이상 넣어도 3口로 잡히므로
                입력 자체를 3 에서 끊는다(넣을 수 있는데 결과가 안 바뀌면 버그로 읽힌다). */}
            <Input inputMode="numeric" value={state.dependents || ""} placeholder="0" onChange={(e) => set("dependents", Math.min(HEALTH_DEPENDENT_CAP, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("pensionSelfRate")}>
            <Input inputMode="numeric" value={state.pensionPct || ""} placeholder="0" onChange={(e) => set("pensionPct", Math.min(6, numOr0(e.target.value)))} />
          </Field>
        </div>
      </div>

      {/* 결과 */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{t("resultTitle")}</h2>
          <Badge variant="secondary" className="text-xs">{RATE_YEAR}</Badge>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label={t("grossLabel")} value={fmt(gross)} strong />
          <Row label={t("laborLabel")} value={`- ${fmt(deductions.laborInsurance)}`} />
          <Row
            label={`${t("healthLabel")}${state.dependents > 0 ? `（${t("healthDependents")} ${state.dependents}）` : ""}`}
            value={`- ${fmt(deductions.healthInsurance)}`}
          />
          {deductions.pensionSelf > 0 && <Row label={t("pensionLabel")} value={`- ${fmt(deductions.pensionSelf)}`} />}
          <Row label={t("deductionTotal")} value={`- ${fmt(deductions.total)}`} />
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <span className="font-semibold">{t("netLabel")}</span>
            <span className="text-2xl font-bold text-primary">{fmt(net)}<span className="text-sm font-normal text-muted-foreground">{t("perMonth")}</span></span>
          </div>
          <Button onClick={saveImage} variant="outline" className="w-full gap-2 mt-2">
            <Download className="w-4 h-4" />{t("saveImage")}
          </Button>
        </div>
      </div>

      <Button asChild size="lg" variant="outline" className="w-full gap-2 mb-6">
        <Link href="/tools/opening-cost">
          <Store className="w-5 h-5" />{t("ocEntryTitle")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>

      <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5 px-1">
        <p>⚠️ {t("disclaimer")}</p>
        <p>{t("ratesNote")}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function Field({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {label && <Label className="text-xs leading-snug">{label}</Label>}
      {children}
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  let line = "";
  let cy = y;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line += ch;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
