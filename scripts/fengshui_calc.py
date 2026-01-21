#!/usr/bin/env python3
"""
易經陽宅風水卦象計算工具
Yijing Yangzhai Fengshui Hexagram Calculator

根據人的屬卦與所住方位，推導形成的六十四卦。
"""

import json
import argparse
from typing import Dict, Tuple, Optional

# 八卦資料（先天八卦數）
BAGUA = {
    "乾": {"number": 1, "direction": "西北", "member": "父", "element": "金", "symbol": "☰"},
    "兌": {"number": 2, "direction": "西",   "member": "少女", "element": "金", "symbol": "☱"},
    "離": {"number": 3, "direction": "南",   "member": "中女", "element": "火", "symbol": "☲"},
    "震": {"number": 4, "direction": "東",   "member": "長男", "element": "木", "symbol": "☳"},
    "巽": {"number": 5, "direction": "東南", "member": "長女", "element": "木", "symbol": "☴"},
    "坎": {"number": 6, "direction": "北",   "member": "中男", "element": "水", "symbol": "☵"},
    "艮": {"number": 7, "direction": "東北", "member": "少男", "element": "土", "symbol": "☶"},
    "坤": {"number": 8, "direction": "西南", "member": "母", "element": "土", "symbol": "☷"},
}

# 方位到卦的反查
DIRECTION_TO_GUA = {
    "西北": "乾", "NW": "乾",
    "西": "兌", "W": "兌",
    "南": "離", "S": "離",
    "東": "震", "E": "震",
    "東南": "巽", "SE": "巽",
    "北": "坎", "N": "坎",
    "東北": "艮", "NE": "艮",
    "西南": "坤", "SW": "坤",
    "中央": "中央", "C": "中央",  # 特殊處理
}

# 家庭成員到卦的對應
MEMBER_TO_GUA = {
    "父": "乾", "父親": "乾", "男主人": "乾", "老闆(男)": "乾",
    "母": "坤", "母親": "坤", "女主人": "坤", "老闆(女)": "坤",
    "長子": "震", "長男": "震",
    "長女": "巽",
    "中男": "坎", "次子": "坎",
    "中女": "離", "次女": "離",
    "少男": "艮", "幼子": "艮", "三子": "艮",
    "少女": "兌", "幼女": "兌", "三女": "兌",
}

# 六十四卦名稱（上卦, 下卦）
HEXAGRAMS = {
    (1, 1): (1, "乾為天"),    (1, 2): (10, "天澤履"),   (1, 3): (13, "天火同人"), (1, 4): (25, "天雷无妄"),
    (1, 5): (44, "天風姤"),   (1, 6): (6, "天水訟"),    (1, 7): (33, "天山遯"),   (1, 8): (12, "天地否"),
    (2, 1): (43, "澤天夬"),   (2, 2): (58, "兌為澤"),   (2, 3): (49, "澤火革"),   (2, 4): (17, "澤雷隨"),
    (2, 5): (28, "澤風大過"), (2, 6): (47, "澤水困"),   (2, 7): (31, "澤山咸"),   (2, 8): (45, "澤地萃"),
    (3, 1): (14, "火天大有"), (3, 2): (38, "火澤睽"),   (3, 3): (30, "離為火"),   (3, 4): (21, "火雷噬嗑"),
    (3, 5): (50, "火風鼎"),   (3, 6): (64, "火水未濟"), (3, 7): (56, "火山旅"),   (3, 8): (35, "火地晉"),
    (4, 1): (34, "雷天大壯"), (4, 2): (54, "雷澤歸妹"), (4, 3): (55, "雷火豐"),   (4, 4): (51, "震為雷"),
    (4, 5): (32, "雷風恆"),   (4, 6): (40, "雷水解"),   (4, 7): (62, "雷山小過"), (4, 8): (16, "雷地豫"),
    (5, 1): (9, "風天小畜"),  (5, 2): (61, "風澤中孚"), (5, 3): (37, "風火家人"), (5, 4): (42, "風雷益"),
    (5, 5): (57, "巽為風"),   (5, 6): (59, "風水渙"),   (5, 7): (53, "風山漸"),   (5, 8): (20, "風地觀"),
    (6, 1): (5, "水天需"),    (6, 2): (60, "水澤節"),   (6, 3): (63, "水火既濟"), (6, 4): (3, "水雷屯"),
    (6, 5): (48, "水風井"),   (6, 6): (29, "坎為水"),   (6, 7): (39, "水山蹇"),   (6, 8): (8, "水地比"),
    (7, 1): (26, "山天大畜"), (7, 2): (41, "山澤損"),   (7, 3): (22, "山火賁"),   (7, 4): (27, "山雷頤"),
    (7, 5): (18, "山風蠱"),   (7, 6): (4, "山水蒙"),    (7, 7): (52, "艮為山"),   (7, 8): (23, "山地剝"),
    (8, 1): (11, "地天泰"),   (8, 2): (19, "地澤臨"),   (8, 3): (36, "地火明夷"), (8, 4): (24, "地雷復"),
    (8, 5): (46, "地風升"),   (8, 6): (7, "地水師"),    (8, 7): (15, "地山謙"),   (8, 8): (2, "坤為地"),
}


