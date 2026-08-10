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
import { ITEM_CONDITION_LABELS, TW_CITIES } from "@shared/constants";
import { USED_ITEM_CATEGORIES, BANNED_KEYWORD_MESSAGE, findBannedKeyword } from "@shared/usedItemCatalog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function UsedItemForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [agreedNonMedical, setAgreedNonMedical] = useState(false);
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");

  const { data: existing } = trpc.usedItems.byId.useQuery({ id: Number(id) }, { enabled: isEdit });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCategory(existing.category);
      setCondition(existing.condition);
      setPrice(String(existing.price));
      setDescription(existing.description);
      setCity(existing.city ?? "");
      setAgreedNonMedical(true);
    }
  }, [existing]);

  const createMutation = trpc.usedItems.create.useMutation({
    onSuccess: () => { toast.success("商品已刊登！"); utils.usedItems.list.invalidate(); navigate("/used-items"); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.usedItems.update.useMutation({
    onSuccess: () => { toast.success("已更新！"); utils.usedItems.list.invalidate(); navigate(`/used-items/${id}`); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !description) { toast.error("請填寫必填欄位"); return; }
    if (!category) { toast.error("請選擇商品類別"); return; }
    if (!agreedNonMedical) { toast.error("請確認商品非屬醫療器材"); return; }
    // 금지 키워드 사전 검사 (서버에서도 동일하게 차단됨)
    if (findBannedKeyword(`${title}\n${description}`)) { toast.error(BANNED_KEYWORD_MESSAGE); return; }
    const payload = {
      title,
      category: category as any,
      condition: condition as any,
      price: Number(price),
      description,
      city: city || "台北市",
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
      <Button variant="ghost" size="sm" onClick={() => navigate("/used-items")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "編輯商品" : "刊登二手商品"}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>商品名稱 <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：Panasonic 吹風機" />
            </div>
            <div className="space-y-2">
              <Label>商品類別 <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="請選擇類別" /></SelectTrigger>
                <SelectContent>
                  {USED_ITEM_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>商品狀況 <span className="text-destructive">*</span></Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ITEM_CONDITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>所在城市 <span className="text-destructive">*</span></Label>
              <select className="w-full border border-input rounded-md px-3 py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">選擇城市</option>
                {TW_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>售僷（NT$）<span className="text-destructive">*</span></Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例：3000" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>商品說明 <span className="text-destructive">*</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="說明商品狀況、使用年限、附件等..." />
            </div>
          </div>
          {/* 의료기기 금지 고지 + 동의 (D-1 유지 항목) */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{BANNED_KEYWORD_MESSAGE}。雷射・脈衝光・電音波等醫美儀器屬醫療器材，刊登將被移除並可能觸法。</p>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-xs leading-relaxed cursor-pointer hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              checked={agreedNonMedical}
              onChange={(e) => setAgreedNonMedical(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-muted-foreground">
              我確認此商品<strong className="text-foreground">非屬醫療器材</strong>，並同意違規內容經檢舉或偵測後將被移除
              <span className="text-destructive ml-0.5">*</span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/used-items")} className="flex-1">取消</Button>
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? "處理中..." : isEdit ? "更新" : "刊登"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
