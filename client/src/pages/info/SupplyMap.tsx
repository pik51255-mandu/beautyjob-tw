import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Phone, ShieldCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

// 美材行 지도 — Leaflet + OpenStreetMap 타일(무키).
// 좌표는 高雄市 民政局 門牌坐標 조인 결과, 업체 목록은 經濟部 商工行政 공개자료 기반.
const KAOHSIUNG_CENTER: [number, number] = [22.65, 120.32];

type Store = {
  id: number;
  name: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  tier: number;
  phone: string | null;
  note: string | null;
};

// tier1 = 웹으로 실존을 확인한 곳 / tier2 = 등기·업종 기준
const TIER_STYLE: Record<number, { color: string; label: string }> = {
  1: { color: "#e11d48", label: "已驗證" },
  2: { color: "#0284c7", label: "登記資料" },
};

function markerIcon(tier: number) {
  const { color } = TIER_STYLE[tier] ?? TIER_STYLE[2];
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export default function SupplyMap() {
  const { data, isLoading } = trpc.supplyStores.list.useQuery();
  const stores = useMemo<Store[]>(() => (data?.stores ?? []) as Store[], [data]);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(KAOHSIUNG_CENTER, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || stores.length === 0) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds: [number, number][] = [];
    for (const s of stores) {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const style = TIER_STYLE[s.tier] ?? TIER_STYLE[2];
      const marker = L.marker([lat, lng], { icon: markerIcon(s.tier), title: s.name }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:190px">
           <div style="font-weight:700;margin-bottom:4px">${escapeHtml(s.name)}</div>
           <div style="font-size:12px;color:#475569">${escapeHtml(s.district)}</div>
           <div style="font-size:12px;margin-top:2px">${escapeHtml(s.address)}</div>
           ${s.phone ? `<div style="font-size:12px;margin-top:6px">☎ ${escapeHtml(s.phone)}</div>` : ""}
           <div style="margin-top:6px;font-size:11px;color:${style.color}">${style.label}</div>
         </div>`
      );
      marker.on("click", () => setActiveId(s.id));
      markersRef.current[s.id] = marker;
      bounds.push([lat, lng]);
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [28, 28] });
  }, [stores]);

  function focusStore(s: Store) {
    const map = mapRef.current;
    const marker = markersRef.current[s.id];
    if (!map || !marker) return;
    map.setView([Number(s.lat), Number(s.lng)], 16);
    marker.openPopup();
    setActiveId(s.id);
  }

  const byDistrict = useMemo(() => {
    const groups = new Map<string, Store[]>();
    for (const s of stores) {
      if (!groups.has(s.district)) groups.set(s.district, []);
      groups.get(s.district)!.push(s);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [stores]);

  const verified = stores.filter((s) => s.tier === 1).length;

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          美材行地圖
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          高雄市美髮材料行（美材行）位置地圖。共 {stores.length} 家，其中 {verified} 家已完成實地資訊查核。
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className="bg-rose-100 text-rose-700 border-rose-200 gap-1">
            <ShieldCheck className="w-3 h-3" /> 已驗證
          </Badge>
          <Badge className="bg-sky-100 text-sky-700 border-sky-200 gap-1">
            <FileText className="w-3 h-3" /> 登記資料
          </Badge>
        </div>
      </div>

      <div
        ref={mapEl}
        className="w-full h-[380px] md:h-[460px] rounded-xl border border-border overflow-hidden z-0"
        aria-label="美材行地圖"
      />
      {isLoading && <p className="text-sm text-muted-foreground mt-3">地圖資料載入中…</p>}

      <div className="mt-8 space-y-6">
        {byDistrict.map(([district, list]) => (
          <div key={district}>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              {district}
              <span className="text-xs font-normal text-muted-foreground">{list.length} 家</span>
            </h2>
            <div className="space-y-2">
              {list.map((s: Store) => {
                const style = TIER_STYLE[s.tier] ?? TIER_STYLE[2];
                return (
                  <button
                    key={s.id}
                    onClick={() => focusStore(s)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-colors hover:border-primary/50 ${
                      activeId === s.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-sm text-muted-foreground mt-1 break-all">{s.address}</div>
                        {s.phone && (
                          <div className="text-sm mt-1 flex items-center gap-1 text-primary">
                            <Phone className="w-3.5 h-3.5" /> {s.phone}
                          </div>
                        )}
                      </div>
                      <span
                        className="text-xs shrink-0 px-2 py-1 rounded-md"
                        style={{ color: style.color, backgroundColor: `${style.color}14` }}
                      >
                        {style.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-10 leading-relaxed">
        資料來源：經濟部商工行政資料開放平臺・高雄市政府民政局門牌坐標 © OpenStreetMap contributors
      </p>
    </div>
  );
}
