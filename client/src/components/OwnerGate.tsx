import { useState } from "react";
import { Link } from "wouter";
import { Lock, Store, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { detectToolLang, makeT } from "@/lib/toolStrings";
import { readSessionPassed, resolveOwnerGate, writeSessionPassed } from "@/lib/ownerGate";

// 老闆專區 공통 게이트: 비로그인 → 로그인 유도 / 身分≠owner → 원클릭 전환 / owner → 통과.
// 통과 상태는 sessionStorage로 세션 내 유지.
export default function OwnerGate({ children }: { children: React.ReactNode }) {
  const lang = detectToolLang(window.location.search);
  const t = makeT(lang);
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [sessionPassed, setSessionPassed] = useState(readSessionPassed);

  const switchToOwner = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      writeSessionPassed();
      setSessionPassed(true);
      utils.users.me.invalidate();
      utils.auth.me.invalidate();
      toast.success(t("gateSwitchDone"));
    },
    onError: () => toast.error(t("gateSwitchFail")),
  });

  if (loading) {
    return (
      <div className="container py-24 text-center text-muted-foreground text-sm">…</div>
    );
  }

  const decision = resolveOwnerGate(isAuthenticated ? user : null, sessionPassed);

  if (decision === "pass") return <>{children}</>;

  if (decision === "login") {
    return (
      <div className="container py-24 text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("gateLoginTitle")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("gateLoginDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => (window.location.href = getLoginUrl(window.location.pathname))}>
            <LogIn className="w-5 h-5 mr-2" />
            {t("gateLoginCta")}
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/tools"><ArrowLeft className="w-4 h-4 mr-1" />{t("gatePromptCancel")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // decision === "prompt": 원클릭 오너 전환
  return (
    <div className="container py-24 text-center max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Store className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{t("gatePromptTitle")}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed mb-8">{t("gatePromptDesc")}</p>
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          disabled={switchToOwner.isPending}
          onClick={() => switchToOwner.mutate({ memberType: "owner" })}
        >
          <Store className="w-5 h-5 mr-2" />
          {switchToOwner.isPending ? t("gateSwitching") : t("gatePromptCta")}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/tools"><ArrowLeft className="w-4 h-4 mr-1" />{t("gatePromptCancel")}</Link>
        </Button>
      </div>
    </div>
  );
}
