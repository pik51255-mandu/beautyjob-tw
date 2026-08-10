import { Sparkles } from "lucide-react";
import InfoComingSoon from "./InfoComingSoon";

export default function KoreanTechniques() {
  return (
    <InfoComingSoon
      icon={Sparkles}
      title="韓國技術"
      description={"韓系剪髮、韓式燙髮、色彩趨勢等韓國美髮技術專欄正在準備中。\n上線前，歡迎在社群的「技術分享」分類討論韓系技術。"}
      communityCategory="technique"
    />
  );
}
