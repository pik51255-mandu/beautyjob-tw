import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ShieldAlert,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "待審中",  color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  reviewed: { label: "已查看",  color: "bg-blue-100 text-blue-700 border-blue-200",       icon: <CheckCircle2 className="w-3 h-3" /> },
  accepted: { label: "錄取通知", color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "不合適",  color: "bg-red-100 text-red-700 border-red-200",          icon: <XCircle className="w-3 h-3" /> },
};

const USER_TYPE_LABELS: Record<string, string> = {
  salon_owner: "沙龍老闆",
  job_seeker:  "求職者",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  designer:  "設計師",
  intern:    "助理",
  staff:     "員工",
  colorist:  "染髮師",
  barber:    "理髮師",
  manager:   "店長",
  other:     "其他",
};

function StatCard({
  title,
  value,
  sub,
  icon,
  accent,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="pt-5 pb-4 pl-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${accent.replace("bg-", "bg-").replace("-500", "-100")} text-${accent.replace("bg-", "").replace("-500", "-600")}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: stats, isLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 30_000,
  });

  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { page: 1, limit: 10 },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: jobsData } = trpc.admin.listJobs.useQuery(
    { page: 1, limit: 10 },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: appsData } = trpc.admin.listApplications.useQuery(
    { page: 1, limit: 10 },
    { enabled: !!user && user.role === "admin" }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">請先登入</h1>
        <Link href="/" className="text-primary underline text-sm">返回首頁</Link>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">無訪問權限</h1>
        <p className="text-muted-foreground text-sm">此頁面僅限管理員使用。</p>
        <Link href="/" className="text-primary underline text-sm">返回首頁</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">管理員後台</h1>
              <p className="text-xs text-muted-foreground">台灣美髮平台 · 數據總覽</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              即時數據
            </Badge>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← 返回網站
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Row 1: Users & Jobs */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                會員 &amp; 職缺
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="總會員數"
                  value={stats.users.total}
                  sub={`本月新增 +${stats.users.newThisMonth}`}
                  icon={<Users className="w-5 h-5" />}
                  accent="bg-blue-500"
                />
                <StatCard
                  title="沙龍老闆"
                  value={stats.users.salonOwners}
                  sub={`求職者 ${stats.users.jobSeekers} 人`}
                  icon={<Store className="w-5 h-5" />}
                  accent="bg-purple-500"
                />
                <StatCard
                  title="刊登職缺"
                  value={stats.jobs.total}
                  sub={`有效職缺 ${stats.jobs.active} 則`}
                  icon={<Briefcase className="w-5 h-5" />}
                  accent="bg-primary"
                />
                <StatCard
                  title="本月新職缺"
                  value={stats.jobs.newThisMonth}
                  sub="近 30 天"
                  icon={<TrendingUp className="w-5 h-5" />}
                  accent="bg-orange-500"
                />
              </div>
            </div>

            {/* Row 2: Applications */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                應徵狀況
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="總應徵數"
                  value={stats.applications.total}
                  icon={<FileText className="w-5 h-5" />}
                  accent="bg-slate-500"
                />
                <StatCard
                  title="待審中"
                  value={stats.applications.pending}
                  icon={<Clock className="w-5 h-5" />}
                  accent="bg-yellow-500"
                />
                <StatCard
                  title="錄取通知"
                  value={stats.applications.accepted}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  accent="bg-green-500"
                />
                <StatCard
                  title="不合適"
                  value={stats.applications.rejected}
                  icon={<XCircle className="w-5 h-5" />}
                  accent="bg-red-500"
                />
              </div>
            </div>

            {/* Row 3: Content */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                內容統計
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="求職履歷"
                  value={stats.content.resumes}
                  icon={<FileText className="w-5 h-5" />}
                  accent="bg-teal-500"
                />
                <StatCard
                  title="社群討論"
                  value={stats.content.community}
                  icon={<MessageSquare className="w-5 h-5" />}
                  accent="bg-indigo-500"
                />
                <StatCard
                  title="店面頂讓"
                  value={stats.content.transfers}
                  icon={<Store className="w-5 h-5" />}
                  accent="bg-amber-500"
                />
                <StatCard
                  title="二手器材"
                  value={stats.content.usedItems}
                  icon={<ShoppingBag className="w-5 h-5" />}
                  accent="bg-pink-500"
                />
              </div>
            </div>

            {/* Application Ratio Bar */}
            {stats.applications.total > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    應徵狀態分佈
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                    {stats.applications.pending > 0 && (
                      <div
                        className="bg-yellow-400 transition-all"
                        style={{ width: `${(stats.applications.pending / stats.applications.total) * 100}%` }}
                        title={`待審中 ${stats.applications.pending}`}
                      />
                    )}
                    {stats.applications.accepted > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(stats.applications.accepted / stats.applications.total) * 100}%` }}
                        title={`錄取 ${stats.applications.accepted}`}
                      />
                    )}
                    {stats.applications.rejected > 0 && (
                      <div
                        className="bg-red-400 transition-all"
                        style={{ width: `${(stats.applications.rejected / stats.applications.total) * 100}%` }}
                        title={`不合適 ${stats.applications.rejected}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />待審中 {stats.applications.pending}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />錄取 {stats.applications.accepted}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />不合適 {stats.applications.rejected}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>無法載入統計資料</span>
          </div>
        )}

        {/* Detail Tables */}
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              最新會員
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              最新職缺
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              最新應徵
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最新加入會員（前 10 名）</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">姓名</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">身份</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">加入時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!usersData ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : usersData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">尚無會員資料</td>
                        </tr>
                      ) : (
                        usersData.items.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">#{u.id}</td>
                            <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {USER_TYPE_LABELS[u.userType ?? ""] ?? u.userType ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {format(new Date(u.createdAt), "yyyy/MM/dd HH:mm")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最新刊登職缺（前 10 則）</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">職缺名稱</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">沙龍名稱</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">城市</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">職種</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">狀態</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">刊登時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!jobsData ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : jobsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted-foreground py-8">尚無職缺資料</td>
                        </tr>
                      ) : (
                        jobsData.items.map((j) => (
                          <tr key={j.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">#{j.id}</td>
                            <td className="px-4 py-3 font-medium">
                              <Link href={`/jobs/${j.id}`} className="hover:text-primary transition-colors">
                                {j.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{j.salonName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{j.city}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {JOB_TYPE_LABELS[j.jobType] ?? j.jobType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {j.isActive ? "刊登中" : "已下架"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {format(new Date(j.createdAt), "yyyy/MM/dd HH:mm")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最新應徵紀錄（前 10 筆）</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">職缺 ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">應徵者 ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">狀態</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">應徵時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!appsData ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : appsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">尚無應徵資料</td>
                        </tr>
                      ) : (
                        appsData.items.map((a) => {
                          const sc = STATUS_CONFIG[a.status];
                          return (
                            <tr key={a.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">#{a.id}</td>
                              <td className="px-4 py-3">
                                <Link href={`/jobs/${a.jobPostId}`} className="text-primary hover:underline">
                                  職缺 #{a.jobPostId}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">會員 #{a.applicantId}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc?.color}`}>
                                  {sc?.icon}
                                  {sc?.label ?? a.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {format(new Date(a.createdAt), "yyyy/MM/dd HH:mm")}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
