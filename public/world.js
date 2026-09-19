export const PEOPLE = [
  {
    id: "momo",
    name: "桃桃",
    role: "派對靈魂",
    personality:
      "外向、樂觀、享樂，即使資源短缺也想讓大家開心；喜歡熱鬧，討厭孤單。",
    color: "#e99383",
    hair: "#7e4439",
    home: "square",
  },
  {
    id: "wood",
    name: "阿木",
    role: "務實採集者",
    personality: "勤勞、節制、重視長期生存；先找食物，照顧缺糧的人。",
    color: "#d4ae68",
    hair: "#3d4941",
    home: "forest",
  },
  {
    id: "bean",
    name: "豆豆",
    role: "謹慎收藏家",
    personality: "容易焦慮、害怕挨餓，優先備糧和自保，對陌生物品小心。",
    color: "#adabdc",
    hair: "#594b72",
    home: "store",
  },
  {
    id: "sea",
    name: "海海",
    role: "溫柔分享者",
    personality:
      "富同理心，會犧牲自己的存糧幫助餓的人，希望公平分配，記得別人的善意。",
    color: "#78bfb8",
    hair: "#315e60",
    home: "beach",
  },
  {
    id: "spark",
    name: "小電",
    role: "修理天才",
    personality: "熱愛解決實際問題，停電會優先修復，好奇機器，容易忘記吃飯。",
    color: "#91abd1",
    hair: "#39485f",
    home: "workshop",
  },
  {
    id: "luna",
    name: "露娜",
    role: "安靜觀察家",
    personality:
      "內向、敏感、愛安靜和休息，對吵鬧派對沒有興趣，疲倦或下雨時偏好避雨。",
    color: "#c49fbd",
    hair: "#674d64",
    home: "home",
  },
  {
    id: "pepper",
    name: "阿椒",
    role: "叛逆冒險家",
    personality: "大膽、叛逆、好奇、愛冒險，不盲從島規，偏愛探索陌生物品。",
    color: "#d9955e",
    hair: "#573d2a",
    home: "beach",
  },
  {
    id: "sun",
    name: "小晴",
    role: "熱心組織者",
    personality:
      "重視社群合作，會求助或分享，遵守島規，關注他人需求和互助記憶。",
    color: "#b3c985",
    hair: "#536047",
    home: "garden",
  },
];
export const PLACES = {
  forest: { name: "果樹林", x: 28, y: 29 },
  store: { name: "共享食堂", x: 45, y: 32 },
  home: { name: "小屋", x: 66, y: 29 },
  square: { name: "派對廣場", x: 50, y: 58 },
  workshop: { name: "發電站", x: 75, y: 52 },
  beach: { name: "潮汐沙灘", x: 29, y: 67 },
  garden: { name: "小花園", x: 64, y: 73 },
};
export const ACTIONS = {
  forage: {
    label: "找食物",
    icon: "✿",
    place: "forest",
    description:
      "到果樹林採集一份食物存入個人背包；若果實用完則失敗。雨中會更疲倦。",
  },
  eat: {
    label: "吃點東西",
    icon: "◒",
    place: "store",
    description: "優先吃自己背包的一份食物，否則吃共享庫的一份；降低飢餓。",
  },
  share: {
    label: "分享食物",
    icon: "♡",
    place: "store",
    description:
      "把自己一份食物送給目標，對方立即吃下；自己不會飽，但增加雙方連結。",
  },
  hoard: {
    label: "儲備食物",
    icon: "▣",
    place: "store",
    description:
      "從共享庫拿走一份，存入自己背包；自己不立即吃。禁止囤積時此行動不可用。",
  },
  ask: {
    label: "向人求助",
    icon: "?",
    place: "square",
    description:
      "向目標表達缺糧需求，形成對方可記住的請求；不強迫目標給予食物。",
  },
  party: {
    label: "加入派對",
    icon: "♫",
    place: "square",
    description: "跳舞或社交，降低孤單、消耗體力；沒有電或下雨時效果較差。",
  },
  chat: {
    label: "散步聊天",
    icon: "☏",
    place: "beach",
    description: "到沙灘散步、尋找安靜交談的機會；減少孤單，稍微消耗體力。",
  },
  rest: {
    label: "回屋休息",
    icon: "☾",
    place: "home",
    description: "回到小屋避雨、恢復體力；仍然會餓。",
  },
  repair: {
    label: "修復電力",
    icon: "ϟ",
    place: "workshop",
    description:
      "到發電站維修，累積兩次修復恢復供電；小電一次即可修好。消耗體力。",
  },
  explore: {
    label: "探索物品",
    icon: "◇",
    place: "garden",
    description:
      "探索島上的最新物品；食物可補給，發電機可恢復供電，雨傘能遮雨，音箱能吸引社交。",
  },
};
export const OBJECTS = {
  food: { name: "補給箱", icon: "▣" },
  umbrella: { name: "大雨傘", icon: "☂" },
  generator: { name: "備用發電機", icon: "ϟ" },
  speaker: { name: "音箱", icon: "♫" },
  mystery: { name: "神祕物件", icon: "◇" },
};
export const POLICIES = {
  free: "自由生活",
  equal: "優先照顧飢餓的人",
  nohoard: "禁止囤積",
  party: "鼓勵參加派對",
  quiet: "保持安靜",
  custom: "自訂島規",
};
export const clamp = (n) => Math.max(0, Math.min(100, n));
export function createWorld() {
  return {
    version: 1,
    tick: 0,
    weather: "clear",
    power: true,
    repair: 0,
    party: false,
    sharedFood: 8,
    forestFood: 12,
    policy: "free",
    rule: "自由生活，尊重彼此。",
    announcement: "歡迎來到微光島。每個人都有自己的生活方式。",
    objects: [],
    events: [
      {
        tick: 0,
        kind: "world",
        text: "八位島民抵達微光島。故事從你的一句話開始。",
      },
    ],
    people: PEOPLE.map((p, i) => ({
      id: p.id,
      hunger: [42, 35, 62, 46, 40, 30, 48, 38][i],
      energy: [78, 85, 60, 74, 80, 45, 90, 78][i],
      social: [65, 30, 45, 55, 32, 18, 46, 60][i],
      food: i === 3 ? 2 : i === 2 ? 1 : 0,
      location: p.home,
      umbrella: false,
      memory: [],
      last: null,
    })),
    lastRun: null,
  };
}
export function availableActions(w, p) {
  return Object.keys(ACTIONS).filter(
    (k) =>
      !(k === "party" && (!w.party || w.policy === "quiet")) &&
      !(k === "repair" && w.power) &&
      !(k === "share" && p.food < 1) &&
      !(k === "eat" && p.food + w.sharedFood < 1) &&
      !(
        k === "hoard" &&
        (w.sharedFood < 1 || w.policy === "nohoard" || p.food >= 10)
      ) &&
      !(k === "forage" && (w.forestFood < 1 || p.food >= 10)) &&
      !(k === "explore" && w.objects.length === 0),
  );
}
export function validateWorld(w) {
  if (
    !w ||
    w.version !== 1 ||
    !Number.isInteger(w.tick) ||
    w.tick < 0 ||
    w.tick > 10000 ||
    !["clear", "rain"].includes(w.weather) ||
    typeof w.power !== "boolean" ||
    typeof w.party !== "boolean" ||
    !Object.hasOwn(POLICIES, w.policy)
  )
    return false;
  if (
    !["sharedFood", "forestFood", "repair"].every(
      (k) => Number.isInteger(w[k]) && w[k] >= 0 && w[k] <= 100,
    )
  )
    return false;
  if (
    !["rule", "announcement"].every(
      (k) => typeof w[k] === "string" && w[k].length <= 500,
    )
  )
    return false;
  if (
    !Array.isArray(w.people) ||
    w.people.length !== 8 ||
    !Array.isArray(w.objects) ||
    w.objects.length > 5
  )
    return false;
  if (
    !w.objects.every(
      (o) =>
        o &&
        Object.hasOwn(OBJECTS, o.type) &&
        typeof o.name === "string" &&
        o.name.length <= 120 &&
        (o.description === undefined ||
          (typeof o.description === "string" && o.description.length <= 400)) &&
        Number.isInteger(o.charges) &&
        o.charges >= 0 &&
        o.charges <= 10,
    )
  )
    return false;
  return w.people.every(
    (p, i) =>
      p &&
      p.id === PEOPLE[i].id &&
      ["hunger", "energy", "social"].every(
        (k) => Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 100,
      ) &&
      Number.isInteger(p.food) &&
      p.food >= 0 &&
      p.food <= 10 &&
      typeof p.umbrella === "boolean" &&
      Object.hasOwn(PLACES, p.location) &&
      Array.isArray(p.memory) &&
      p.memory.length <= 6 &&
      p.memory.every(
        (m) =>
          m &&
          Number.isInteger(m.tick) &&
          typeof m.text === "string" &&
          m.text.length <= 600,
      ),
  );
}
export function requestState(w) {
  return {
    tick: w.tick,
    time: clock(w.tick),
    weather: w.weather,
    power: w.power,
    repairProgress: w.repair,
    party: w.party,
    sharedFood: w.sharedFood,
    forestFood: w.forestFood,
    policy: POLICIES[w.policy],
    rule: w.rule,
    announcement: w.announcement,
    objects: w.objects,
    people: w.people.map((p, i) => ({
      ...PEOPLE[i],
      hunger: p.hunger,
      energy: p.energy,
      social: p.social,
      food: p.food,
      location: p.location,
      umbrella: p.umbrella,
      memory: p.memory,
      needsLegend:
        "hunger越高越餓；energy越低越累；social越高越孤單。均為0至100。",
    })),
  };
}
export function clock(tick) {
  const hour = 14 + tick;
  return {
    day: Math.floor(hour / 24) + 1,
    hour: hour % 24,
    label: `第 ${Math.floor(hour / 24) + 1} 天 · ${String(hour % 24).padStart(2, "0")}:00`,
  };
}
function event(w, text, kind = "action", id) {
  w.events.push({ tick: w.tick, text, kind, id });
  w.events = w.events.slice(-70);
}
function remember(w, p, text) {
  p.memory.push({ tick: w.tick, text });
  p.memory = p.memory.slice(-6);
}
export function resolveTurn(original, decisions, meta = {}) {
  const w = structuredClone(original);
  w.events = Array.isArray(w.events) ? w.events.slice(-60) : [];
  w.tick++;
  const order = w.people.map((_, i) => (i + original.tick) % 8); // rotate resource priority each round
  for (const index of order) {
    const p = w.people[index],
      identity = PEOPLE[index],
      d = decisions[p.id],
      action = d.action;
    if (!availableActions(original, original.people[index]).includes(action))
      throw new Error("invalid_action");
    const t = w.people.find((p) => p.id === d.target && p.id !== identity.id);
    if (!t) throw new Error("invalid_target");
    const targetName = PEOPLE.find((person) => person.id === t.id).name;
    p.location = ACTIONS[action].place;
    let result = "";
    if (action === "forage") {
      if (w.forestFood > 0) {
        w.forestFood--;
        p.food++;
        result = "在果樹林找到一份食物，收進背包。";
      } else result = "趕到果樹林時，這一輪的果實已被摘完。";
      p.energy -= w.weather === "rain" && !p.umbrella ? 17 : 10;
    }
    if (action === "eat") {
      if (p.food > 0 || w.sharedFood > 0) {
        if (p.food > 0) p.food--;
        else w.sharedFood--;
        p.hunger -= 38;
        result = "吃下一份食物，終於沒那麼餓了。";
      } else result = "抵達食堂時，共享食物已被拿完。";
    }
    if (action === "share") {
      if (p.food > 0) {
        p.food--;
        t.hunger = clamp(t.hunger - 35);
        p.social -= 15;
        t.social = clamp(t.social - 18);
        result = `把一份食物分享給${targetName}，對方立即吃下。`;
        remember(w, t, `${identity.name}把自己的食物分享給我。`);
      } else result = "想分享食物，但背包已空了。";
    }
    if (action === "hoard") {
      if (w.sharedFood > 0) {
        w.sharedFood--;
        p.food++;
        result = "從共享食堂拿走一份食物，留給以後的自己。";
      } else result = "想儲備食物，但共享食堂已空了。";
    }
    if (action === "ask") {
      p.social -= 5;
      t.social = clamp(t.social - 5);
      result = `向${targetName}求助，希望有人願意分享食物。`;
      remember(
        w,
        t,
        `${identity.name}剛剛向我求助，希望我分享食物；請根據我的處境決定是否幫忙。`,
      );
    }
    if (action === "party") {
      p.social -= w.power ? 32 : 14;
      p.energy -= w.weather === "rain" && !p.umbrella ? 18 : 12;
      result = w.power
        ? "在廣場跳舞，找回與人相處的快樂。"
        : "停電也沒停下，在廣場哼歌陪伴其他人。";
    }
    if (action === "chat") {
      p.social -= 18;
      p.energy -= 5;
      result = "到沙灘散步，尋找輕鬆聊天的機會。";
    }
    if (action === "rest") {
      p.energy += 32;
      result =
        w.weather === "rain"
          ? "躲進小屋避雨，好好恢復體力。"
          : "回小屋休息，留一點時間給自己。";
    }
    if (action === "repair") {
      if (!w.power) {
        w.repair += p.id === "spark" ? 2 : 1;
        if (w.repair >= 2) {
          w.power = true;
          w.repair = 0;
          result = "修好了發電站，全島重新亮起燈！";
        } else result = "修復了一半電路，還需要一次維修。";
      } else result = "到發電站時，電力已被其他人修好了。";
      p.energy -= 15;
    }
    if (action === "explore") {
      const o = w.objects.at(-1);
      p.energy -= 7;
      if (o?.charges > 0) {
        if (o.type === "food") {
          if (p.food < 10) {
            p.food++;
            o.charges--;
            result = `從「${o.name}」找到一份食物。`;
          } else result = "背包已滿，把補給留給別人。";
        } else if (o.type === "generator") {
          w.power = true;
          w.repair = 0;
          o.charges--;
          result = `啟動「${o.name}」，恢復全島供電。`;
        } else if (o.type === "umbrella") {
          p.umbrella = true;
          o.charges--;
          result = `拿到了「${o.name}」，以後出門不怕雨。`;
        } else if (o.type === "speaker") {
          p.social -= 22;
          result = `打開「${o.name}」，吸引大家到花園聽音樂。`;
        } else {
          p.social -= 8;
          result = `研究了「${o.name}」，把這次發現記在心裡。`;
        }
      } else result = `查看「${o?.name || "物品"}」，發現可用補給已被拿完。`;
    }
    p.last = {
      ...d,
      tick: w.tick,
      result,
      observed: {
        hunger: original.people[index].hunger,
        energy: original.people[index].energy,
        social: original.people[index].social,
        sharedFood: original.sharedFood,
        weather: original.weather,
        power: original.power,
        rule: original.rule,
      },
    };
    remember(w, p, result);
    event(w, `${identity.name}${result}`, "action", p.id);
  }
  for (const p of w.people) {
    p.hunger = clamp(p.hunger + 7);
    p.energy = clamp(p.energy - 3);
    p.social = clamp(p.social + 5);
  }
  if (w.tick % 3 === 0) {
    const added = Math.min(4, 24 - w.forestFood);
    if (added > 0) {
      w.forestFood += added;
      event(w, `果樹林長出 ${added} 份新果實。`, "world");
    }
  }
  w.lastRun = meta;
  return w;
}
export function applyIntervention(original, text, choices) {
  const w = structuredClone(original);
  w.events = Array.isArray(w.events) ? w.events.slice(-60) : [];
  const effects = [];
  w.announcement = text;
  if (choices.weather !== "keep") {
    w.weather = choices.weather;
    effects.push(w.weather === "rain" ? "開始下雨" : "雨停了，天空放晴");
  }
  if (choices.power !== "keep") {
    w.power = choices.power === "on";
    w.repair = 0;
    effects.push(w.power ? "恢復供電" : "全島停電");
  }
  if (choices.food === "two" || choices.food === "empty") {
    w.sharedFood = choices.food === "two" ? 2 : 0;
    w.forestFood = 0;
    for (const p of w.people) p.food = 0;
    for (const o of w.objects) if (o.type === "food") o.charges = 0;
    effects.push(
      choices.food === "two" ? "全島只剩共享庫的 2 份食物" : "全島食物歸零",
    );
  }
  if (choices.food === "add") {
    w.sharedFood = Math.min(100, w.sharedFood + 8);
    effects.push("共享食堂增加 8 份食物");
  }
  if (choices.party !== "keep") {
    w.party = choices.party === "on";
    effects.push(w.party ? "宣布舉辦派對" : "派對結束");
  }
  if (choices.policy !== "keep") {
    w.policy = choices.policy;
    w.rule = choices.policy === "custom" ? text : POLICIES[choices.policy];
    effects.push(`島規：${w.rule}`);
  }
  if (choices.object !== "none") {
    w.objects.push({
      type: choices.object,
      name: OBJECTS[choices.object].name,
      description: text,
      charges:
        choices.object === "food" ? 4 : choices.object === "umbrella" ? 3 : 1,
    });
    w.objects = w.objects.slice(-5);
    effects.push(`花園放入${OBJECTS[choices.object].name}`);
  }
  for (const p of w.people) remember(w, p, `島上新公告：${text}`);
  event(w, text, "intervention");
  event(
    w,
    effects.length
      ? effects.join("；")
      : "公告已傳達給每個人，將影響下一輪選擇。",
    "world",
  );
  return { world: w, effects };
}
