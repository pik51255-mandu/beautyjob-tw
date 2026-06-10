import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Briefcase, Clock, Heart, Edit, Trash2, Eye, Send, X, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { JOB_TYPE_LABELS, WORK_TYPE_LABELS, EXPERIENCE_LABELS, formatSalaryRange } from "@shared/constants";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";

const APPLICATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "待審中",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  reviewed: { label: "已查看",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  accepted: { label: "錄取通知", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "不合適",  color: "bg-red-100 text-red-700 border-red-200" },
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applicantsDialogOpen, setApplicantsDialogOpen] = useState(false);

  const { data: post, isLoading } = trpc.jobPosts.byId.useQuery({ id: Number(id) });
  const { data: isFav } = trpc.favorites.check.useQuery(
    { targetType: "job_post", targetId: Number(id) },
    { enabled: isAuthenticated }
  );
  const { data: appStatus, refetch: refetchStatus } = trpc.jobApplications.status.useQuery(
    { jobPostId: Number(id) },
    { enabled: isAuthenticated }
  );
  const { data: applicants } = trpc.jobApplications.jobApplications.useQuery(
    { jobPostId: Number(id) },
    { enabled: isAuthenticated && user?.id === post?.authorId }
  );

  const favToggle = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      toast.success(result.favorited ? "已加入收藏" : "已取消收藏");
      utils.favorites.check.invalidate({ targetType: "job_post", targetId: Number(id) });
    },
  });

  const applyMutation = trpc.jobApplications.submit.useMutation({
    onSuccess: () => {
      toast.success("投遞成功！等待對方回覆");
      setApplyDialogOpen(false);
      setCoverLetter("");
      refetchStatus();
    },
    onError: (err: any) => {
      if (err.message.includes("已經投遞")) {
        toast.error("您已經投遞過此職缺");
      } else {
        toast.error("投遞失敗，請稍後再試");
      }
    },
  });

  const cancelMutation = trpc.jobApplications.withdraw.useMutation({
    onSuccess: () => {
      toast.success("已取消投遞");
      refetchStatus();
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
  const hasApplied = !!appStatus;
  const statusInfo = appStatus ? APPLICATION_STATUS_LABELS[appStatus.status] : null;

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplicantsDialogOpen(true)}
                    className="gap-1"
                  >
                    <Users className="w-4 h-4" />
                    應徵者 ({applicants?.length ?? 0})
                  </Button>
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

        {/* ─── Apply CTA ─── */}
        {!isOwner && (
          <div className="px-6 pb-6">
            {!isAuthenticated ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">請先登入才能投遞履歷</p>
                <Button onClick={() => window.location.href = getLoginUrl()}>
                  登入後立即應徵
                </Button>
              </div>
            ) : hasApplied ? (
              <div className="rounded-lg border p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">已投遞此職缺</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      投遞時間：{format(new Date(appStatus!.createdAt), "yyyy/MM/dd HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusInfo && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/5 gap-1"
                    onClick={() => {
                      if (confirm("確定要取消投遞嗎？")) {
                        cancelMutation.mutate({ jobPostId: post.id });
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    <X className="w-3.5 h-3.5" /> 取消投遞
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full gap-2 text-base font-semibold"
                onClick={() => setApplyDialogOpen(true)}
              >
                <Send className="w-5 h-5" />
                立即應徵此職缺
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Apply Dialog ─── */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>投遞履歷</DialogTitle>
            <DialogDescription>
              應徵「{post.title}」— {post.salonName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                自我介紹 / 求職信 <span className="text-muted-foreground font-normal">（選填）</span>
              </label>
              <Textarea
                placeholder="您好，我對這個職位很感興趣，我有 X 年的美髮經驗，擅長…"
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {coverLetter.length} / 2000
              </p>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              投遞後，您的個人資料與履歷將會提供給該美髮沙龍查閱。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => applyMutation.mutate({ jobPostId: post.id, coverLetter: coverLetter || undefined })}
              disabled={applyMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {applyMutation.isPending ? "投遞中…" : "確認投遞"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Applicants Dialog (Owner only) ─── */}
      <Dialog open={applicantsDialogOpen} onOpenChange={setApplicantsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>應徵者名單</DialogTitle>
            <DialogDescription>
              共 {applicants?.length ?? 0} 位應徵者
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto py-2">
            {!applicants || applicants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">目前尚無應徵者</p>
            ) : (
              applicants.map((app) => {
                const si = APPLICATION_STATUS_LABELS[app.status];
                return (
                  <div key={app.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">應徵者 #{app.applicantId}</span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${si?.color}`}>
                        {si?.label}
                      </span>
                    </div>
                    {app.coverLetter && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 whitespace-pre-wrap line-clamp-3">
                        {app.coverLetter}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      投遞時間：{format(new Date(app.createdAt), "yyyy/MM/dd HH:mm")}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicantsDialogOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
