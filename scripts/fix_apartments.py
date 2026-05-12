#!/usr/bin/env python3
"""把 apartments.json 清理回原 schema：
- area: number (平米，按 roomType 取合理值)
- communityId: 用真实 community_id
- 删除冗余字段
"""
import json
import random
from pathlib import Path

random.seed(7)

ROOT = Path(__file__).parent.parent
APT_PATH = ROOT / "data/apartments.json"

AREA_BY_TYPE = {
    "开间": (22, 38),
    "一居室": (38, 60),
    "两居室": (62, 95),
    "三居室": (90, 130),
    "卧室": (12, 22),
}


def normalize_room(rt: str) -> str:
    if "开间" in rt:
        return "开间"
    if "卧室" in rt or "单间" in rt or "合租" in rt:
        return "卧室"
    if "两居" in rt:
        return "两居室"
    if "三居" in rt:
        return "三居室"
    return "一居室"


def main():
    apts = json.loads(APT_PATH.read_text(encoding="utf-8"))
    out = []
    for a in apts:
        rt = normalize_room(a.get("roomType", "一居室"))
        lo, hi = AREA_BY_TYPE[rt]
        area_num = round(random.uniform(lo, hi))

        cid = a.get("community_id") or a.get("communityId") or "comm_001"

        out.append({
            "id": a["id"],
            "title": a["title"],
            "communityId": cid,
            "price": a["price"],
            "roomType": rt,
            "area": area_num,  # 平米数
            "floor": a.get("floor", "中楼层"),
            "buildingType": a.get("buildingType", "板楼"),
            "decoration": a.get("decoration", "精装"),
            "subwayStation": a.get("subwayStation", ""),
            "subwayDistance": a.get("subwayDistance", 500),
            "commuteToSampleCompany": a.get("commuteToSampleCompany", 30),
            "tags": a.get("tags", []),
            "coordinates": a.get("coordinates", {"lng": 116.4074, "lat": 39.9042}),
            "images": a.get("images", []),
            "description": a.get("description", ""),
        })

    APT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ wrote {len(out)} apartments")
    print("  area sample:", [(x["roomType"], x["area"]) for x in out[:5]])


if __name__ == "__main__":
    main()
