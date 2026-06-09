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
import { TW_CITIES } from "@shared/constants";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function TransferForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [salonName, setSalonName] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [sizeM2, setSizeM2] = useState("");
  const [keyMoney, setKeyMoney] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const { data: existing } = trpc.salonTransfers.byId.useQuery({ id: Number(id) }, { enabled: isEdit });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSalonName(existing.salonName ?? "");
      setCity(existing.city);
      setDistrict(existing.district ?? "");
      setAddress(existing.address ?? "");
      setSizeM2(existing.sizeM2 ?? "");
      setKeyMoney(existing.keyMoney ?? "");
      setDeposit(existing.deposit ?? "");
      setMonthlyRent(existing.monthlyRent ?? "");
      setDescription(existing.description);
      setContactInfo(existing.contactInfo ?? "");
    }
  }, [existing]);

  const createMutation = trpc.salonTransfers.create.useMutation({
    onSuccess: () => { toast.success("頂讓資訊已刊登！"); utils.salonTransfers.list.invalidate(); navigate("/transfers"); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.salonTransfers.update.useMutation({
    onSuccess: () => { toast.success("已更新！"); utils.salonTransfers.list.invalidate(); navigate(`/transfers/${id}`); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !city || !description) { toast.error("請填寫必填欄位"); return; }
    const payload = {
      title, salonName: salonName || undefined, city,
      district: district || undefined, address: address || undefined,
      sizeM2: sizeM2 ? Number(sizeM2) : undefined,
      keyMoney: keyMoney ? Number(keyMoney) : undefined,
      deposit: deposit ? Number(deposit) : undefined,
      monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
      description, contactInfo: contactInfo || undefined,
    };
    if (isEdit) updateMutation.mutate({ id: Number(id), ...payload });
    else createMutation.mutate(payload);
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <p className="text-muted-foreground mb-4">請先登入才能刊登</p>
        <Button asChild><a href={getLoginUrl()}>登入 / 註冊</a></Button>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/transfers")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "編輯頂讓資訊" : "刊登頂讓資訊"}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>標題 <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：台北大安區美髮沙龍頂讓" />
            </div>
            <div className="space-y-2">
              <Label>沙龍名稱</Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="沙龍名稱（選填）" />
            </div>
            <div className="space-y-2">
              <Label>城市 <span className="text-destructive">*</span></Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="選擇城市" /></SelectTrigger>
                <SelectContent>{TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>區域</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="例：大安區" />
            </div>
            <div className="space-y-2">
              <Label>坪數</Label>
              <Input type="number" value={sizeM2} onChange={(e) => setSizeM2(e.target.value)} placeholder="例：20" />
            </div>
            <div className="space-y-2">
              <Label>頂讓金（NT$）</Label>
              <Input type="number" value={keyMoney} onChange={(e) => setKeyMoney(e.target.value)} placeholder="例：500000" />
            </div>
            <div className="space-y-2">
              <Label>押金（NT$）</Label>
              <Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="例：60000" />
            </div>
            <div className="space-y-2">
              <Label>月租（NT$）</Label>
              <Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="例：30000" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>詳細說明 <span className="text-destructive">*</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="說明店面狀況、設備、頂讓原因等..." />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>聯絡方式</Label>
              <Textarea value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} rows={2} placeholder="電話、LINE ID 等..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/transfers")} className="flex-1">取消</Button>
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? "處理中..." : isEdit ? "更新" : "刊登"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