def normalize_direction(direction: str) -> str:
    """標準化方位輸入"""
    direction = direction.strip().upper() if direction.isascii() else direction.strip()
    # 處理各種輸入格式
    mappings = {
        "正東": "東", "正西": "西", "正南": "南", "正北": "北",
        "EAST": "東", "WEST": "西", "SOUTH": "南", "NORTH": "北",
        "NORTHEAST": "東北", "NORTHWEST": "西北", "SOUTHEAST": "東南", "SOUTHWEST": "西南",
        "CENTER": "中央", "MIDDLE": "中央",
    }
    return mappings.get(direction, direction)


def direction_to_gua(direction: str) -> Optional[str]:
    """將方位轉換為卦名"""
    direction = normalize_direction(direction)
    return DIRECTION_TO_GUA.get(direction)


def get_person_gua(member: str) -> Optional[str]:
    """根據家庭成員角色取得屬卦"""
    return MEMBER_TO_GUA.get(member)


def get_hexagram(upper_gua: str, lower_gua: str) -> Dict:
    """
    根據上卦和下卦推導六十四卦
    
    Args:
        upper_gua: 上卦名稱（人的屬卦）
        lower_gua: 下卦名稱（所住位置的卦）
    
    Returns:
        卦象資訊字典
    """
    if upper_gua not in BAGUA or lower_gua not in BAGUA:
        return {"error": f"無效的卦名: {upper_gua} 或 {lower_gua}"}
    
    upper_num = BAGUA[upper_gua]["number"]
    lower_num = BAGUA[lower_gua]["number"]
    
    if (upper_num, lower_num) not in HEXAGRAMS:
        return {"error": f"找不到對應的卦象: 上{upper_gua} 下{lower_gua}"}
    
    number, name = HEXAGRAMS[(upper_num, lower_num)]
    
    # 判斷是否為本位
    is_native = upper_gua == lower_gua
    
    return {
        "hexagram_number": number,
        "hexagram_name": name,
        "upper_gua": upper_gua,
        "upper_symbol": BAGUA[upper_gua]["symbol"],
        "lower_gua": lower_gua,
        "lower_symbol": BAGUA[lower_gua]["symbol"],
        "is_native_position": is_native,
        "status": "本位大吉" if is_native else "錯位"
    }


def analyze_family(family: Dict[str, str], rooms: Optional[Dict[str, str]] = None) -> Dict:
    """
    分析家庭成員的風水配置
    
    Args:
        family: {"成員名": "方位"} 如 {"父親": "東", "長子": "西北"}
        rooms: {"房間": "方位"} 如 {"廚房": "西北", "廁所": "中央"}
    
    Returns:
        完整分析結果
    """
    results = {
        "family_analysis": [],
        "room_analysis": [],
        "issues": [],
        "recommendations": []
    }
    
    # 分析家庭成員
    for member, direction in family.items():
        person_gua = get_person_gua(member)
        if not person_gua:
            results["family_analysis"].append({
                "member": member,
                "error": f"無法識別成員角色: {member}"
            })
            continue
        
        position_gua = direction_to_gua(direction)
        if not position_gua:
            results["family_analysis"].append({
                "member": member,
                "error": f"無法識別方位: {direction}"
            })
            continue
        
        ideal_direction = BAGUA[person_gua]["direction"]
        hexagram_info = get_hexagram(person_gua, position_gua)
        
        analysis = {
            "member": member,
            "role": BAGUA[person_gua]["member"],
            "person_gua": person_gua,
            "ideal_direction": ideal_direction,
            "actual_direction": direction,
            **hexagram_info
        }
        
        results["family_analysis"].append(analysis)
        
        # 記錄問題
        if not hexagram_info.get("is_native_position"):
            results["issues"].append(
                f"{member}住在{direction}（應住{ideal_direction}），形成「{hexagram_info['hexagram_name']}」卦"
            )
    
    # 分析房間
    if rooms:
        for room, direction in rooms.items():
            room_analysis = analyze_room(room, direction)
            results["room_analysis"].append(room_analysis)
            
            if room_analysis.get("status") in ["凶", "大凶"]:
                results["issues"].append(
                    f"{room}在{direction}：{room_analysis.get('effect', '')}"
                )
    
    # 生成建議
    if results["issues"]:
        results["recommendations"] = generate_recommendations(results)
    
    return results


