import { useParams, useLocation } from "wouter";
import { ArrowLeft, Heart, Edit, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { USED_ITEM_CATEGORY_LABELS, ITEM_CONDITION_LABELS, formatNTD } from "@shared/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportButton from "@/components/ReportButton";

export default function UsedItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: item, isLoading } = trpc.usedItems.byId.useQuery({ id: Number(id) });
  const { data: isFav } = trpc.favorites.check.useQuery(
    { targetType: "used_item", targetId: Number(id) },
    { enabled: isAuthenticated }
  );

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
      utils.favorites.check.invalidate({ targetType: "used_item", targetId: Number(id) });
    },
  });

  const deleteItem = trpc.usedItems.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); navigate("/used-items"); },
  });

  if (isLoading) return <div className="container py-8 max-w-3xl mx-auto"><div className="animate-pulse h-10 bg-muted rounded w-2/3" /></div>;
  if (!item) return <div className="container py-20 text-center"><p className="text-muted-foreground">商品不存在</p><Button variant="outline" className="mt-4" onClick={() => navigate("/used-items")}>返回列表</Button></div>;

  const isOwner = user?.id === item.authorId;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/used-items")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary">{USED_ITEM_CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                <Badge className={`text-xs ${item.condition === "new" ? "bg-emerald-100 text-emerald-700" : item.condition === "like_new" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {ITEM_CONDITION_LABELS[item.condition] ?? item.condition}
                </Badge>
                {item.isSold && <Badge className="bg-red-100 text-red-700">已售出</Badge>}
              </div>
              <h1 className="text-2xl font-bold">{item.title}</h1>
              <div className="text-2xl font-bold text-primary mt-2">{formatNTD(item.price)}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!isOwner && <ReportButton targetType="used_item" targetId={item.id} />}
              {isAuthenticated && !isOwner && (
                <Button variant="outline" size="icon" onClick={() => favToggle.mutate({ targetType: "used_item", targetId: item.id })} className={isFav ? "text-rose-500 border-rose-200 bg-rose-50" : ""}>
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="outline" size="sm" asChild><a href={`/used-items/${item.id}/edit`}><Edit className="w-4 h-4 mr-1" />編輯</a></Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => { if (confirm("確定刪除？")) deleteItem.mutate({ id: item.id }); }}><Trash2 className="w-4 h-4 mr-1" />刪除</Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 border-b border-border bg-muted/20">

          <div>
            <div className="text-xs text-muted-foreground mb-1">刊登日期</div>
            <div className="text-sm">{format(new Date(item.createdAt), "yyyy/MM/dd")}</div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-3">商品說明</h2>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{item.description}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
