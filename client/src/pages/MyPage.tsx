import { Link, useLocation } from "wouter";
import { User, Briefcase, FileText, Heart, Store, ShoppingBag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { JOB_TYPE_LABELS, WORK_TYPE_LABELS, formatSalaryRange, formatNTD } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { FEATURES } from "@shared/const";

export default function MyPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: myJobs } = trpc.jobPosts.myPosts.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myResume } = trpc.resumes.mine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myFavorites } = trpc.favorites.list.useQuery({}, { enabled: isAuthenticated });
  const { data: myTransfers } = trpc.salonTransfers.myPosts.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myUsedItems } = trpc.usedItems.myPosts.useQuery(undefined, { enabled: isAuthenticated });

  const removeJobPost = trpc.jobPosts.delete.useMutation({
    onSuccess: () => { toast.success("已刪除"); utils.jobPosts.myPosts.invalidate(); },
  });

  const removeFav = trpc.favorites.toggle.useMutation({
    onSuccess: () => { toast.success("已取消收藏"); utils.favorites.list.invalidate(); },
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-bold mb-2">請先登入</h2>
        <p className="text-muted-foreground mb-6">登入後即可管理您的職缺、履歷和收藏</p>
        <Button asChild><a href={getLoginUrl()}>登入 / 註冊</a></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.name ?? "使用者"}</h1>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {user?.role === "admin" ? "管理員" : "一般會員"}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-1" />
            登出
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-2 gap-3 mb-6 ${FEATURES.JOBS_ENABLED ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        {[
          ...(FEATURES.JOBS_ENABLED
            ? [
                { icon: Briefcase, label: "我的職缺", count: myJobs?.length ?? 0, tab: "jobs" },
                { icon: FileText, label: "我的履歷", count: myResume ? 1 : 0, tab: "resume" },
              ]
            : []),
          { icon: Heart, label: "我的收藏", count: myFavorites?.length ?? 0, tab: "favorites" },
          { icon: Store, label: "我的頂讓", count: myTransfers?.length ?? 0, tab: "transfers" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-border p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
          >
            <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stat.count}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue={FEATURES.JOBS_ENABLED ? "jobs" : "favorites"}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto flex-wrap gap-1 h-auto">
          {FEATURES.JOBS_ENABLED && <TabsTrigger value="jobs">我的職缺</TabsTrigger>}
          {FEATURES.JOBS_ENABLED && <TabsTrigger value="resume">我的履歷</TabsTrigger>}
          <TabsTrigger value="favorites">我的收藏</TabsTrigger>
          <TabsTrigger value="transfers">頂讓/二手</TabsTrigger>
        </TabsList>

        {/* My Job Posts */}
        {FEATURES.JOBS_ENABLED && <TabsContent value="jobs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">我刊登的職缺</h2>
            <Button size="sm" asChild><Link href="/jobs/new">刊登職缺</Link></Button>
          </div>
          {myJobs && myJobs.length > 0 ? (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:text-primary transition-colors truncate block">{job.title}</Link>
                    <div className="text-sm text-muted-foreground mt-1">
                      {job.salonName} · {job.city} · {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax)}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild><Link href={`/jobs/${job.id}/edit`}>編輯</Link></Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5"
                      onClick={() => { if (confirm("確定刪除？")) removeJobPost.mutate({ id: job.id }); }}>刪除</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚未刊登任何職缺</p>
              <Button className="mt-4" size="sm" asChild><Link href="/jobs/new">立即刊登</Link></Button>
            </div>
          )}
        </TabsContent>}

        {/* My Resume */}
        {FEATURES.JOBS_ENABLED && <TabsContent value="resume">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">我的履歷</h2>
            <Button size="sm" asChild><Link href="/resume/edit">{myResume ? "編輯履歷" : "建立履歷"}</Link></Button>
          </div>
          {myResume ? (
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{myResume.fullName}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{JOB_TYPE_LABELS[myResume.jobType] ?? myResume.jobType}</Badge>
                    {myResume.desiredWorkType && <Badge variant="outline">{WORK_TYPE_LABELS[myResume.desiredWorkType] ?? myResume.desiredWorkType}</Badge>}
                  </div>
                </div>
                <Badge className={myResume.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                  {myResume.isPublic ? "公開中" : "隱藏"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{myResume.introduction}</p>
              <div className="text-xs text-muted-foreground mt-3">
                最後更新：{formatDistanceToNow(new Date(myResume.updatedAt), { addSuffix: true, locale: zhTW })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚未建立履歷</p>
              <Button className="mt-4" size="sm" asChild><Link href="/resume/edit">建立履歷</Link></Button>
            </div>
          )}
        </TabsContent>}

        {/* My Favorites */}
        <TabsContent value="favorites">
          <h2 className="font-semibold mb-4">我的收藏</h2>
          {myFavorites && myFavorites.length > 0 ? (
            <div className="space-y-3">
              {myFavorites.map((fav) => {
                const href = fav.targetType === "job_post" ? `/jobs/${fav.targetId}`
                  : fav.targetType === "resume" ? `/resumes/${fav.targetId}`
                  : fav.targetType === "salon_transfer" ? `/transfers/${fav.targetId}`
                  : `/used-items/${fav.targetId}`;
                const typeLabel = fav.targetType === "job_post" ? "職缺"
                  : fav.targetType === "resume" ? "履歷"
                  : fav.targetType === "salon_transfer" ? "頂讓"
                  : "二手";
                return (
                  <div key={fav.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="secondary" className="text-xs shrink-0">{typeLabel}</Badge>
                      <Link href={href} className="text-sm font-medium hover:text-primary transition-colors truncate">
                        查看收藏內容
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeFav.mutate({ targetType: fav.targetType as any, targetId: fav.targetId })}
                    >
                      取消收藏
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚無收藏</p>
            </div>
          )}
        </TabsContent>

        {/* Transfers & Used Items */}
        <TabsContent value="transfers">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">我的頂讓資訊</h2>
                <Button size="sm" asChild><Link href="/transfers/new">刊登頂讓</Link></Button>
              </div>
              {myTransfers && myTransfers.length > 0 ? (
                <div className="space-y-3">
                  {myTransfers.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4">
                      <Link href={`/transfers/${t.id}`} className="font-medium hover:text-primary transition-colors flex-1 truncate">{t.title}</Link>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild><Link href={`/transfers/${t.id}/edit`}>編輯</Link></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>尚未刊登頂讓資訊</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">我的二手商品</h2>
                <Button size="sm" asChild><Link href="/used-items/new">刊登二手</Link></Button>
              </div>
              {myUsedItems && myUsedItems.length > 0 ? (
                <div className="space-y-3">
                  {myUsedItems.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/used-items/${item.id}`} className="font-medium hover:text-primary transition-colors truncate block">{item.title}</Link>
                        <div className="text-sm text-primary font-semibold mt-1">{formatNTD(item.price)}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {item.isSold && <Badge className="bg-red-100 text-red-700 text-xs">已售出</Badge>}
                        <Button variant="outline" size="sm" asChild><Link href={`/used-items/${item.id}/edit`}>編輯</Link></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>尚未刊登二手商品</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