def analyze_room(room: str, direction: str) -> Dict:
    """分析特殊房間的風水"""
    direction = normalize_direction(direction)
    
    # 廚房規則
    kitchen_rules = {
        "東": {"status": "吉", "effect": "木火通明，家人得貴人扶持"},
        "東南": {"status": "吉", "effect": "木火通明，有助家庭和諧"},
        "北": {"status": "中吉", "effect": "水火既濟，家人平安"},
        "東北": {"status": "中吉", "effect": "火土相生"},
        "南": {"status": "小吉", "effect": "火氣較旺，家人易急躁"},
        "西南": {"status": "凶", "effect": "裡鬼門，午後西曬不利食物保存，家人多病"},
        "西北": {"status": "凶", "effect": "火燒天門，不利男主人健康（呼吸系統、大腸）"},
        "西": {"status": "凶", "effect": "火金相剋，運氣反覆"},
    }
    
    # 廁所規則
    toilet_rules = {
        "中央": {"status": "大凶", "effect": "中宮穢氣，嚴重影響全家健康"},
        "東北": {"status": "大凶", "effect": "鬼門位，陰暗潮濕，家人體弱多病"},
        "西南": {"status": "凶", "effect": "傷女主人，脾胃不佳、婦科問題"},
        "西北": {"status": "凶", "effect": "傷男主人，事業及健康受損"},
        "東": {"status": "中", "effect": "水木相生，需保持通風"},
        "東南": {"status": "中", "effect": "水木相生，需保持通風"},
        "南": {"status": "凶", "effect": "水火相沖，易生是非疾病"},
        "北": {"status": "中", "effect": "坎位屬水，尚可"},
        "西": {"status": "中", "effect": "金水相生，尚可"},
    }
    
    if "廚房" in room or "kitchen" in room.lower():
        rules = kitchen_rules
    elif "廁所" in room or "浴室" in room or "toilet" in room.lower() or "bathroom" in room.lower():
        rules = toilet_rules
    else:
        return {"room": room, "direction": direction, "status": "未知", "effect": "無特殊規則"}
    
    rule = rules.get(direction, {"status": "未知", "effect": "無對應規則"})
    return {"room": room, "direction": direction, **rule}


def generate_recommendations(results: Dict) -> list:
    """根據分析結果生成建議"""
    recommendations = []
    
    # 檢查成員錯位
    misplaced = [a for a in results["family_analysis"] if not a.get("is_native_position") and "error" not in a]
    if len(misplaced) >= 2:
        # 檢查是否可以互換
        for i, p1 in enumerate(misplaced):
            for p2 in misplaced[i+1:]:
                if p1["actual_direction"] == p2["ideal_direction"] and p2["actual_direction"] == p1["ideal_direction"]:
                    recommendations.append(
                        f"建議 {p1['member']} 與 {p2['member']} 對調房間，可同時恢復「名位相等」"
                    )
    
    # 房間問題建議
    for room in results["room_analysis"]:
        if room.get("status") == "大凶":
            recommendations.append(
                f"{room['room']}位置為大忌，若無法搬遷，需加強通風並保持門常關"
            )
        elif room.get("status") == "凶":
            recommendations.append(
                f"{room['room']}方位不理想，可透過減少該區域使用頻率或加強通風來緩解"
            )
    
    return recommendations


def main():
    parser = argparse.ArgumentParser(description="易經陽宅風水卦象計算")
    parser.add_argument("--person", help="人的屬卦（乾兌離震巽坎艮坤）")
    parser.add_argument("--position", help="所住位置的卦")
    parser.add_argument("--analyze", action="store_true", help="完整分析模式")
    parser.add_argument("--family", help="家庭成員 JSON，如 '{\"父親\": \"東\", \"長子\": \"西北\"}'")
    parser.add_argument("--rooms", help="房間位置 JSON，如 '{\"廚房\": \"西北\", \"廁所\": \"中央\"}'")
    
    args = parser.parse_args()
    
    if args.person and args.position:
        # 單一卦象查詢
        result = get_hexagram(args.person, args.position)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    elif args.analyze and args.family:
        # 完整分析模式
        family = json.loads(args.family)
        rooms = json.loads(args.rooms) if args.rooms else None
        result = analyze_family(family, rooms)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    else:
        parser.print_help()
        print("\n範例:")
        print("  python fengshui_calc.py --person 震 --position 乾")
        print("  python fengshui_calc.py --analyze --family '{\"父親\": \"東\", \"長子\": \"西北\"}' --rooms '{\"廚房\": \"西北\"}'")


if __name__ == "__main__":
    main()
