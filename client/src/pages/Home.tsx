import { Link } from "wouter";
import {
  Scissors,
  Users,
  MessageSquare,
  Store,
  Package,
  ArrowRight,
  Eye,
  BarChart3,
  Calculator,
  GraduationCap,
  Sparkles,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { COMMUNITY_CATEGORY_LABELS } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

// v4 커뮤니티 런칭: Phase 1 메뉴 7종
const FEATURES_GRID = [
  {
    icon: MessageSquare,
    title: "美髮社群",
    desc: "技術分享、行業資訊、問答討論，與全台美髮同業交流成長",
    href: "/community",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Calculator,
    title: "薪水試算器",
    desc: "輸入業績與抽成率，馬上算出勞健保扣除後的實領金額",
    href: "/tools/salary",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Store,
    title: "開店成本試算器",
    desc: "押金、裝潢、人事到損益兩平，開店前先算清楚",
    href: "/tools/opening-cost",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: BarChart3,
    title: "薪資情報",
    desc: "設計師、助理、染髮師等各職務薪資行情整理（準備中）",
    href: "/salary-info",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: GraduationCap,
    title: "教育課程",
    desc: "剪髮、染燙、經營管理等課程資訊與心得交流（準備中）",
    href: "/courses",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Sparkles,
    title: "韓國技術",
    desc: "韓系剪髮、燙髮與色彩趨勢專欄（準備中）",
    href: "/korean-techniques",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Map,
    title: "美材行地圖",
    desc: "全台美髮材料行位置與資訊地圖（準備中）",
    href: "/supply-map",
    color: "bg-sky-50 text-sky-600",
  },
  {
    icon: Store,
    title: "店面頂讓",
    desc: "美髮店頂讓資訊，含坪數、頂讓金、月租等完整資料",
    href: "/transfers",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Package,
    title: "二手器材",
    desc: "美髮椅、烘罩、剪刀等二手器材資訊，省錢又環保",
    href: "/used-items",
    color: "bg-indigo-50 text-indigo-600",
  },
];

export default function Home() {
  const { data: communityData } = trpc.community.list.useQuery({ limit: 6, page: 1 });
  const { data: platformStats } = trpc.stats.platform.useQuery();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-accent/30 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="container relative py-20 md:py-28">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              台灣美髮人專屬社群
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              美髮人的交流基地<br />
              <span className="text-primary">就在台灣美髮社群</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              專為台灣美髮業打造的資訊交流社群。技術分享、薪資情報、教育課程一次掌握，
              結合店面頂讓與二手器材資訊，是美髮人的全方位交流中心。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="text-base">
                <Link href="/community">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  逛逛社群
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link href="/community/new">
                  <Scissors className="w-5 h-5 mr-2" />
                  發表文章
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-white">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "社群討論", value: platformStats?.communityCount ?? 0, suffix: "+" },
              { label: "會員", value: platformStats?.memberCount ?? 0, suffix: "+" },
              { label: "店面頂讓", value: platformStats?.salonCount ?? 0, suffix: "+" },
              { label: "二手器材", value: platformStats?.usedItemCount ?? 0, suffix: "+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {platformStats ? (
                    <>{stat.value.toLocaleString()}{stat.value > 0 ? stat.suffix : ""}</>
                  ) : (
                    <span className="inline-block w-16 h-8 bg-muted animate-pulse rounded" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">平台功能</h2>
          <p className="text-muted-foreground text-lg">一站式美髮業交流平台，滿足所有需求</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {FEATURES_GRID.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group bg-white rounded-xl border border-border p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-primary font-medium">
                查看更多 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <DisclaimerBanner />
        </div>
      </section>

      {/* Latest Community Posts */}
      <section className="bg-muted/40 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">最新社群討論</h2>
              <p className="text-muted-foreground mt-1">即時更新的美髮業話題</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/community">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {communityData && communityData.posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityData.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 flex-1 min-w-0">
                      {post.title}
                    </h3>
                    <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                      {COMMUNITY_CATEGORY_LABELS[post.category] ?? post.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
                    </div>
                    <span>
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhTW })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>目前尚無討論，來發表第一篇文章吧！</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="bg-primary rounded-2xl p-10 md:p-14 text-center text-white">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-3">立即加入台灣美髮社群</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            無論您是設計師、助理還是沙龍老闆，
            這裡都有屬於您的交流空間。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/community">逛逛社群</Link>
            </Button>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/register">免費註冊</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
