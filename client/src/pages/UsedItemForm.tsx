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
import { USED_ITEM_CATEGORY_LABELS, ITEM_CONDITION_LABELS, TW_CITIES } from "@shared/constants";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function UsedItemForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USED_ITEM_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/used-items")} className="flex-1">取消</Button>
            <Button type="submit" disabled={isPending} className="flex-1">{isPending ? "處理中..." : isEdit ? "更新" : "刊登"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
