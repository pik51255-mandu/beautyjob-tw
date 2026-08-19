import { useState } from "react";
import { Link } from "wouter";
import { Scissors, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { FEATURES } from "@shared/const";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [memberType, setMemberType] = useState<"designer" | "owner" | "other" | "">("");

  const handleLineLogin = () => {
    if (!agreedTerms) {
      toast.error("請先閱讀並同意服務條款、隱私權政策與免責聲明");
      return;
    }
    const clientId = import.meta.env.VITE_LINE_CLIENT_ID;
    if (!clientId) {
      toast.error("LINE 登入尚未設定，請使用電子郵件註冊");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/line/callback`);
    const state = encodeURIComponent("/");
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
  };

  const registerMutation = trpc.auth.emailRegister.useMutation({
    onSuccess: () => {
      toast.success("註冊成功！歡迎加入台灣美髮平台！");
      window.location.href = "/onboarding";
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "註冊失敗，請稍後再試");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("兩次密碼不一致");
      return;
    }
    if (password.length < 6) {
      toast.error("密碼至少需要6個字元");
      return;
    }
    if (!agreedTerms) {
      toast.error("請先閱讀並同意服務條款、隱私權政策與免責聲明");
      return;
    }
    registerMutation.mutate({ name, email, password, memberType: memberType || undefined });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary text-xl">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span>台灣美髮平台</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">BeautyJob.tw</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">建立帳號</CardTitle>
            <CardDescription>加入台灣最大美髮求職平台</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* LINE Register Button — FEATURES.LINE_LOGIN_ENABLED 로 잠금 (D-2a).
                재활성 조건: beautyjob.tw DNS 연결 + LINE 콘솔 콜백 등록.
                코드는 보존하고 조건부 렌더만 한다. */}
            {FEATURES.LINE_LOGIN_ENABLED ? (
            <Button
              variant="outline"
              className="w-full h-11 border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white transition-colors"
              onClick={handleLineLogin}
              type="button"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              使用 LINE 快速註冊
            </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                LINE 登入將於正式網域開通
              </p>
            )}

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                或使用電子郵件註冊
              </span>
            </div>

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="您的姓名"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">電子郵件 <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼 <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="至少6個字元"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">確認密碼 <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="再次輸入密碼"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* 회원 身分 (자율 신고 — Phase 2: 사업자번호(統一編號) 인증 예정) */}
              <div className="space-y-2">
                <Label>會員身分 <span className="text-muted-foreground font-normal text-xs">（選填）</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["designer", "設計師 / 助理"],
                    ["owner", "店家（老闆）"],
                    ["other", "其他"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMemberType(memberType === value ? "" : value)}
                      className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                        memberType === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  自我申報，之後可於我的頁面變更（未來將提供統一編號認證）
                </p>
              </div>

              {/* 약관 동의 체크박스 (v4: 필수) */}
              <label className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-xs leading-relaxed cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 accent-primary"
                  data-testid="agree-terms"
                />
                <span className="text-muted-foreground">
                  我已閱讀並同意
                  <Link href="/terms" className="text-primary hover:underline mx-0.5">服務條款</Link>、
                  <Link href="/privacy" className="text-primary hover:underline mx-0.5">隱私權政策</Link>與
                  <Link href="/disclaimer" className="text-primary hover:underline mx-0.5">免責聲明</Link>
                  <span className="text-destructive ml-0.5">*</span>
                </span>
              </label>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={registerMutation.isPending || !agreedTerms}
              >
                {registerMutation.isPending ? "註冊中..." : "立即註冊"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              已有帳號？{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                立即登入
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
