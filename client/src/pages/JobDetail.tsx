import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Briefcase, Clock, Heart, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { JOB_TYPE_LABELS, WORK_TYPE_LABELS, EXPERIENCE_LABELS, formatSalaryRange } from "@shared/constants";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: post, isLoading } = trpc.jobPosts.byId.useQuery({ id: Number(id) });
  const { data: isFav } = trpc.favorites.check.useQuery(
    { targetType: "job_post", targetId: Number(id) },
    { enabled: isAuthenticated }
  );

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
      utils.favorites.check.invalidate({ targetType: "job_post", targetId: Number(id) });
    },
  });

  const deletePost = trpc.jobPosts.delete.useMutation({
    onSuccess: () => {
      toast.success("職缺已刪除");
      navigate("/jobs");
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">職缺不存在或已下架</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/jobs")}>
          返回職缺列表
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === post.authorId;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {JOB_TYPE_LABELS[post.jobType] ?? post.jobType}
                </Badge>
                <Badge variant="secondary">
                  {WORK_TYPE_LABELS[post.workType] ?? post.workType}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold mb-1">{post.title}</h1>
              <p className="text-muted-foreground font-medium">{post.salonName}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && !isOwner && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => favToggle.mutate({ targetType: "job_post", targetId: post.id })}
                  className={isFav ? "text-rose-500 border-rose-200 bg-rose-50" : ""}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500" : ""}`} />
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/jobs/${post.id}/edit`}>
                      <Edit className="w-4 h-4 mr-1" /> 編輯
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/5"
                    onClick={() => {
                      if (confirm("確定要刪除此職缺嗎？")) {
                        deletePost.mutate({ id: post.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> 刪除
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Salary */}
          <div className="mt-4 p-4 bg-primary/5 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {formatSalaryRange(post.salaryType, post.salaryMin, post.salaryMax)}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 border-b border-border bg-muted/20">
          <div>
            <div className="text-xs text-muted-foreground mb-1">工作地點</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {post.city}{post.district ? ` ${post.district}` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">工作型態</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              {WORK_TYPE_LABELS[post.workType] ?? post.workType}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">經驗要求</div>
            <div className="text-sm font-medium">
              {EXPERIENCE_LABELS[post.experienceRequired] ?? "不限"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">瀏覽次數</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              {post.viewCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">刊登日期</div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {format(new Date(post.createdAt), "yyyy/MM/dd")}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-3 text-base">職缺說明</h2>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {post.description}
            </div>
          </div>

          {post.benefits && (
            <div>
              <h2 className="font-semibold mb-3 text-base">福利待遇</h2>
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {post.benefits}
              </div>
            </div>
          )}

          {post.contactInfo && (
            <div>
              <h2 className="font-semibold mb-3 text-base">聯絡方式</h2>
              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {post.contactInfo}
              </div>
            </div>
          )}

          {post.address && (
            <div>
              <h2 className="font-semibold mb-3 text-base">詳細地址</h2>
              <div className="text-sm text-foreground/80">{post.address}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
