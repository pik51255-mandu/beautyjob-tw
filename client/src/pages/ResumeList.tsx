import { useState } from "react";
import { Link } from "wouter";
import { Users, MapPin, Briefcase, Clock, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TW_CITIES, JOB_TYPE_LABELS, WORK_TYPE_LABELS, EXPERIENCE_LABELS, formatSalaryRange } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";

export default function ResumeList() {
  const { isAuthenticated } = useAuth();
  const [city, setCity] = useState("");
  const [jobType, setJobType] = useState("");
  const [workType, setWorkType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.resumes.list.useQuery({
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
    favToggle.mutate({ targetType: "resume", targetId: id });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">人才搜尋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `共 ${data.total} 位求職者` : "載入中..."}
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/resume/edit">
              <Plus className="w-4 h-4 mr-2" />
              建立我的履歷
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="選擇城市" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部城市</SelectItem>
              {TW_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={jobType} onValueChange={(v) => { setJobType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="職種類別" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部職種</SelectItem>
              {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={workType} onValueChange={(v) => { setWorkType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="希望工作型態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部型態</SelectItem>
              {Object.entries(WORK_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3 mb-4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.resumes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.resumes.map((resume) => (
            <Link
              key={resume.id}
              href={`/resumes/${resume.id}`}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold group-hover:text-primary transition-colors">
                        {resume.fullName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {resume.experienceYears > 0 ? `${resume.experienceYears} 年` : "無經驗"} 經驗
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {JOB_TYPE_LABELS[resume.jobType] ?? resume.jobType}
                  </Badge>
                  <button
                    onClick={(e) => handleFav(e, resume.id)}
                    className="p-1.5 rounded-full hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(resume.desiredSalaryMin || resume.desiredSalaryMax) && (
                <div className="text-primary font-semibold text-sm mb-3">
                  期望薪資：{formatSalaryRange("monthly", resume.desiredSalaryMin, resume.desiredSalaryMax)}
                </div>
              )}

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {resume.introduction}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {resume.currentCity}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {resume.desiredWorkType ? (WORK_TYPE_LABELS[resume.desiredWorkType] ?? resume.desiredWorkType) : "不限"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true, locale: zhTW })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">目前沒有符合條件的求職者</p>
          <p className="text-sm mt-1">請嘗試調整篩選條件</p>
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
