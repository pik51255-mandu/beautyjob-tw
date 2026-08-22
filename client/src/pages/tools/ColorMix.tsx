import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Palette, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import { applyRobotsMeta } from "@/lib/siteRobots";
import {
  DEVELOPERS, GREY_OPTIONS, SELECTABLE_PERCENTS, TONE_FAMILIES,
  calcMix, diagnoseLift, legalNoteForPercent, percentToVol, railForPercent, resolvePercent, safetyRails, undertoneAt,
  type GreyRatio, type HairLength, type HairVolume, type ToneFamily,
} from "@/lib/colorMixCalc";

// v12: 사이트 5번째 도구. 設計師工具(공개) — OwnerGate 없음.
// 설계 원칙: 배합비는 계산기가 추측하지 않는다. 사용자가 제품 표기를 보고 입력한다.

const STORAGE_KEY = "colorMixInputs.v1";

// 이론 글은 아직 사이트에 게재되지 않았다(/articles/* 라우트 없음).
// 게재되면 이 값만 true 로 바꾸면 안전 레일에 링크가 붙는다.
const ARTICLES_LIVE = false;

type State = {
  base: number;
  target: number;
  tone: ToneFamily;
  grey: GreyRatio;
  length: HairLength;
  volume: HairVolume;
  ratio: number;
  tubeG: number;
  /** null = 진단 권장값 사용. 사용자가 直接 고르면 그 濃度(%)를 쓴다. */
  percentOverride: number | null;
};

const DEFAULTS: State = {
  base: 6, target: 8, tone: "自然", grey: "0",
  length: "中", volume: "中", ratio: 1, tubeG: 60, percentOverride: null,
};

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LENGTHS: HairLength[] = ["短", "中", "長"];
const VOLUMES: HairVolume[] = ["少", "中", "多"];

