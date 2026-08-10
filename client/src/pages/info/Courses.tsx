import { GraduationCap } from "lucide-react";
import InfoComingSoon from "./InfoComingSoon";

export default function Courses() {
  return (
    <InfoComingSoon
      icon={GraduationCap}
      title="教育課程"
      description={"剪髮、染燙、經營管理等美髮教育課程資訊整理正在準備中。\n上線前，歡迎在社群的「教育訓練」分類交流課程心得。"}
      communityCategory="education"
    />
  );
}
