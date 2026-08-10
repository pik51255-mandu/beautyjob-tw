import { Link } from "wouter";
import { Briefcase, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// v4 커뮤니티 런칭: 채용 기능 잠금 시 /jobs, /resumes 계열 URL이 이 페이지를 보여준다.
export default function JobsComingSoon() {
  return (
    <div className="container py-24 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Briefcase className="w-8 h-8 text-primary" />
      </div>
      <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">即將開放</Badge>
      <h1 className="text-3xl font-bold mb-3">徵才專區 即將開放</h1>
      <p className="text-muted-foreground leading-relaxed mb-8">
        徵才與履歷功能正在準備中，將於近期正式推出。
        <br />
        歡迎先加入美髮社群，與同業交流技術與行業資訊！
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg">
          <Link href="/community">
            <MessageSquare className="w-5 h-5 mr-2" />
            前往美髮社群
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            返回首頁 <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
