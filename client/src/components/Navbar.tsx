import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Scissors, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { FEATURES } from "@shared/const";

// v4 커뮤니티 런칭: Phase 1 메뉴 7종
const NAV_LINKS = [
  { href: "/community", label: "美髮社群" },
  { href: "/salary-info", label: "薪資情報" },
  { href: "/courses", label: "教育課程" },
  { href: "/korean-techniques", label: "韓國技術" },
  { href: "/supply-map", label: "美材行地圖" },
  { href: "/transfers", label: "店面頂讓" },
  { href: "/used-items", label: "二手器材" },
  ...(FEATURES.JOBS_ENABLED ? [{ href: "/jobs", label: "徵才專區" }] : []),
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();

  const handleLogout = async () => {
    await logout();
    await utils.invalidate();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-primary text-lg shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:block">台灣美髮平台</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  location.startsWith(link.href)
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:block text-sm max-w-[100px] truncate">{user.name ?? "會員"}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/mypage">我的頁面</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mypage/favorites">收藏清單</Link>
                  </DropdownMenuItem>
                  {FEATURES.JOBS_ENABLED && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/jobs/new">刊登職缺</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/resume/edit">編輯履歷</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" asChild>
                <a href={getLoginUrl()}>登入 / 註冊</a>
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location.startsWith(link.href)
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <div className="border-t border-border my-2" />
                <Link href="/mypage" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                  我的頁面
                </Link>
                {FEATURES.JOBS_ENABLED && (
                  <Link href="/jobs/new" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-accent">
                    刊登職缺
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
