import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Store, Download, ChevronDown, Calculator, ArrowRight, Wallet, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  calcInitialInvestment,
  calcPreparationFund,
  calcStaffCost,
} from "@/lib/openingCostCalc";

// C-2.3: 이 도구는 "초기 투자 + 월 고정비"만 담당한다.
// 시술 믹스·BEP·캐파·시나리오·店販은 페이지에서 제거 —
// 계산 모듈(openingCostCalc.ts)의 해당 함수·테스트는 C-3 재사용을 위해 보존.

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
  workingCapMonths: number;
};

const STORAGE_KEY = "openingCostInputs.v3";

const DEFAULTS: SavedInputs = {
  monthlyRent: 40_000,
  depositMonths: 2,
  transferFee: 0,
  interior: 400_000,
  equipment: 150_000,
  initialSupplies: 50_000,
  reservePct: 10,
  staffCount: 1,
  staffSalary: 32_000,
  utilities: 8_000,
  marketing: 5_000,
  otherFixed: 5_000,
  workingCapMonths: 6,
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

const fmt = (n: number) => `NT$ ${Math.round(n).toLocaleString("zh-TW")}`;

export default function OpeningCostCalculator() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [state, setState] = useState<SavedInputs>(loadSaved);
  const [open, setOpen] = useState({ a: true, b: true });
  const [burdenOpen, setBurdenOpen] = useState(false);
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
  const nonRefundable = initial.total - initial.deposit;

  const staff = useMemo(
    () => calcStaffCost(state.staffCount, state.staffSalary),
    [state.staffCount, state.staffSalary]
  );

  const fixedTotal =
    state.monthlyRent + staff.total + state.utilities + state.marketing + state.otherFixed;

  const prepFund = calcPreparationFund(initial.total, fixedTotal, state.workingCapMonths);

  // ─── 결과 이미지 저장 ───
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = 2;
    const W = 420;
    const rows: [string, string][] = [
      [t("ocInitialTotal"), fmt(initial.total)],
      [`└ ${t("ocRefundable")}`, fmt(initial.deposit)],
      [`└ ${t("ocNonRefundable")}`, fmt(nonRefundable)],
      [t("ocFixedTotal"), fmt(fixedTotal)],
      [`└ ${t("ocStaffTotalCost")}`, fmt(staff.total)],
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
    ctx.fillText(`${t("ocPrepFundTitle")}（${state.workingCapMonths}M）`, 24, y + 16);
    ctx.textAlign = "right";
    ctx.fillText(fmt(prepFund), W - 24, y + 16);
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

        {/* 고용주 부담 내역 펼쳐보기 */}
        {state.staffCount > 0 && (
          <Collapsible open={burdenOpen} onOpenChange={setBurdenOpen} className="mt-4 rounded-lg bg-muted/40 border border-border">
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between text-left">
              <span className="text-sm font-medium">
                {t("ocStaffTotalCost")}：{fmt(staff.total)}
              </span>
              <span className="flex items-center gap-1 text-xs text-primary">
                {t("ocBurdenDetailToggle")}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${burdenOpen ? "rotate-180" : ""}`} />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 text-xs space-y-1.5">
              <BurdenRow label={t("ocStaffSalary")} value={fmt(state.staffSalary)} />
              <BurdenRow label={t("ocBurdenLabor")} value={fmt(staff.burden.labor)} />
              <BurdenRow label={t("ocBurdenHealth")} value={fmt(staff.burden.health)} />
              <BurdenRow label={t("ocBurdenPension")} value={fmt(staff.burden.pension)} />
              <div className="border-t border-border pt-2 mt-2">
                <BurdenRow
                  label={`${state.staffCount} × ${fmt(staff.perEmployee)}`}
                  value={fmt(staff.total)}
                  strong
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Section>

      {/* 출력 카드 3장 */}
      <div className="space-y-4 mb-6">
        {/* ① 초기 투자 총액 */}
        <ResultCard
          icon={<Wallet className="w-5 h-5" />}
          title={t("ocInitialTotal")}
          value={fmt(initial.total)}
        >
          <div className="space-y-1.5 text-xs">
            <BurdenRow label={t("ocRefundable")} value={fmt(initial.deposit)} />
            <BurdenRow label={t("ocNonRefundable")} value={fmt(nonRefundable)} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {t("ocDepositRefundNote").replace("{amount}", Math.round(initial.deposit).toLocaleString("zh-TW"))}
          </p>
        </ResultCard>

        {/* ② 월 고정비 합계 */}
        <ResultCard
          icon={<Calculator className="w-5 h-5" />}
          title={t("ocFixedTotal")}
          value={`${fmt(fixedTotal)}${t("perMonth")}`}
        >
          <div className="space-y-1.5 text-xs">
            <BurdenRow label={t("ocRent")} value={fmt(state.monthlyRent)} />
            <BurdenRow label={t("ocStaffTotalCost")} value={fmt(staff.total)} strong />
            <BurdenRow
              label={`${t("ocUtilities")}・${t("ocMarketing")}・${t("ocOtherFixed")}`}
              value={fmt(state.utilities + state.marketing + state.otherFixed)}
            />
          </div>
        </ResultCard>

        {/* ③ 권장 준비 자금 */}
        <ResultCard
          icon={<PiggyBank className="w-5 h-5" />}
          title={t("ocPrepFundTitle")}
          value={fmt(prepFund)}
          highlight
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-xs">{t("ocWorkingCapMonths")}</Label>
              <span className="font-medium">{state.workingCapMonths} {t("ocPaybackMonths")}（{fmt(fixedTotal * state.workingCapMonths)}）</span>
            </div>
            <Slider value={[state.workingCapMonths]} min={0} max={12} step={1} onValueChange={([v]) => set("workingCapMonths", v)} />
            <p className="text-[11px] text-muted-foreground">
              {t("ocPrepFundFormula").replace("{n}", String(state.workingCapMonths))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("ocPrepFundNote").replace("{n}", String(state.workingCapMonths))}
            </p>
          </div>
        </ResultCard>
      </div>

      <Button onClick={saveImage} variant="outline" className="w-full gap-2 mb-6">
        <Download className="w-4 h-4" />{t("saveImage")}
      </Button>

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

function ResultCard({
  icon,
  title,
  value,
  highlight,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
          {title}
        </span>
        <span className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</span>
      </div>
      {children}
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
