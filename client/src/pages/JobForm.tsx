import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES, JOB_TYPE_LABELS, WORK_TYPE_LABELS, SALARY_TYPE_LABELS, EXPERIENCE_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function JobForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [salonName, setSalonName] = useState("");
  const [jobType, setJobType] = useState("");
  const [workType, setWorkType] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [salaryType, setSalaryType] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [experienceRequired, setExperienceRequired] = useState("none");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const { data: existing } = trpc.jobPosts.byId.useQuery(
    { id: Number(id) },
    { enabled: isEdit }
  );

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSalonName(existing.salonName);
      setJobType(existing.jobType);
      setWorkType(existing.workType);
      setCity(existing.city);
      setDistrict(existing.district ?? "");
      setAddress(existing.address ?? "");
      setSalaryType(existing.salaryType);
      setSalaryMin(existing.salaryMin ?? "");
      setSalaryMax(existing.salaryMax ?? "");
      setExperienceRequired(existing.experienceRequired);
      setDescription(existing.description);
      setBenefits(existing.benefits ?? "");
      setContactInfo(existing.contactInfo ?? "");
    }
  }, [existing]);

  const createMutation = trpc.jobPosts.create.useMutation({
    onSuccess: () => {
      toast.success("職缺已成功刊登！");
      utils.jobPosts.list.invalidate();
      navigate("/jobs");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.jobPosts.update.useMutation({
    onSuccess: () => {
      toast.success("職缺已更新！");
      utils.jobPosts.list.invalidate();
      navigate(`/jobs/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !salonName || !jobType || !workType || !city || !salaryType || !description) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    const payload = {
      title, salonName,
      jobType: jobType as any,
      workType: workType as any,
      city,
      district: district || undefined,
      address: address || undefined,
      salaryType: salaryType as any,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      experienceRequired: experienceRequired as any,
      description,
      benefits: benefits || undefined,
      contactInfo: contactInfo || undefined,
    };
    if (isEdit) {
      updateMutation.mutate({ id: Number(id), ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <p className="text-muted-foreground mb-4">請先登入才能刊登職缺</p>
        <Button asChild><a href={getLoginUrl()}>登入 / 註冊</a></Button>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "編輯職缺" : "刊登職缺"}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>職缺標題 <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：徵求資深設計師" />
            </div>

            <div className="space-y-2">
              <Label>沙龍名稱 <span className="text-destructive">*</span></Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="您的沙龍名稱" />
            </div>

            <div className="space-y-2">
              <Label>職種類別 <span className="text-destructive">*</span></Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue placeholder="選擇職種" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>工作型態 <span className="text-destructive">*</span></Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger><SelectValue placeholder="選擇型態" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WORK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>工作城市 <span className="text-destructive">*</span></Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="選擇城市" /></SelectTrigger>
                <SelectContent>
                  {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>區域（選填）</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="例：大安區" />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>詳細地址（選填）</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="詳細地址" />
            </div>

            <div className="space-y-2">
              <Label>薪資類型 <span className="text-destructive">*</span></Label>
              <Select value={salaryType} onValueChange={setSalaryType}>
                <SelectTrigger><SelectValue placeholder="選擇薪資類型" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SALARY_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>經驗要求</Label>
              <Select value={experienceRequired} onValueChange={setExperienceRequired}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPERIENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>最低薪資（NT$）</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="例：35000" />
            </div>

            <div className="space-y-2">
              <Label>最高薪資（NT$）</Label>
              <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="例：60000" />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>職缺說明 <span className="text-destructive">*</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="詳細描述工作內容、要求條件等..." />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>福利待遇（選填）</Label>
              <Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={3} placeholder="例：勞健保、年終獎金、教育訓練..." />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>聯絡方式（選填）</Label>
              <Textarea value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} rows={2} placeholder="例：請來電 02-1234-5678 或 LINE ID：..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/jobs")} className="flex-1">
              取消
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "處理中..." : isEdit ? "更新職缺" : "刊登職缺"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
