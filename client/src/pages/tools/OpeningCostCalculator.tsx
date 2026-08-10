import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Store, Download, ChevronDown, Calculator, ArrowRight, Plus, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { FEATURES } from "@shared/const";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import {
  DEFAULT_UTILIZATION,
  calcBep,
  calcDailyCustomers,
  calcInitialInvestment,
  calcMaxDailyCustomers,
  calcProductContribution,
  calcScenarios,
  calcServiceMix,
  calcStaffCost,
  normalizeShares,
  type ServiceRow,
} from "@/lib/openingCostCalc";

type SavedInputs = {
  monthlyRent: number;
  depositMonths: number;
  transferFee: number;
  interior: number;
  equipment: number;
  initialSupplies: number;
  reservePct: number;
  staffCount: number;
  staffSalary: number;
  utilities: number;
  marketing: number;
  otherFixed: number;
  services: ServiceRow[];
  commissionPct: number;
  cardFeePct: number;
  workDays: number;
  retailEnabled: boolean;
  retailRevenue: number;
  retailCostPct: number;
  retailIncentivePct: number;
  designers: number;
  seats: number;
  dailyHours: number;
  utilizationPct: number;
};

const STORAGE_KEY = "openingCostInputs.v2";

// 다올살롱 실측 모델 기본 5행 (전부 수정 가능)
const DEFAULT_SERVICES: ServiceRow[] = [
  { name: "剪髮", price: 600, materialPct: 0, sharePct: 40, minutes: 40 },
  { name: "燙髮", price: 2_500, materialPct: 30, sharePct: 20, minutes: 120 },
  { name: "染髮", price: 2_200, materialPct: 30, sharePct: 25, minutes: 100 },
  { name: "護髮", price: 1_500, materialPct: 50, sharePct: 10, minutes: 60 },
  { name: "其他", price: 800, materialPct: 10, sharePct: 5, minutes: 40 },
];

