import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

// 약관 3종 페이지 공용 레이아웃
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container py-10 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回首頁
      </Link>
      <div className="bg-white rounded-xl border border-border p-8">
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8">最後更新日期：{updated}</p>
        <div className="legal-content space-y-4 text-sm leading-relaxed text-foreground/80 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <div className="border-t border-border mt-8 pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">服務條款</Link>
          <Link href="/privacy" className="hover:text-foreground">隱私權政策</Link>
          <Link href="/disclaimer" className="hover:text-foreground">免責聲明</Link>
        </div>
      </div>
    </div>
  );
}
