import { useEffect } from "react";
import { Link } from "wouter";
import { Wrench, Calculator, Store, Lock, FlaskConical, LineChart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { detectToolLang, makeT, type ToolStringKey } from "@/lib/toolStrings";

// /tools 허브: 設計師工具(공개) + 老闆專區(잠금 안내)
export default function ToolsHub() {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);

  useEffect(() => {
    document.title = t("hubPageTitle");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = t("hubMetaDescription");
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

  const designerTools: { icon: React.ReactNode; titleKey: ToolStringKey; descKey: ToolStringKey; href: string; color: string }[] = [
    {
      icon: <Calculator className="w-6 h-6" />,
      titleKey: "entryCardTitle",
      descKey: "entryCardDesc",
      href: "/tools/salary",
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      icon: <Store className="w-6 h-6" />,
      titleKey: "ocEntryTitle",
      descKey: "ocEntryDesc",
      href: "/tools/opening-cost",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  const ownerTools: { icon: React.ReactNode; titleKey: ToolStringKey; descKey: ToolStringKey; href: string; color: string; comingSoon: boolean }[] = [
    {
      icon: <FlaskConical className="w-6 h-6" />,
      titleKey: "hubProductCostTitle",
      descKey: "hubProductCostDesc",
      href: "/tools/product-cost",
      color: "bg-violet-50 text-violet-600",
      comingSoon: false,
    },
    {
      icon: <LineChart className="w-6 h-6" />,
      titleKey: "hubBizSimTitle",
      descKey: "hubBizSimDesc",
      href: "/tools/biz-simulator",
      color: "bg-emerald-50 text-emerald-600",
      comingSoon: false,
    },
  ];

  return (
    <div className="container py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("hubHeading")}</h1>
        <p className="text-muted-foreground text-sm">{t("hubSubheading")}</p>
      </div>

      {/* 設計師工具 (공개) */}
      <section className="mb-10">
        <h2 className="font-semibold text-lg mb-4">{t("hubSectionDesigner")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {designerTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-white rounded-xl border border-border p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
                {tool.icon}
              </div>
              <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors">{t(tool.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(tool.descKey)}</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-primary font-medium">
                {t("entryCardCta")} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 老闆專區 (잠금) */}
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <h2 className="font-semibold text-lg">{t("hubSectionOwner")}</h2>
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t("hubOwnerDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ownerTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-white rounded-xl border border-border p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative"
            >
              {tool.comingSoon && (
                <Badge className="absolute top-4 right-4 bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  {t("hubComingSoon")}
                </Badge>
              )}
              <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
                {tool.icon}
              </div>
              <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors flex items-center gap-1.5">
                {t(tool.titleKey)}
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(tool.descKey)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
