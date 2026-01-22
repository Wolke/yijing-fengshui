# 易經陽宅風水 Yijing Yangzhai Fengshui

![Hero Image](assets/hero.png)

基於倪海廈老師易經陽宅學說的 AI 風水分析技能。

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## 核心理念

> **重「神」不重「形」**：強調「名位相等」與「長幼有序」，而非風水擺件。

本技能著重於：
- **位置**與**格局**的分析
- 家庭成員臥室方位
- 廚房、廁所等特殊空間
- 辦公室老闆座位

## 功能

- 🏠 **住宅風水分析**：根據家庭成員組成與臥室方位，推導卦象
- 🍳 **房間風水判斷**：廚房、廁所、客廳的吉凶分析
- 🏢 **辦公室風水**：老闆座位方位分析
- 📖 **六十四卦解讀**：結合陽宅風水語境的卦象詮釋

## 使用方式

### 作為 AI Skill 使用

1. 將此資料夾複製到 Skills 目錄：
   - **Claude Code**: `.agent/skills/`
   - **Antigravity**: `~/.gemini/antigravity/skills/`

2. 在對話中使用觸發詞：
   - 「幫我看風水」
   - 「分析我家的方位」
   - 「辦公室風水」

### 使用計算工具

```bash
# 單一卦象查詢
python scripts/fengshui_calc.py --person 震 --position 乾
# 輸出: {"hexagram_number": 34, "hexagram_name": "雷天大壯", ...}

# 完整分析
python scripts/fengshui_calc.py --analyze \
  --family '{"父親": "東", "長子": "西北", "母親": "西南"}' \
  --rooms '{"廚房": "西北", "廁所": "中央"}'
```

## 專案結構

```
yijing-fengshui/
├── SKILL.md              # AI 技能指引
├── README.md             # 本文件
├── LICENSE               # CC BY-NC-SA 4.0
├── scripts/
│   └── fengshui_calc.py  # 卦象計算工具
└── references/
    ├── 64gua.md          # 六十四卦詳解
    ├── bagua-wanwu.md    # 八卦萬物類象
    ├── yangzhai-theory.md# 陽宅風水理論
    ├── room-fengshui.md  # 房間風水規則
    └── office-fengshui.md# 辦公室風水
```

## 八卦方位對應

| 卦 | 方位 | 家庭成員 | 五行 |
|----|------|----------|------|
| 乾 | 西北 | 父親 | 金 |
| 坤 | 西南 | 母親 | 土 |
| 震 | 東 | 長子 | 木 |
| 巽 | 東南 | 長女 | 木 |
| 坎 | 北 | 中男 | 水 |
| 離 | 南 | 中女 | 火 |
| 艮 | 東北 | 少男 | 土 |
| 兌 | 西 | 少女 | 金 |

## 參考來源

- 倪海廈老師陽宅學說
- 《易經》六十四卦

## License

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
