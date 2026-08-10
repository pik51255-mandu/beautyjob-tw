import { useState } from "react";
import { useLocation } from "wouter";
import { Scissors, User, Store, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES } from "@shared/constants";
import { toast } from "sonner";

type Step = "role" | "profile" | "done";

export default function Onboarding() {
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<"salon_owner" | "job_seeker" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [, navigate] = useLocation();
  const { user, refresh } = useAuth();
  const utils = trpc.useUtils();

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await refresh();
      setStep("done");
    },
    onError: () => {
      toast.error("儲存失敗，請再試一次");
    },
  });

  const handleRoleSelect = (role: "salon_owner" | "job_seeker") => {
    setSelectedRole(role);
    setName(user?.name ?? "");
    setStep("profile");
  };

  const handleSubmit = () => {
    if (!selectedRole) return;
    updateProfile.mutate({
      userType: selectedRole,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      city: city || undefined,
      bio: bio.trim() || undefined,
    });
  };

  if (step === "done") {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold mb-3">設定完成！</h1>
        <p className="text-muted-foreground mb-8">
          歡迎加入台灣美髮社群，您的帳號已設定完成。
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <a href="/community">逛逛美髮社群</a>
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            返回首頁
          </Button>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="container py-12 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {selectedRole === "salon_owner" ? (
              <Store className="w-7 h-7 text-primary" />
            ) : (
              <User className="w-7 h-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold">完善個人資料</h1>
          <p className="text-muted-foreground mt-2">
            {selectedRole === "salon_owner" ? "沙龍老闆" : "求職者"} 身份設定
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">姓名 <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入您的姓名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">聯絡電話</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例：0912-345-678"
            />
          </div>

          <div className="space-y-2">
            <Label>所在城市</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇城市" />
              </SelectTrigger>
              <SelectContent>
                {TW_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              {selectedRole === "salon_owner" ? "沙龍簡介" : "自我介紹"}
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={selectedRole === "salon_owner" ? "介紹您的沙龍風格與特色..." : "簡單介紹自己的專長與經驗..."}
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("role")} className="flex-1">
              上一步
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || updateProfile.isPending}
              className="flex-1"
            >
              {updateProfile.isPending ? "儲存中..." : "完成設定"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Scissors className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">歡迎加入！</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          請選擇您的使用身份，以獲得最適合的體驗
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          onClick={() => handleRoleSelect("salon_owner")}
          className="group bg-white rounded-2xl border-2 border-border hover:border-primary p-8 text-left transition-all duration-200 hover:shadow-lg"
        >
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
            <Store className="w-8 h-8 text-rose-600 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-xl font-bold mb-2">沙龍老闆</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            我想要刊登職缺、搜尋人才，以及管理我的沙龍資訊
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              刊登職缺廣告
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              搜尋求職者履歷
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              發布店面頂讓資訊
            </li>
          </ul>
        </button>

        <button
          onClick={() => handleRoleSelect("job_seeker")}
          className="group bg-white rounded-2xl border-2 border-border hover:border-primary p-8 text-left transition-all duration-200 hover:shadow-lg"
        >
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
            <User className="w-8 h-8 text-amber-600 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="text-xl font-bold mb-2">求職者</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            我是設計師、助理或其他美髮從業人員，正在尋找工作機會
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              建立個人履歷
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              搜尋職缺資訊
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              收藏喜愛職缺
            </li>
          </ul>
        </button>
      </div>
    </div>
  );
}
