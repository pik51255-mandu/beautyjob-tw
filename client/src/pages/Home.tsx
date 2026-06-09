import { Link } from "wouter";
import { Scissors, Search, Users, MessageSquare, Store, Package, ArrowRight, Briefcase, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { JOB_TYPE_LABELS, WORK_TYPE_LABELS, formatSalaryRange } from "@shared/constants";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

const FEATURES = [
  {
    icon: Briefcase,
    title: "求職求才",
    desc: "設計師、助理、染髮師等各類職缺，精準媒合沙龍與人才",
    href: "/jobs",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Users,
    title: "人才搜尋",
    desc: "瀏覽求職者履歷，找到最適合您沙龍的專業人才",
    href: "/resumes",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: MessageSquare,
    title: "美髮社群",
    desc: "技術分享、行業資訊、問答討論，與同業交流成長",
    href: "/community",
    color: "bg-emerald-50 text-emerald-600",
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
    desc: "美髮椅、烘罩、剪刀等二手器材買賣，省錢又環保",
    href: "/used-items",
    color: "bg-purple-50 text-purple-600",
  },
];

const STATS = [
  { label: "刊登職缺", value: "500+" },
  { label: "求職者", value: "2,000+" },
  { label: "合作沙龍", value: "300+" },
  { label: "社群討論", value: "1,500+" },
];

export default function Home() {
  const { data: jobData } = trpc.jobPosts.list.useQuery({ limit: 6, page: 1 });

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
              台灣美髮業專屬平台
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              找工作、找人才<br />
              <span className="text-primary">就在台灣美髮平台</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              專為台灣美髮業打造的求職求才平台。設計師、助理、染髮師職缺一次搜尋，
              結合社群討論、店面頂讓、二手器材交易，是美髮人的全方位資訊中心。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="text-base">
                <Link href="/jobs">
                  <Search className="w-5 h-5 mr-2" />
                  瀏覽職缺
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link href="/jobs/new">
                  <Scissors className="w-5 h-5 mr-2" />
                  刊登職缺
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
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
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
          <p className="text-muted-foreground text-lg">一站式美髮業資訊平台，滿足所有需求</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {FEATURES.map((feature) => (
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
      </section>

      {/* Latest Job Posts */}
      <section className="bg-muted/40 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">最新職缺</h2>
              <p className="text-muted-foreground mt-1">即時更新的美髮業工作機會</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/jobs">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          {jobData && jobData.posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobData.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/jobs/${post.id}`}
                  className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-1">{post.salonName}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                      {JOB_TYPE_LABELS[post.jobType] ?? post.jobType}
                    </Badge>
                  </div>

                  <div className="text-primary font-semibold text-sm mb-3">
                    {formatSalaryRange(post.salaryType, post.salaryMin, post.salaryMax)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{post.city}</span>
                      <span>·</span>
                      <span>{WORK_TYPE_LABELS[post.workType] ?? post.workType}</span>
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
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>目前尚無職缺，請稍後再查看</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="bg-primary rounded-2xl p-10 md:p-14 text-center text-white">
          <Scissors className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-3">立即加入台灣美髮平台</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            無論您是正在尋找工作的設計師，還是需要招募人才的沙龍老闆，
            台灣美髮平台都是您最好的選擇。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/jobs">找工作</Link>
            </Button>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/jobs/new">刊登職缺</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
