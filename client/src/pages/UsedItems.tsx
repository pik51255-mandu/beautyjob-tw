import { useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { USED_ITEM_CATEGORY_LABELS, ITEM_CONDITION_LABELS, formatNTD } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-emerald-100 text-emerald-700",
  like_new: "bg-blue-100 text-blue-700",
  good: "bg-sky-100 text-sky-700",
  fair: "bg-amber-100 text-amber-700",
  poor: "bg-red-100 text-red-700",
};

export default function UsedItems() {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.usedItems.list.useQuery({
    category: category as any || undefined,
    page,
    limit: 20,
  });

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => toast.success(result.favorited ? "已加入收藏" : "已取消收藏"),
  });

  const handleFav = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error("請先登入"); return; }
    favToggle.mutate({ targetType: "used_item", targetId: id });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">二手器材</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `共 ${data.total} 件商品` : "載入中..."}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/used-items/new">
              <Plus className="w-4 h-4 mr-2" />
              刊登二手
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-4 mb-6">
        <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="選擇類別" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類別</SelectItem>
            {Object.entries(USED_ITEM_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
              <div className="h-32 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={`/used-items/${item.id}`}
              className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
            >
              <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                <button
                  onClick={(e) => handleFav(e, item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5" />
                </button>
                {item.isSold && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">已售出</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${CONDITION_COLORS[item.condition] ?? "bg-gray-100 text-gray-700"}`}>
                    {ITEM_CONDITION_LABELS[item.condition] ?? item.condition}
                  </span>
                </div>
                <h2 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 mb-1">
                  {item.title}
                </h2>
                <div className="font-bold text-primary">{formatNTD(item.price)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: zhTW })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">目前沒有二手商品</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>上一頁</Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>下一頁</Button>
        </div>
      )}
    </div>
  );
}
