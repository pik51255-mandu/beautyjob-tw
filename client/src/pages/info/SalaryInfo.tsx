import { Link } from "wouter";
import { BarChart3, Calculator, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SalaryInfo() {
  return (
    <div className="container py-20 max-w-xl mx-auto text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-primary" />
      </div>
      <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">內容準備中</Badge>
      <h1 className="text-3xl font-bold mb-3">薪資情報</h1>
      <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
        {"台灣美髮業各職務（設計師、助理、染髮師…）的薪資行情整理正在準備中。\n上線前，歡迎先使用薪水試算器，或在社群分享各地區的薪資狀況。"}
      </p>

      {/* 薪水試算器 진입 카드 */}
      <Link
        href="/tools/salary"
        className="block bg-white rounded-xl border border-border p-6 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold group-hover:text-primary transition-colors">薪水試算器</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              輸入業績與抽成率，馬上算出勞健保扣除後的實領金額（2026 年費率）
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/community">
            <MessageSquare className="w-5 h-5 mr-2" />
            到社群討論薪資話題
          </Link>
        </Button>
      </div>
    </div>
  );
}
