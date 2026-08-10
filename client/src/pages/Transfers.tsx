import { useState } from "react";
import { Link } from "wouter";
import { Store, MapPin, Eye, Plus, Heart, Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES, formatNTD } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import DisclaimerBanner from "@/components/DisclaimerBanner";

export default function Transfers() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.salonTransfers.list.useQuery({
    city: city || undefined,
    page,
    limit: 20,
  });

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => toast.success(result.favorited ? "已加入收藏" : "已取消收藏"),
  });

  const handleFav = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error("請先登入"); return; }
    favToggle.mutate({ targetType: "salon_transfer", targetId: id });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="container py-8">
      <div className="mb-4"><DisclaimerBanner /></div>
      {/* 開店成本試算器 진입 카드 */}
      <Link
        href="/tools/opening-cost"
        className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-white p-4 hover:shadow-md transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm group-hover:text-primary transition-colors">開店成本試算器</p>
          <p className="text-xs text-muted-foreground mt-0.5">押金、裝潢、人事到損益兩平，開店前先算清楚</p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">店面頂讓</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `共 ${data.total} 筆資訊` : "載入中..."}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/transfers/new">
              <Plus className="w-4 h-4 mr-2" />
              刊登頂讓
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-4 mb-6">
        <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="選擇城市" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部城市</SelectItem>
            {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.posts.map((post) => (
            <Link
              key={post.id}
              href={`/transfers/${post.id}`}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.salonName && <p className="text-muted-foreground text-sm mt-1">{post.salonName}</p>}
                </div>
                <button
                  onClick={(e) => handleFav(e, post.id)}
                  className="p-1.5 rounded-full hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                {post.keyMoney && (
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">頂讓金</div>
                    <div className="font-semibold text-primary text-xs">{formatNTD(post.keyMoney)}</div>
                  </div>
                )}
                {post.deposit && (
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">押金</div>
                    <div className="font-semibold text-xs">{formatNTD(post.deposit)}</div>
                  </div>
                )}
                {post.monthlyRent && (
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">月租</div>
                    <div className="font-semibold text-xs">{formatNTD(post.monthlyRent)}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.city}{post.district ? ` ${post.district}` : ""}</span>
                {post.sizeM2 && <span>{post.sizeM2} 坪</span>}
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount}</span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhTW })}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">目前沒有頂讓資訊</p>
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
