export const SIZE = 16;
export const palettes = {
  classic: {
    name: "經典街機",
    subtitle: "CLASSIC / 16 COLORS",
    colors: [
      ["black", "#140e24", "墨黑"],
      ["navy", "#25265b", "深藍"],
      ["purple", "#79408b", "紫羅蘭"],
      ["teal", "#277d83", "湖水綠"],
      ["brown", "#a35b45", "棕色"],
      ["gray", "#77758a", "灰色"],
      ["light_gray", "#b9b9c7", "淺灰"],
      ["white", "#fff3df", "奶油白"],
      ["red", "#ed5271", "珊瑚紅"],
      ["orange", "#ff9458", "橘色"],
      ["yellow", "#ffd66b", "暖黃"],
      ["green", "#7bc875", "草綠"],
      ["blue", "#5a9bea", "天空藍"],
      ["lavender", "#af93dc", "薰衣草"],
      ["pink", "#f7a1bb", "粉紅"],
      ["peach", "#edc5aa", "蜜桃"],
    ],
  },
  neon: {
    name: "午夜霓虹",
    subtitle: "NEON / 16 COLORS",
    colors: [
      ["black", "#090b19", "夜黑"],
      ["navy", "#151b3d", "午夜藍"],
      ["purple", "#582a93", "電光紫"],
      ["teal", "#087f8c", "深青"],
      ["brown", "#6a395b", "暗莓"],
      ["gray", "#566181", "藍灰"],
      ["light_gray", "#a2b4cf", "冷灰"],
      ["white", "#e8f9ff", "冰白"],
      ["red", "#ff3567", "霓虹紅"],
      ["orange", "#ff8250", "亮橘"],
      ["yellow", "#f9f56b", "螢光黃"],
      ["green", "#68f5a8", "薄荷綠"],
      ["blue", "#4d8dff", "電藍"],
      ["lavender", "#a289ff", "亮紫"],
      ["pink", "#ff70d5", "桃紅"],
      ["peach", "#ffbbb6", "淺珊瑚"],
    ],
  },
  earth: {
    name: "午後底片",
    subtitle: "EARTH / 16 COLORS",
    colors: [
      ["black", "#292c28", "炭黑"],
      ["navy", "#364958", "灰藍"],
      ["purple", "#75617b", "灰紫"],
      ["teal", "#527f7a", "鼠尾草"],
      ["brown", "#96634b", "木棕"],
      ["gray", "#939084", "石灰"],
      ["light_gray", "#c7c3ae", "亞麻"],
      ["white", "#f6edda", "米白"],
      ["red", "#bf5851", "磚紅"],
      ["orange", "#d99254", "陶橘"],
      ["yellow", "#eac779", "麥黃"],
      ["green", "#9ca969", "橄欖綠"],
      ["blue", "#81a9b4", "霧藍"],
      ["lavender", "#b3a3bd", "淺灰紫"],
      ["pink", "#d7a2a1", "玫瑰"],
      ["peach", "#e4c5a2", "沙色"],
    ],
  },
};
export const examples = [
  {
    name: "紅蘋果",
    emoji: "🍎",
    prompt:
      "一顆紅蘋果，圓潤飽滿，頂部有短棕色果梗和一片綠葉，左上方一小塊白色高光，奶油白背景。",
    palette: "classic",
  },
  {
    name: "太空機器人",
    emoji: "🤖",
    prompt:
      "正面的小機器人頭像，方形淺灰色金屬頭，兩隻明亮藍眼睛，頭頂一支紅色天線，深藍色背景。",
    palette: "neon",
  },
  {
    name: "日落小屋",
    emoji: "🏡",
    prompt:
      "一棟小房子，紅色三角屋頂、奶油白牆壁、棕色門、兩扇藍窗。房子下方是綠草地，上方是淡黃色的日落天空。",
    palette: "earth",
  },
  {
    name: "午夜山景",
    emoji: "🌙",
    prompt:
      "夜晚山景，深藍色天空，右上方一輪黃色月亮，幾顆白色星星，下半部是紫色三角形山峰和黑色前景。",
    palette: "neon",
  },
];
