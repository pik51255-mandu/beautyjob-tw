import { Link } from "wouter";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OwnerGate from "@/components/OwnerGate";
import { detectToolLang, makeT, type ToolStringKey } from "@/lib/toolStrings";

// 老闆專區 準備中 페이지 공용 (게이트 포함)
export default function OwnerToolComingSoon({
  icon: Icon,
  titleKey,
  descKey,
}: {
  icon: LucideIcon;
  titleKey: ToolStringKey;
  descKey: ToolStringKey;
}) {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  return (
    <OwnerGate>
      <div className="container py-24 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">{t("hubComingSoon")}</Badge>
        <h1 className="text-3xl font-bold mb-3">{t(titleKey)}</h1>
        <p className="text-muted-foreground leading-relaxed mb-2">{t(descKey)}</p>
        <p className="text-muted-foreground text-sm mb-8">{t("ownerToolComingSoon")}</p>
        <Button asChild size="lg" variant="outline">
          <Link href="/tools"><ArrowLeft className="w-4 h-4 mr-1" />{t("ownerToolBack")}</Link>
        </Button>
      </div>
    </OwnerGate>
  );
}
