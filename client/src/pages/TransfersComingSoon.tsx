import { Link } from "wouter";
import { Store, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// D-1: 店面頂讓 잠금 시 /transfers 계열 URL이 이 페이지를 보여준다.
// 재오픈 조건 — 변호사 확인 + 운영 인력 확보 후 별도 지시 (FEATURES.TRANSFER_ENABLED)
export default function TransfersComingSoon() {
  return (
    <div className="container py-24 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Store className="w-8 h-8 text-primary" />
      </div>
      <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">整備中</Badge>
      <h1 className="text-3xl font-bold mb-3">店面頂讓 服務整備中</h1>
      <p className="text-muted-foreground leading-relaxed mb-8">
        為提供更安心的頂讓資訊環境，本服務正在進行內容規範整備，將於近期重新開放。
        <br />
        歡迎先到美髮社群與同業交流！
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg">
          <Link href="/community">
            <MessageSquare className="w-5 h-5 mr-2" />
            前往美髮社群
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">返回首頁 <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </Button>
      </div>
    </div>
  );
}