function Chips<T extends string | number>({
  value, options, onChange, labels,
}: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 min-h-[38px] rounded-lg border text-sm transition-colors ${
            value === o
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border hover:bg-muted"
          }`}
        >
          {labels?.[String(o)] ?? String(o)}
        </button>
      ))}
    </div>
  );
}

export default function ColorMix() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const [s, setS] = useState<State>(load);

  const set = <K extends keyof State>(k: K, v: State[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* 저장 실패는 무시 */ }
  }, [s]);

  useEffect(() => {
    document.title = t("cmPageTitle");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("cmMetaDescription");
    // 사이트 전체 색인 여부는 SITE_PUBLIC 이 정한다. 여기서는 「이 페이지가
    // noindex 를 원하는가」만 넘긴다 — ?lang=ko(QA용)일 때다.
    return applyRobotsMeta(lang === "ko");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const verdict = useMemo(() => diagnoseLift(s.base, s.target), [s.base, s.target]);
  const mix = useMemo(
    () => calcMix(s.length, s.volume, s.ratio, s.tubeG),
    [s.length, s.volume, s.ratio, s.tubeG]
  );
  const rails = useMemo(
    () => safetyRails(verdict, s.grey, s.tone, s.target),
    [verdict, s.grey, s.tone, s.target]
  );
  // 판정은 濃度(%)로만 한다. vol 은 아래에서 라벨로만 쓰인다.
  const usedPercent = useMemo(
    () => resolvePercent(verdict, s.percentOverride),
    [verdict, s.percentOverride]
  );
  const pctRail = usedPercent != null ? railForPercent(usedPercent) : null;
  const allRails = pctRail ? [...rails, pctRail] : rails;
  // 法規 사실은 안전 레일(시술 권고)과 섞지 않고 濃度 선택지 바로 아래에 따로 놓는다.
  const legalNote = usedPercent != null ? legalNoteForPercent(usedPercent) : null;

  const greyLabels = Object.fromEntries(GREY_OPTIONS.map((g) => [g.value, g.labelZh]));

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          {t("cmHeading")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">{t("cmSubheading")}</p>
      </div>

      {/* ── 입력 ── */}
      <section className="rounded-xl border border-border p-5 space-y-5">
        <h2 className="font-semibold">{t("cmSectionInput")}</h2>

        <div className="space-y-2">
          <Label>{t("cmBaseLevel")}</Label>
          <Chips value={s.base} options={LEVELS} onChange={(v) => set("base", v)} />
        </div>

        <div className="space-y-2">
          <Label>{t("cmTargetLevel")}</Label>
          <Chips value={s.target} options={LEVELS} onChange={(v) => set("target", v)} />
        </div>

        <div className="space-y-2">
          <Label>{t("cmTone")}</Label>
          <Chips value={s.tone} options={TONE_FAMILIES} onChange={(v) => set("tone", v)} />
        </div>

        <div className="space-y-2">
          <Label>{t("cmGrey")}</Label>
          <Chips
            value={s.grey}
            options={GREY_OPTIONS.map((g) => g.value)}
            onChange={(v) => set("grey", v)}
            labels={greyLabels}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("cmLength")}</Label>
            <Chips value={s.length} options={LENGTHS} onChange={(v) => set("length", v)} />
          </div>
          <div className="space-y-2">
            <Label>{t("cmVolume")}</Label>
            <Chips value={s.volume} options={VOLUMES} onChange={(v) => set("volume", v)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cm-ratio">{t("cmRatio")}</Label>
            <Input
              id="cm-ratio" inputMode="decimal" value={s.ratio || ""}
              onChange={(e) => set("ratio", Math.max(0, Number(e.target.value) || 0))}
            />
            {/* 배합비는 브랜드마다 달라 계산기가 추측하지 않는다 */}
            <p className="text-xs text-muted-foreground">{t("cmRatioHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cm-tube">{t("cmTubeG")}</Label>
            <Input
              id="cm-tube" inputMode="numeric" value={s.tubeG || ""}
              onChange={(e) => set("tubeG", Math.max(1, Number(e.target.value) || 0))}
            />
          </div>
        </div>
      </section>

      {/* ── 리프트 진단 ── */}
      <section className="rounded-xl border border-border p-5 mt-4">
        <h2 className="font-semibold mb-3">{t("cmSectionLift")}</h2>
        {verdict.kind === "bleach" ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                {t("cmLiftNeeded")} {verdict.lift} {t("cmDegree")} — {t("cmBleachWarn")}
              </div>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">{t("cmLiftNeeded")}</th>
                <td className="py-2 text-right tabular-nums">
                  {verdict.lift} {t("cmDegree")}
                </td>
              </tr>
              <tr>
                <th className="text-left py-2 font-medium">{t("cmRecommendVol")}</th>
                <td className="py-2 text-right tabular-nums font-semibold text-primary">
                  {verdict.percent}%（{percentToVol(verdict.percent)}vol）
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {DEVELOPERS.map((d) => `${d.percent}%=${d.vol}vol`).join("　")}
        </p>

        {/* 권장값을 따르지 않고 直接 고를 수 있다 — 최고 濃度 12% 포함 */}
        <div className="space-y-2 mt-4 pt-4 border-t border-border">
          <Label>{t("cmVolUsed")}</Label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => set("percentOverride", null)}
              className={`px-3 min-h-[38px] rounded-lg border text-sm transition-colors ${
                s.percentOverride === null
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border hover:bg-muted"
              }`}
            >
              {t("cmVolAuto")}
            </button>
            {SELECTABLE_PERCENTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => set("percentOverride", pct)}
                className={`px-3 min-h-[38px] rounded-lg border text-sm transition-colors ${
                  s.percentOverride === pct
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:bg-muted"
                }`}
              >
                {pct}%
                {/* vol 은 보조 라벨 — 표시만이고 로직 진입점이 아니다 */}
                <span className="ml-1 text-xs opacity-60">({percentToVol(pct)}vol)</span>
              </button>
            ))}
          </div>
          {legalNote && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{legalNote}</p>
          )}
        </div>
      </section>

      {/* ── 底色 예측 ── */}
      <section className="rounded-xl border border-border p-5 mt-4">
        <h2 className="font-semibold mb-3">{t("cmSectionUndertone")}</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <th className="text-left py-2 font-medium">{t("cmUndertoneAt")}</th>
              <td className="py-2 text-right font-semibold">
                {s.target} {t("cmDegree")} → {undertoneAt(s.target)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── 분량 ── */}
      <section className="rounded-xl border border-border p-5 mt-4">
        <h2 className="font-semibold mb-3">{t("cmSectionAmount")}</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium">{t("cmCream")}</th>
              <td className="py-2 text-right tabular-nums font-semibold">{mix.creamG} g</td>
            </tr>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium">{t("cmDeveloper")}</th>
              <td className="py-2 text-right tabular-nums font-semibold">{mix.developerMl} ml</td>
            </tr>
            <tr>
              <th className="text-left py-2 font-medium">{t("cmTubes")}</th>
              <td className="py-2 text-right tabular-nums">{mix.tubes}</td>
            </tr>
          </tbody>
        </table>
        {/* 이 한 줄이 이 도구의 차별점 — 결과 화면에 상시 노출 */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mt-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-medium">{t("cmVolumeNote")}</span>
        </div>
      </section>

      {/* ── 안전 레일 ── */}
      {allRails.length > 0 && (
        <section className="rounded-xl border border-border p-5 mt-4">
          <h2 className="font-semibold mb-3">{t("cmSectionRails")}</h2>
          <ul className="space-y-3">
            {allRails.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                <div>
                  <span>{r.textZh}</span>
                  {ARTICLES_LIVE && r.linkSlug && (
                    <a
                      href={`/articles/${r.linkSlug}`}
                      className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5"
                    >
                      {t("cmReadMore")}
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground mt-6 leading-relaxed">{t("cmDisclaimer")}</p>

      <p className="mt-6">
        <Link href="/tools" className="text-primary hover:underline text-sm">
          ← {t("hubPageTitle")}
        </Link>
      </p>
    </div>
  );
}
