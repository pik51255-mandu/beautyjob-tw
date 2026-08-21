import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, Scissors } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-background px-4">
      <Card className="w-full max-w-lg shadow-lg border-border/60 bg-card/90 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2">404</h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            找不到這個頁面
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            您要找的頁面不存在，
            <br />
            可能已經移除或網址有誤。
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={() => setLocation("/")}
              className="px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首頁
            </Button>
            <Button asChild variant="outline" className="px-6 py-2.5 rounded-lg">
              <a href="/salons">
                <Scissors className="w-4 h-4 mr-2" />
                瀏覽美髮沙龍
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            資料如有錯誤或需要下架，請至
            <Link href="/data-request" className="text-primary hover:underline mx-1">
              資料更正／下架申請
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