const DEFAULTS: SavedInputs = {
  monthlyRent: 40_000,
  depositMonths: 2,
  transferFee: 0,
  interior: 500_000,
  equipment: 200_000,
  initialSupplies: 50_000,
  reservePct: 10,
  staffCount: 1,
  staffSalary: 32_000,
  utilities: 8_000,
  marketing: 5_000,
  otherFixed: 10_000,
  services: DEFAULT_SERVICES,
  commissionPct: 35,
  cardFeePct: 2,
  workDays: 26,
  retailEnabled: false,
  retailRevenue: 30_000,
  retailCostPct: 50,
  retailIncentivePct: 10,
  designers: 1,
  seats: 3,
  dailyHours: 10,
  utilizationPct: DEFAULT_UTILIZATION * 100,
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

export default function OpeningCostCalculator() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [state, setState] = useState<SavedInputs>(loadSaved);
  const [open, setOpen] = useState({ a: true, b: true, c: true, d: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SEO: zh-TW title/meta, ?lang=ko는 noindex
  useEffect(() => {
    document.title = t("ocPageTitle");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("ocMetaDescription");
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

  // ─── 계산 ───
  const initial = useMemo(
    () =>
      calcInitialInvestment({
        monthlyRent: state.monthlyRent,
        depositMonths: state.depositMonths,
        transferFee: state.transferFee,
        interior: state.interior,
        equipment: state.equipment,
        initialSupplies: state.initialSupplies,
        reservePct: state.reservePct,
      }),
    [state]
  );
  const recoverable = initial.total - initial.deposit; // 押金 제외 회수 대상

  const staff = useMemo(
    () => calcStaffCost(state.staffCount, state.staffSalary),
    [state.staffCount, state.staffSalary]
  );

  const fixedTotal =
    state.monthlyRent + staff.total + state.utilities + state.marketing + state.otherFixed;

  const mix = useMemo(() => calcServiceMix(state.services), [state.services]);
  const shareSumOk = Math.abs(mix.shareSum - 100) < 0.05;

  const variableRatio = mix.materialRate + state.commissionPct / 100 + state.cardFeePct / 100;
  const variableTooHigh = variableRatio > 0.95;

  const productContribution = state.retailEnabled
    ? calcProductContribution(state.retailRevenue, state.retailCostPct, state.retailIncentivePct)
    : 0;

  const bep = calcBep(fixedTotal, variableRatio);
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
    () => (bepPossible ? calcScenarios(bep, variableRatio, fixedTotal, recoverable, productContribution) : []),
    [bep, variableRatio, fixedTotal, recoverable, productContribution, bepPossible]
  );

  // ─── 결과 이미지 저장 ───
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bepPossible) return;
    const scale = 2;
    const W = 420;
    const rows: [string, string][] = [
      [t("ocInitialTotal"), fmt(initial.total)],
      [t("ocFixedTotal"), fmt(fixedTotal)],
      [t("ocVariableRatio"), `${Math.round(variableRatio * 100)}%`],
      [t("ocMixAvgTicket"), fmt(mix.avgTicket)],
      [t("ocDailyCustomers"), `${dailyNeed} ${t("ocCustomersUnit")}`],
      [t("ocMaxDaily"), `${maxDaily} ${t("ocCustomersUnit")}`],
      ...(productContribution > 0
        ? [[t("ocRetailContribution"), fmtSigned(productContribution)] as [string, string]]
        : []),
    ];
    const H = 190 + rows.length * 34 + 60;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px 'Noto Sans TC', sans-serif";
    ctx.fillText(t("ocHeading"), 24, 40);
    let y = 80;
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    for (const [label, value] of rows) {
      ctx.fillStyle = "#555555";
      ctx.fillText(label.length > 20 ? label.slice(0, 20) + "…" : label, 24, y);
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
    ctx.font = "10px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#999999";
    let line = "";
    let cy = y + 44;
    for (const ch of t("ocDisclaimer")) {
      if (ctx.measureText(line + ch).width > W - 48) {
        ctx.fillText(line, 24, cy);
        line = ch;
        cy += 14;
      } else {
        line += ch;
      }
    }
    if (line) ctx.fillText(line, 24, cy);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "opening-cost-estimate.png";
    a.click();
    toast.success(t("saveImage"));
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("ocHeading")}</h1>
        <p className="text-muted-foreground text-sm">{t("ocSubheading")}</p>
      </div>

      {/* A. 초기 투자 */}
      <Section
        title={t("ocSectionInitial")}
        open={open.a}
        onToggle={() => setOpen((o) => ({ ...o, a: !o.a }))}
        summary={fmt(initial.total)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("ocRent")}>
            <Input inputMode="numeric" value={state.monthlyRent || ""} onChange={(e) => set("monthlyRent", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocDepositMonths")}>
            <Select value={String(state.depositMonths)} onValueChange={(v) => set("depositMonths", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} {t("ocMonthsUnit")}（{fmt(state.monthlyRent * m)}）</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("ocTransferFee")}>
            <Input inputMode="numeric" value={state.transferFee || ""} placeholder="0" onChange={(e) => set("transferFee", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocInterior")}>
            <Input inputMode="numeric" value={state.interior || ""} onChange={(e) => set("interior", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocEquipment")}>
            <Input inputMode="numeric" value={state.equipment || ""} onChange={(e) => set("equipment", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocSupplies")}>
            <Input inputMode="numeric" value={state.initialSupplies || ""} onChange={(e) => set("initialSupplies", numOr0(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("ocReserve")}</Label>
            <span className="text-sm font-medium">{state.reservePct}%（{fmt(initial.reserve)}）</span>
          </div>
          <Slider value={[state.reservePct]} min={0} max={30} step={1} onValueChange={([v]) => set("reservePct", v)} />
        </div>
        <ResultLine label={t("ocInitialTotal")} value={fmt(initial.total)} />
      </Section>

      {/* B. 월 고정비 */}
      <Section
        title={t("ocSectionFixed")}
        open={open.b}
        onToggle={() => setOpen((o) => ({ ...o, b: !o.b }))}
        summary={fmt(fixedTotal)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("ocStaffCount")}>
            <Input inputMode="numeric" value={state.staffCount || ""} placeholder="0" onChange={(e) => set("staffCount", Math.min(50, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocStaffSalary")}>
            <Input inputMode="numeric" value={state.staffSalary || ""} onChange={(e) => set("staffSalary", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocUtilities")}>
            <Input inputMode="numeric" value={state.utilities || ""} onChange={(e) => set("utilities", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocMarketing")}>
            <Input inputMode="numeric" value={state.marketing || ""} onChange={(e) => set("marketing", numOr0(e.target.value))} />
          </Field>
          <Field label={t("ocOtherFixed")}>
            <Input inputMode="numeric" value={state.otherFixed || ""} onChange={(e) => set("otherFixed", numOr0(e.target.value))} />
          </Field>
        </div>

        {state.staffCount > 0 && (
          <div className="mt-4 rounded-lg bg-muted/40 border border-border p-4 text-xs space-y-1.5">
            <p className="font-medium text-sm mb-2">{t("ocStaffBurdenTitle")}</p>
            <BurdenRow label={t("ocBurdenLabor")} value={fmt(staff.burden.labor)} />
            <BurdenRow label={t("ocBurdenHealth")} value={fmt(staff.burden.health)} />
            <BurdenRow label={t("ocBurdenPension")} value={fmt(staff.burden.pension)} />
            <div className="border-t border-border pt-2 mt-2">
              <BurdenRow
                label={`${t("ocStaffTotalCost")}（${state.staffCount} × ${fmt(staff.perEmployee)}）`}
                value={fmt(staff.total)}
                strong
              />
            </div>
          </div>
        )}
        <ResultLine label={t("ocFixedTotal")} value={fmt(fixedTotal)} />
      </Section>

      {/* C. 시술 믹스 & 변동비 */}
      <Section
        title={t("ocSectionVariable")}
        open={open.c}
        onToggle={() => setOpen((o) => ({ ...o, c: !o.c }))}
        summary={`${Math.round(variableRatio * 100)}%`}
      >
        {/* 시술 테이블 */}
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
                      aria-label={t("ocServiceRemove")}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => set("services", [...state.services, { name: "", price: 1_000, materialPct: 10, sharePct: 0, minutes: 60 }])}>
            <Plus className="w-3.5 h-3.5" />{t("ocServiceAdd")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("ocServiceHint")}</span>
        </div>

        {/* 비중 합계 검증 */}
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

        {/* 파생값 */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <DerivedCard label={t("ocMixAvgTicket")} value={fmt(mix.avgTicket)} />
          <DerivedCard label={t("ocMixMaterialRate")} value={`${Math.round(mix.materialRate * 1000) / 10}%`} />
          <DerivedCard label={t("ocMixAvgMinutes")} value={`${mix.avgMinutes} ${t("ocMinutesUnit")}`} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t("ocCommissionRatio")}>
            <Input inputMode="numeric" value={state.commissionPct || ""} placeholder="0" onChange={(e) => set("commissionPct", Math.min(100, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocCardFee")}>
            <Input inputMode="numeric" value={state.cardFeePct || ""} placeholder="0" onChange={(e) => set("cardFeePct", Math.min(100, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocWorkDays")}>
            <Input inputMode="numeric" value={state.workDays || ""} onChange={(e) => set("workDays", Math.min(31, numOr0(e.target.value)))} />
          </Field>
        </div>

        {variableTooHigh && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t("ocVariableWarning")}</span>
          </div>
        )}

        {/* 店販 토글 */}
        <div className="mt-5 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("ocRetailToggle")}</Label>
            <Switch checked={state.retailEnabled} onCheckedChange={(v) => set("retailEnabled", v)} />
          </div>
          {state.retailEnabled && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={t("ocRetailRevenue")}>
                <Input inputMode="numeric" value={state.retailRevenue || ""} onChange={(e) => set("retailRevenue", numOr0(e.target.value))} />
              </Field>
              <Field label={t("ocRetailCost")}>
                <Input inputMode="numeric" value={state.retailCostPct || ""} placeholder="0" onChange={(e) => set("retailCostPct", Math.min(100, numOr0(e.target.value)))} />
              </Field>
              <Field label={t("ocRetailIncentive")}>
                <Input inputMode="numeric" value={state.retailIncentivePct || ""} placeholder="0" onChange={(e) => set("retailIncentivePct", Math.min(100, numOr0(e.target.value)))} />
              </Field>
            </div>
          )}
          {state.retailEnabled && (
            <ResultLine label={t("ocRetailContribution")} value={fmtSigned(productContribution)} />
          )}
        </div>
      </Section>

      {/* D. 캐파 체크 */}
      <Section
        title={t("ocSectionCapacity")}
        open={open.d}
        onToggle={() => setOpen((o) => ({ ...o, d: !o.d }))}
        summary={`${Number.isFinite(maxDaily) ? maxDaily : "—"} ${t("ocCustomersUnit")}`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={t("ocDesigners")}>
            <Input inputMode="numeric" value={state.designers || ""} placeholder="0" onChange={(e) => set("designers", Math.min(50, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocSeats")}>
            <Input inputMode="numeric" value={state.seats || ""} placeholder="0" onChange={(e) => set("seats", Math.min(50, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocDailyHours")}>
            <Input inputMode="numeric" value={state.dailyHours || ""} onChange={(e) => set("dailyHours", Math.min(24, numOr0(e.target.value)))} />
          </Field>
          <Field label={t("ocUtilization")}>
            <Input inputMode="numeric" value={state.utilizationPct || ""} onChange={(e) => set("utilizationPct", Math.min(100, numOr0(e.target.value)))} />
          </Field>
        </div>
        <ResultLine label={t("ocMaxDaily")} value={`${Number.isFinite(maxDaily) ? maxDaily : "—"} ${t("ocCustomersUnit")}`} />
      </Section>

      {/* 결과 */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">{t("ocResultTitle")}</h2>
          <Badge variant="secondary" className="text-xs">2026</Badge>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label={t("ocInitialTotal")} value={fmt(initial.total)} />
          <Row label={t("ocFixedTotal")} value={fmt(fixedTotal)} />
          <Row label={t("ocVariableRatio")} value={`${Math.round(variableRatio * 100)}%`} />
          {state.retailEnabled && (
            <Row label={t("ocRetailContribution")} value={fmtSigned(productContribution)} />
          )}

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

              {/* 캐파 경고 */}
              {capacityExceeded && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("ocCapacityWarning")}</span>
                </div>
              )}

              {/* 시나리오 3단 */}
              <div className="pt-4">
                <p className="font-medium mb-2">{t("ocScenarioTitle")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border rounded-lg overflow-hidden min-w-[480px]">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium"></th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioRevenue")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioDaily")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioCapacity")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioProfit")}</th>
                        <th className="px-3 py-2 text-right font-medium">{t("ocScenarioPayback")}</th>
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
                            <td className={`px-3 py-2 text-right ${overCap ? "text-red-500 font-semibold" : ""}`}>{daily}</td>
                            <td className={`px-3 py-2 text-right ${overCap ? "text-red-500 font-semibold" : ""}`}>
                              {capPct !== null ? `${capPct}%` : "—"}
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold ${s.profit > 0 ? "text-emerald-600" : s.profit < 0 ? "text-red-500" : ""}`}>
                              {fmtSigned(s.profit)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {s.paybackMonths !== null
                                ? `${s.paybackMonths} ${t("ocPaybackMonths")}`
                                : s.profit === 0
                                  ? "—"
                                  : t("ocPaybackNever")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{t("ocPaybackNote")}</p>
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

      {/* CTA */}
      <div className={`grid grid-cols-1 ${FEATURES.TRANSFER_CTA_ENABLED ? "sm:grid-cols-2" : ""} gap-3 mb-6`}>
        {FEATURES.TRANSFER_CTA_ENABLED && (
          <Button asChild size="lg" className="gap-2">
            <Link href="/transfers">
              <Store className="w-5 h-5" />{t("ocCtaTransfers")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href="/tools/salary">
            <Calculator className="w-5 h-5" />{t("ocCtaSalary")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5 px-1">
        <p>⚠️ {t("ocDisclaimer")}</p>
        <p>{t("ratesNote")}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function Section({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle} className="bg-white rounded-xl border border-border mb-4">
      <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between text-left">
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2 text-sm text-primary font-medium">
          {summary}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-6 pb-6">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs leading-snug">{label}</Label>
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

// 섹션 하단 소계 라인
function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold text-primary">{value}</span>
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

function BurdenRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
