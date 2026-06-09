import { Link } from "wouter";
import { Scissors } from "lucide-react";

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
              <span className="font-bold text-lg">台灣美髮平台</span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              台灣最專業的美髮業求職求才平台，連結優秀設計師與頂尖沙龍。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">求職求才</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="/jobs" className="hover:text-background transition-colors">瀏覽職缺</Link></li>
              <li><Link href="/resumes" className="hover:text-background transition-colors">人才搜尋</Link></li>
              <li><Link href="/jobs/new" className="hover:text-background transition-colors">刊登職缺</Link></li>
              <li><Link href="/resume/edit" className="hover:text-background transition-colors">建立履歷</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">社群資訊</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="/community" className="hover:text-background transition-colors">美髮社群</Link></li>
              <li><Link href="/transfers" className="hover:text-background transition-colors">店面頂讓</Link></li>
              <li><Link href="/used-items" className="hover:text-background transition-colors">二手器材</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">會員服務</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><Link href="/mypage" className="hover:text-background transition-colors">我的頁面</Link></li>
              <li><Link href="/mypage/favorites" className="hover:text-background transition-colors">收藏清單</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-background/40">
          <p>© 2025 台灣美髮求職平台. All rights reserved.</p>
          <p>所有金額以新台幣（NT$）計算</p>
        </div>
      </div>
    </footer>
  );
}
