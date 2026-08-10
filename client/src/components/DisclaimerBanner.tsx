import { Link } from "wouter";
import { Info } from "lucide-react";

// 면책 배너: 커뮤니티·頂讓·二手 목록 및 홈에 노출되는 법적 고지
export default function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        本平台僅提供資訊交流空間，會員刊登之內容（含頂讓、二手買賣資訊）由刊登者自行負責，
        平台不介入任何交易、不保證內容之正確性。交易前請自行查證，詳見
        <Link href="/disclaimer" className="underline font-medium mx-0.5">免責聲明</Link>。
      </p>
    </div>
  );
}
