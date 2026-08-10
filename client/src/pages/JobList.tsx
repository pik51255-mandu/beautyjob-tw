import { useState } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal, MapPin, Clock, Briefcase, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES, JOB_TYPE_LABELS, WORK_TYPE_LABELS, EXPERIENCE_LABELS, formatSalaryRange } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";

const JOB_TYPES = Object.entries(JOB_TYPE_LABELS);
const WORK_TYPES = Object.entries(WORK_TYPE_LABELS);

export default function JobList() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [workType, setWorkType] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.jobPosts.list.useQuery({
    city: city || undefined,
    jobType: jobType as any || undefined,
    workType: workType as any || undefined,
    page,
    limit: 20,
  });

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
    },
  });

  const handleFav = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error("請先登入"); return; }
    favToggle.mutate({ targetType: "job_post", targetId: id });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">徵才專區</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `共 ${data.total} 筆職缺` : "載入中..."}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="w-4 h-4 mr-2" />
              刊登職缺
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="選擇城市" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部城市</SelectItem>
              {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={jobType} onValueChange={(v) => { setJobType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="職種類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部職種</SelectItem>
              {JOB_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={workType} onValueChange={(v) => { setWorkType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="工作型態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部型態</SelectItem>
              {WORK_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Job Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : data && data.posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.posts.map((post) => (
            <Link
              key={post.id}
              href={`/jobs/${post.id}`}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">{post.salonName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {JOB_TYPE_LABELS[post.jobType] ?? post.jobType}
                  </Badge>
                  <button
                    onClick={(e) => handleFav(e, post.id)}
                    className="p-1.5 rounded-full hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-primary font-semibold text-sm mb-3">
                {formatSalaryRange(post.salaryType, post.salaryMin, post.salaryMax)}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {post.city}{post.district ? ` ${post.district}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {WORK_TYPE_LABELS[post.workType] ?? post.workType}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhTW })}
                </span>
                <span className="text-muted-foreground/60">
                  {EXPERIENCE_LABELS[post.experienceRequired] ?? "不限"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">目前沒有符合條件的職缺</p>
          <p className="text-sm mt-1">請嘗試調整篩選條件</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            上一頁
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
