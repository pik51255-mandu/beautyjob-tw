import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam: "廣告 / 垃圾訊息",
  fraud: "詐騙 / 不實資訊",
  offensive: "不當言論 / 人身攻擊",
  illegal: "違法內容",
  other: "其他",
};

type ReportTargetType = "community" | "salon_transfer" | "used_item";

// 檢舉 버튼: 커뮤니티·頂讓·二手 상세 페이지 공용
export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: number;
}) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [detail, setDetail] = useState("");

  const createReport = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("已收到您的檢舉，管理員將盡快處理");
      setOpen(false);
      setDetail("");
      setReason("spam");
    },
    onError: () => toast.error("檢舉送出失敗，請稍後再試"),
  });

  const handleOpen = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl(window.location.pathname);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-muted-foreground hover:text-destructive gap-1"
      >
        <Flag className="w-3.5 h-3.5" />
        檢舉
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>檢舉此內容</DialogTitle>
            <DialogDescription>
              請選擇檢舉原因，管理員確認後將進行處理。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                    reason === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <Textarea
              placeholder="補充說明（選填，最多 1000 字）"
              rows={3}
              maxLength={1000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              disabled={createReport.isPending}
              onClick={() =>
                createReport.mutate({
                  targetType,
                  targetId,
                  reason: reason as any,
                  detail: detail.trim() || undefined,
                })
              }
            >
              {createReport.isPending ? "送出中…" : "送出檢舉"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
