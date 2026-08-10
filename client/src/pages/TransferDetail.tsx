import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Heart, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatNTD } from "@shared/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportButton from "@/components/ReportButton";

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: post, isLoading } = trpc.salonTransfers.byId.useQuery({ id: Number(id) });
  const { data: isFav } = trpc.favorites.check.useQuery(
    { targetType: "salon_transfer", targetId: Number(id) },
    { enabled: isAuthenticated }
  );

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
      utils.favorites.check.invalidate({ targetType: "salon_transfer", targetId: Number(id) });
    },
  });

  const deletePost = trpc.salonTransfers.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); navigate("/transfers"); },
  });

  if (isLoading) return <div className="container py-8 max-w-3xl mx-auto"><div className="animate-pulse h-10 bg-muted rounded w-2/3" /></div>;
  if (!post) return <div className="container py-20 text-center"><p className="text-muted-foreground">資訊不存在</p><Button variant="outline" className="mt-4" onClick={() => navigate("/transfers")}>返回列表</Button></div>;

  const isOwner = user?.id === post.authorId;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/transfers")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{post.title}</h1>
              {post.salonName && <p className="text-muted-foreground mt-1">{post.salonName}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {!isOwner && <ReportButton targetType="salon_transfer" targetId={post.id} />}
              {isAuthenticated && !isOwner && (
                <Button variant="outline" size="icon" onClick={() => favToggle.mutate({ targetType: "salon_transfer", targetId: post.id })} className={isFav ? "text-rose-500 border-rose-200 bg-rose-50" : ""}>
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="outline" size="sm" asChild><a href={`/transfers/${post.id}/edit`}><Edit className="w-4 h-4 mr-1" />編輯</a></Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => { if (confirm("確定刪除？")) deletePost.mutate({ id: post.id }); }}><Trash2 className="w-4 h-4 mr-1" />刪除</Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-border bg-muted/20">
          {post.keyMoney && <div><div className="text-xs text-muted-foreground mb-1">頂讓金</div><div className="font-bold text-primary">{formatNTD(post.keyMoney)}</div></div>}
          {post.deposit && <div><div className="text-xs text-muted-foreground mb-1">押金</div><div className="font-semibold">{formatNTD(post.deposit)}</div></div>}
          {post.monthlyRent && <div><div className="text-xs text-muted-foreground mb-1">月租</div><div className="font-semibold">{formatNTD(post.monthlyRent)}</div></div>}
          {post.sizeM2 && <div><div className="text-xs text-muted-foreground mb-1">坪數</div><div className="font-semibold">{post.sizeM2} 坪</div></div>}
          <div><div className="text-xs text-muted-foreground mb-1">地點</div><div className="flex items-center gap-1 text-sm font-medium"><MapPin className="w-3.5 h-3.5 text-primary" />{post.city}{post.district ? ` ${post.district}` : ""}</div></div>
          <div><div className="text-xs text-muted-foreground mb-1">刊登日期</div><div className="text-sm">{format(new Date(post.createdAt), "yyyy/MM/dd")}</div></div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-3">詳細說明</h2>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{post.description}</div>
          </div>
          {post.contactInfo && (
            <div>
              <h2 className="font-semibold mb-3">聯絡方式</h2>
              <div className="text-sm text-foreground/80 whitespace-pre-wrap">{post.contactInfo}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
