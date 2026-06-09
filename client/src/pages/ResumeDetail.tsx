import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Briefcase, Heart, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { JOB_TYPE_LABELS, WORK_TYPE_LABELS, formatSalaryRange } from "@shared/constants";
import { toast } from "sonner";

export default function ResumeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: resume, isLoading } = trpc.resumes.byId.useQuery({ id: Number(id) });
  const { data: isFav } = trpc.favorites.check.useQuery(
    { targetType: "resume", targetId: Number(id) },
    { enabled: isAuthenticated }
  );

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
      utils.favorites.check.invalidate({ targetType: "resume", targetId: Number(id) });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">履歷不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/resumes")}>返回列表</Button>
      </div>
    );
  }

  const isOwner = user?.id === resume.userId;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/resumes")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{resume.fullName}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {JOB_TYPE_LABELS[resume.jobType] ?? resume.jobType}
                  </Badge>
                  {resume.desiredWorkType && (
                    <Badge variant="secondary">
                      {WORK_TYPE_LABELS[resume.desiredWorkType] ?? resume.desiredWorkType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {isAuthenticated && !isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => favToggle.mutate({ targetType: "resume", targetId: resume.id })}
                className={isFav ? "text-rose-500 border-rose-200 bg-rose-50" : ""}
              >
                <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
              </Button>
            )}
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <a href="/resume/edit">編輯履歷</a>
              </Button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 border-b border-border bg-muted/20">
          <div>
            <div className="text-xs text-muted-foreground mb-1">現居城市</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {resume.currentCity}
            </div>
          </div>
          {resume.desiredCity && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">希望工作地點</div>
              <div className="text-sm font-medium">{resume.desiredCity}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground mb-1">工作年資</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              {resume.experienceYears > 0 ? `${resume.experienceYears} 年` : "無經驗"}
            </div>
          </div>
          {(resume.desiredSalaryMin || resume.desiredSalaryMax) && (
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-muted-foreground mb-1">期望薪資</div>
              <div className="text-sm font-semibold text-primary">
                {formatSalaryRange("monthly", resume.desiredSalaryMin, resume.desiredSalaryMax)}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-3">自我介紹</h2>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {resume.introduction}
            </div>
          </div>

          {resume.skills && (
            <div>
              <h2 className="font-semibold mb-3">專業技能</h2>
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {resume.skills}
              </div>
            </div>
          )}

          {resume.portfolioUrl && (
            <div>
              <h2 className="font-semibold mb-3">作品集</h2>
              <a
                href={resume.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {resume.portfolioUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
