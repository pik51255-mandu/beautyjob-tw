import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES, JOB_TYPE_LABELS, WORK_TYPE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ResumeEdit() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: existing } = trpc.resumes.mine.useQuery(undefined, { enabled: isAuthenticated });

  const [fullName, setFullName] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [currentCity, setCurrentCity] = useState("");
  const [desiredCity, setDesiredCity] = useState("");
  const [desiredSalaryMin, setDesiredSalaryMin] = useState("");
  const [desiredSalaryMax, setDesiredSalaryMax] = useState("");
  const [desiredWorkType, setDesiredWorkType] = useState("any");
  const [skills, setSkills] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (existing) {
      setFullName(existing.fullName);
      setJobType(existing.jobType);
      setExperienceYears(String(existing.experienceYears));
      setCurrentCity(existing.currentCity);
      setDesiredCity(existing.desiredCity ?? "");
      setDesiredSalaryMin(existing.desiredSalaryMin ?? "");
      setDesiredSalaryMax(existing.desiredSalaryMax ?? "");
      setDesiredWorkType(existing.desiredWorkType ?? "any");
      setSkills(existing.skills ?? "");
      setIntroduction(existing.introduction);
      setPortfolioUrl(existing.portfolioUrl ?? "");
      setIsPublic(existing.isPublic ?? true);
    }
  }, [existing]);

  const upsertMutation = trpc.resumes.upsert.useMutation({
    onSuccess: () => {
      toast.success("履歷已儲存！");
      utils.resumes.mine.invalidate();
      utils.resumes.list.invalidate();
      navigate("/resumes");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !jobType || !currentCity || !introduction) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    upsertMutation.mutate({
      fullName,
      jobType: jobType as any,
      experienceYears: Number(experienceYears) || 0,
      currentCity,
      desiredCity: desiredCity || undefined,
      desiredSalaryMin: desiredSalaryMin ? Number(desiredSalaryMin) : undefined,
      desiredSalaryMax: desiredSalaryMax ? Number(desiredSalaryMax) : undefined,
      desiredWorkType: desiredWorkType as any,
      skills: skills || undefined,
      introduction,
      portfolioUrl: portfolioUrl || undefined,
      isPublic,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <p className="text-muted-foreground mb-4">請先登入才能建立履歷</p>
        <Button asChild><a href={getLoginUrl()}>登入 / 註冊</a></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/resumes")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">{existing ? "編輯履歷" : "建立履歷"}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>姓名 <span className="text-destructive">*</span></Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="您的姓名" />
            </div>

            <div className="space-y-2">
              <Label>職種 <span className="text-destructive">*</span></Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue placeholder="選擇職種" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>工作年資（年）</Label>
              <Input type="number" min="0" max="50" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>希望工作型態</Label>
              <Select value={desiredWorkType} onValueChange={setDesiredWorkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">不限</SelectItem>
                  {Object.entries(WORK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>現居城市 <span className="text-destructive">*</span></Label>
              <Select value={currentCity} onValueChange={setCurrentCity}>
                <SelectTrigger><SelectValue placeholder="選擇城市" /></SelectTrigger>
                <SelectContent>
                  {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>希望工作城市</Label>
              <Select value={desiredCity} onValueChange={setDesiredCity}>
                <SelectTrigger><SelectValue placeholder="不限" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不限</SelectItem>
                  {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>期望最低月薪（NT$）</Label>
              <Input type="number" value={desiredSalaryMin} onChange={(e) => setDesiredSalaryMin(e.target.value)} placeholder="例：35000" />
            </div>

            <div className="space-y-2">
              <Label>期望最高月薪（NT$）</Label>
              <Input type="number" value={desiredSalaryMax} onChange={(e) => setDesiredSalaryMax(e.target.value)} placeholder="例：60000" />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>自我介紹 <span className="text-destructive">*</span></Label>
              <Textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={5} placeholder="介紹您的專長、工作經歷與求職目標..." />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>專業技能</Label>
              <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={3} placeholder="例：剪髮、燙髮、染髮、護髮..." />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>作品集網址</Label>
              <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://..." type="url" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                請輸入完整網址，需以 <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">https://</code> 開頭。<br />
                例：<span className="text-foreground/70">https://instagram.com/yourname</span>、
                <span className="text-foreground/70">https://www.facebook.com/yourpage</span>、
                <span className="text-foreground/70">https://yourportfolio.com</span>
              </p>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="font-medium text-sm">公開履歷</div>
                <div className="text-xs text-muted-foreground">開啟後，沙龍老闆可以搜尋到您的履歷</div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/resumes")} className="flex-1">取消</Button>
            <Button type="submit" disabled={upsertMutation.isPending} className="flex-1">
              {upsertMutation.isPending ? "儲存中..." : "儲存履歷"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
