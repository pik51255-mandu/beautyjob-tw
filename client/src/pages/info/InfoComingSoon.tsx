import { Link } from "wouter";
import { MessageSquare, ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Phase 1 정보 메뉴 공용: 준비 중 콘텐츠 + 커뮤니티 유도
export default function InfoComingSoon({
  icon: Icon,
  title,
  description,
  communityCategory,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  communityCategory?: string;
}) {
  const communityHref = communityCategory ? `/community?category=${communityCategory}` : "/community";
  return (
    <div className="container py-20 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">內容準備中</Badge>
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg">
          <Link href={communityHref}>
            <MessageSquare className="w-5 h-5 mr-2" />
            到社群討論這個主題
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-1" /> 返回首頁</Link>
        </Button>
      </div>
    </div>
  );
}
