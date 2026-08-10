import { useState } from "react";
import { Link } from "wouter";
import { MessageSquare, Eye, Plus, Pin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { COMMUNITY_CATEGORY_LABELS } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

const CATEGORIES = [{ value: "", label: "全部" }, ...Object.entries(COMMUNITY_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  technique: "bg-blue-100 text-blue-700",
  education: "bg-purple-100 text-purple-700",
  news: "bg-amber-100 text-amber-700",
  qa: "bg-emerald-100 text-emerald-700",
};

export default function Community() {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.community.list.useQuery({
    category: category as any || undefined,
    page,
    limit: 20,
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">美髮社群</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `共 ${data.total} 篇文章` : "載入中..."}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/community/new">
              <Plus className="w-4 h-4 mr-2" />
              發表文章
            </Link>
          </Button>
        )}
      </div>

      {/* 익명 게시판 고지 (D-1) */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-relaxed">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <p>本社群為匿名發文，請安心交流。惟違法或侵權內容，本平台仍得依法配合調查。</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.value
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.posts.length > 0 ? (
        <div className="space-y-2">
          {data.posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="bg-white rounded-xl border border-border p-4 hover:shadow-sm hover:border-primary/30 transition-all duration-150 group flex items-center gap-4"
            >
              {post.isPinned && (
                <Pin className="w-4 h-4 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`tag text-xs ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-700"}`}>
                    {COMMUNITY_CATEGORY_LABELS[post.category] ?? post.category}
                  </span>
                  {post.isPinned && <Badge variant="secondary" className="text-xs">置頂</Badge>}
                </div>
                <h2 className="font-medium group-hover:text-primary transition-colors truncate">
                  {post.title}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.commentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.viewCount}
                </span>
                <span className="hidden sm:block">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhTW })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">目前沒有文章</p>
          {isAuthenticated && (
            <Button className="mt-4" asChild>
              <Link href="/community/new">發表第一篇文章</Link>
            </Button>
          )}
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
