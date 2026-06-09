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
import { COMMUNITY_CATEGORY_LABELS } from "@shared/constants";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function CommunityForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: existing } = trpc.community.byId.useQuery({ id: Number(id) }, { enabled: isEdit });

  useEffect(() => {
    if (existing) {
      setCategory(existing.category);
      setTitle(existing.title);
      setContent(existing.content);
    }
  }, [existing]);

  const createMutation = trpc.community.create.useMutation({
    onSuccess: () => {
      toast.success("文章已發表！");
      utils.community.list.invalidate();
      navigate("/community");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.community.update.useMutation({
    onSuccess: () => {
      toast.success("文章已更新！");
      utils.community.list.invalidate();
      navigate(`/community/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("請填寫標題和內容");
      return;
    }
    if (isEdit) {
      updateMutation.mutate({ id: Number(id), category: category as any, title, content });
    } else {
      createMutation.mutate({ category: category as any, title, content });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <p className="text-muted-foreground mb-4">請先登入才能發表文章</p>
        <Button asChild><a href={getLoginUrl()}>登入 / 註冊</a></Button>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回社群
      </Button>

      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "編輯文章" : "發表文章"}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>文章分類 <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(COMMUNITY_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>標題 <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章標題" />
          </div>

          <div className="space-y-2">
            <Label>內容 <span className="text-destructive">*</span></Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="分享您的想法、技術或問題..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/community")} className="flex-1">取消</Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "處理中..." : isEdit ? "更新文章" : "發表文章"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
