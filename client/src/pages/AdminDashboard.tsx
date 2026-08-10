import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { REPORT_REASON_LABELS } from "@/components/ReportButton";
import { format } from "date-fns";
import {
  AlertCircle,
  BarChart3,
  Download,
  Flag,
  MessageSquare,
  ShieldAlert,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const USER_TYPE_LABELS: Record<string, string> = {
  salon_owner: "沙龍老闆",
  job_seeker:  "求職者",
};

const REPORT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "待處理", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  resolved:  { label: "已處理", color: "bg-green-100 text-green-700 border-green-200" },
  dismissed: { label: "已駁回", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const REPORT_TARGET_LABELS: Record<string, { label: string; href: (id: number) => string }> = {
  community:      { label: "社群文章", href: (id) => `/community/${id}` },
  salon_transfer: { label: "店面頂讓", href: (id) => `/transfers/${id}` },
  used_item:      { label: "二手器材", href: (id) => `/used-items/${id}` },
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
          <div className={`p-2.5 rounded-lg ${accent.replace("-500", "-100")} text-${accent.replace("bg-", "").replace("-500", "-600")}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user && user.role === "admin";
  const utils = trpc.useUtils();

  const { data: stats, isLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { page: 1, limit: 10 },
    { enabled: isAdmin }
  );
  const { data: reportsData } = trpc.admin.listReports.useQuery(
    { page: 1, limit: 20 },
    { enabled: isAdmin }
  );
  const { data: exportTables } = trpc.admin.exportTableNames.useQuery(undefined, { enabled: isAdmin });
  const { data: communityData } = trpc.admin.listCommunityPosts.useQuery(
    { page: 1, limit: 10 },
    { enabled: isAdmin }
  );

  const updateReportStatus = trpc.admin.updateReportStatus.useMutation({
    onSuccess: () => {
      toast.success("檢舉狀態已更新");
      utils.admin.listReports.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: () => toast.error("更新失敗，請稍後再試"),
  });

  const deleteReportedPost = trpc.admin.deleteReportedPost.useMutation({
    onSuccess: () => {
      toast.success("貼文已刪除，相關檢舉已標記為已處理");
      utils.admin.listReports.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: () => toast.error("刪除失敗，請稍後再試"),
  });

  const exportCsvQuery = trpc.useUtils().admin.exportCsv;
  const handleExport = async (table: string) => {
    try {
      const result = await exportCsvQuery.fetch({ table: table as any });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${table}：已匯出 ${result.rowCount} 筆`);
    } catch {
      toast.error("匯出失敗，請稍後再試");
    }
  };

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
              <p className="text-xs text-muted-foreground">台灣美髮社群 · 數據總覽</p>
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
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                會員 &amp; 社群
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
                  title="社群文章"
                  value={stats.community.total}
                  sub={`本月新增 +${stats.community.newThisMonth}`}
                  icon={<MessageSquare className="w-5 h-5" />}
                  accent="bg-indigo-500"
                />
                <StatCard
                  title="留言數"
                  value={stats.community.comments}
                  icon={<MessageSquare className="w-5 h-5" />}
                  accent="bg-teal-500"
                />
                <StatCard
                  title="待處理檢舉"
                  value={stats.reports.pending}
                  sub={`累計 ${stats.reports.total} 件`}
                  icon={<Flag className="w-5 h-5" />}
                  accent="bg-red-500"
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                內容統計
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <StatCard
                  title="求職履歷"
                  value={stats.content.resumes}
                  sub="徵才功能即將開放"
                  icon={<FileText className="w-5 h-5" />}
                  accent="bg-slate-500"
                />
                <StatCard
                  title="社群討論"
                  value={stats.content.community}
                  icon={<MessageSquare className="w-5 h-5" />}
                  accent="bg-emerald-500"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>無法載入統計資料</span>
          </div>
        )}

        {/* Detail Tables */}
        <Tabs defaultValue="reports">
          <TabsList className="mb-4">
            <TabsTrigger value="reports" className="gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              檢舉管理
              {stats && stats.reports.pending > 0 && (
                <span className="ml-1 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {stats.reports.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              最新會員
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              社群文章
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              CSV 匯出
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">檢舉列表（最新 20 件）</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">對象</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">原因</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">說明</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">狀態</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">檢舉時間</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!reportsData ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : reportsData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted-foreground py-8">目前沒有檢舉</td>
                        </tr>
                      ) : (
                        reportsData.items.map((r) => {
                          const target = REPORT_TARGET_LABELS[r.targetType];
                          const sc = REPORT_STATUS_CONFIG[r.status];
                          const busy = updateReportStatus.isPending || deleteReportedPost.isPending;
                          return (
                            <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">#{r.id}</td>
                              <td className="px-4 py-3">
                                <Link href={target?.href(r.targetId) ?? "/"} className="text-primary hover:underline">
                                  {target?.label ?? r.targetType} #{r.targetId}
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                {r.detail ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc?.color}`}>
                                  {sc?.label ?? r.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {format(new Date(r.createdAt), "yyyy/MM/dd HH:mm")}
                              </td>
                              <td className="px-4 py-3">
                                {r.status === "pending" ? (
                                  <div className="flex gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2 text-destructive border-red-200 hover:bg-red-50"
                                      disabled={busy}
                                      onClick={() => {
                                        if (confirm("確定刪除此貼文？此操作無法復原。")) {
                                          deleteReportedPost.mutate({ targetType: r.targetType, targetId: r.targetId });
                                        }
                                      }}
                                    >
                                      刪除貼文
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs px-2 text-muted-foreground"
                                      disabled={busy}
                                      onClick={() => updateReportStatus.mutate({ id: r.id, status: "dismissed" })}
                                    >
                                      駁回
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
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

          {/* Community Posts Tab — 익명화 예외: 신고 처리용 실제 계정 표시 */}
          <TabsContent value="posts">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最新社群文章（含實際帳號 — 僅供檢舉處理）</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">標題</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">作者（實名）</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">發表時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!communityData ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="border-b">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : communityData.items.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-muted-foreground py-8">尚無文章</td></tr>
                      ) : (
                        communityData.items.map((p) => (
                          <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">#{p.id}</td>
                            <td className="px-4 py-3 font-medium">
                              <Link href={`/community/${p.id}`} className="hover:text-primary transition-colors">{p.title}</Link>
                            </td>
                            <td className="px-4 py-3">{p.authorName ?? `會員 #${p.authorId}`}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{p.authorEmail ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(p.createdAt), "yyyy/MM/dd HH:mm")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">資料庫 CSV 匯出（全部資料表）</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  匯出各資料表全部資料為 CSV 檔（UTF-8 BOM，Excel 可直接開啟）。會員資料表不含密碼欄位。
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {!exportTables ? (
                    Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
                  ) : (
                    exportTables.map((table) => (
                      <Button
                        key={table}
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleExport(table)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {table}.csv
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
