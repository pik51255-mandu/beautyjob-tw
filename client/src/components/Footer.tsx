import { Link } from "wouter";
import { Scissors } from "lucide-react";
import { FEATURES } from "@shared/const";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">台灣美髮社群</span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              專為台灣美髮人打造的資訊交流社群，連結全台設計師、助理與沙龍。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">社群服務</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="/community" className="hover:text-background transition-colors">美髮社群</Link></li>
              <li><Link href="/salary-info" className="hover:text-background transition-colors">薪資情報</Link></li>
              <li><Link href="/courses" className="hover:text-background transition-colors">教育課程</Link></li>
              <li><Link href="/korean-techniques" className="hover:text-background transition-colors">韓國技術</Link></li>
              <li><Link href="/supply-map" className="hover:text-background transition-colors">美材行地圖</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">交流資訊</h4>
            <ul className="space-y-2 text-sm text-background/60">
              {FEATURES.USED_ITEMS_ENABLED && <li><Link href="/used-items" className="hover:text-background transition-colors">二手器材</Link></li>}
              <li><Link href="/mypage" className="hover:text-background transition-colors">我的頁面</Link></li>
              <li><Link href="/mypage/favorites" className="hover:text-background transition-colors">收藏清單</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">法律資訊</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="/terms" className="hover:text-background transition-colors">服務條款</Link></li>
              <li><Link href="/privacy" className="hover:text-background transition-colors">隱私權政策</Link></li>
              <li><Link href="/disclaimer" className="hover:text-background transition-colors">免責聲明</Link></li>
            </ul>
            {/* 영업자 정보 자리: 사업자 등록 후 실제 정보로 교체 */}
            <div className="mt-4 text-xs text-background/40 leading-relaxed">
              <p>營業人資訊</p>
              <p>名稱：（籌備中）</p>
              <p>統一編號：（籌備中）</p>
              <p>聯絡信箱：（籌備中）</p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-background/40">
          <p>© 2026 台灣美髮社群平台. All rights reserved.</p>
          <p>本平台僅提供資訊交流，不介入任何會員間交易</p>
        </div>

        {/* 제작사 크레딧 - 한결 頂級美髮沙龍 */}
        <div className="border-t border-background/10 mt-4 pt-4 flex items-center justify-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
          <span className="text-xs text-background/60">Designed &amp; Built by</span>
          <img
            src="/manus-storage/hangyeol-logo_2111d3d8.jpg"
            alt="한결 頂級美髮沙龍"
            className="h-7 w-auto object-contain brightness-0 invert"
            style={{ maxWidth: '80px' }}
          />
          <span className="text-xs text-background/60">頂級美髮沙龍</span>
        </div>
      </div>
    </footer>
  );
}
