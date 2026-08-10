import { BarChart3 } from "lucide-react";
import InfoComingSoon from "./InfoComingSoon";

export default function SalaryInfo() {
  return (
    <InfoComingSoon
      icon={BarChart3}
      title="薪資情報"
      description={"台灣美髮業各職務（設計師、助理、染髮師…）的薪資行情整理正在準備中。\n上線前，歡迎在社群分享或詢問各地區的薪資狀況。"}
      communityCategory="general"
    />
  );
}
