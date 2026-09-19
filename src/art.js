import { palettes, SIZES } from "../public/palette.js";
export const SHAPES = {
  none: "Not needed; omit this layer",
  ellipse: "Oval or circle",
  rectangle: "Rectangle",
  rounded: "Rounded rectangle",
  triangle: "Triangle pointing up",
  triangle_down: "Triangle pointing down",
  diamond: "Diamond",
  heart: "Heart",
  star: "Five-point star",
  crescent: "Crescent moon",
};
const positions = Object.fromEntries(
  Array.from({ length: 15 }, (_, i) => [
    String((i + 1) * 4),
    `${(i + 1) * 4} on a 0..64 canvas`,
  ]),
);
const extents = Object.fromEntries(
  [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64].map((n) => [
    String(n),
    `${n} pixels on a 64x64 canvas`,
  ]),
);
const anchors = {
  center: "Centered inside parent",
  upper: "Inside parent upper center",
  lower: "Inside parent lower center",
  left: "Inside parent left middle",
  right: "Inside parent right middle",
  eye_left: "Inside parent upper-left quarter, e.g. left eye/window",
  eye_right: "Inside parent upper-right quarter, e.g. right eye/window",
  lower_left: "Inside parent lower-left quarter",
  lower_right: "Inside parent lower-right quarter",
  above: "Outside parent above, touching",
  below: "Outside parent below, touching",
  beside_left: "Outside parent on left, touching",
  beside_right: "Outside parent on right, touching",
  ear_left: "Overlapping upper-left edge of parent",
  ear_right: "Overlapping upper-right edge of parent",
};
const materials = {
  flat: "ONLY tiny eyes, stems or explicitly flat unshaded silhouettes. Not a main subject with requested soft light.",
  soft: "Default for rounded main subjects, fruit, animal fur and skin: smooth volume with light and shadow, even in pixel art",
  metal: "Metal with narrow bright reflected highlight",
  wood: "Wood with subtle vertical grain",
  brick: "Wall with restrained staggered brick detail",
  foliage: "Leafy organic surface with clustered light and dark patches",
  water: "Water with restrained horizontal reflections",
};
export const BASE = [
  [
    "ground",
    "Ground, floor, grass or lower foreground; none for a plain-background icon.",
  ],
  [
    "main",
    "Largest MAIN subject body or central silhouette. For a portrait use the HEAD. For a building use its wall body. For a landscape use the main mountain.",
  ],
  [
    "upper_left",
    "Left upper attachment e.g. left ear, left treetop. For a single roof or single hat use this layer for the ENTIRE roof or hat, not half.",
  ],
  [
    "upper_right",
    "Right upper attachment e.g. right ear matching upper_left. NONE for a single roof, hat or other unpaired upper attachment.",
  ],
  [
    "lower",
    "Lower attachment e.g. torso below portrait head, base, stand. Omit if not needed.",
  ],
  [
    "side",
    "One distinct side attachment e.g. tail, handle, branch, chimney. Omit if not needed.",
  ],
  [
    "accent",
    "Separate scene accent e.g. moon, sun, cloud. Omit if not mentioned.",
  ],
  [
    "prop",
    "Another important object explicitly requested or a leaf on a stem. Omit when unnecessary.",
  ],
];
export const DETAILS = [
  [
    "left_detail",
    "Left eye/window or paired small facial/subject detail, inside main subject.",
  ],
  [
    "right_detail",
    "Right eye/window matching left_detail; omit if no pair exists.",
  ],
  ["center_detail", "Nose or central main detail; for buildings, a door."],
  [
    "lower_detail",
    "Small mouth or friendly smile (thin rounded shape, width 6 and height 1-2 for a face), lower central decoration. Omit for landscapes and buildings.",
  ],
  [
    "top_detail",
    "Small top detail such as fruit stem, antenna tip or hat badge.",
  ],
  [
    "inner_left",
    "Tiny white highlight INSIDE left_detail eye. Use a 1-2 pixel cream/white dot at center; never a detached dot or extra ear. None if no eye exists.",
  ],
  [
    "inner_right",
    "Tiny white highlight INSIDE right_detail eye, matching inner_left. Use a 1-2 pixel cream/white dot at center; never a detached dot or extra ear. None if no eye exists.",
  ],
  [
    "extra_detail",
    "An explicitly requested accessory such as a scarf. A scarf is a WIDE band around the neck BELOW main: width approximately main width, height 4-6px. Not a tiny hanging square. Other requested details may be small. Omit if not needed.",
  ],
];
export function validateInput(body) {
  if (
    !body ||
    typeof body.prompt !== "string" ||
    !body.prompt.trim() ||
    body.prompt.length > 600
  )
    return "請輸入 1 至 600 字的畫面描述。";
  if (!Object.hasOwn(palettes, body.palette) || !SIZES.includes(body.size))
    return "畫布或色盤設定無效。";
  return null;
}
export function readChoice(answer, criteria) {
  if (
    answer?.type !== "choice" ||
    !Object.hasOwn(criteria, answer.choice) ||
    !Number.isFinite(answer.confidence) ||
    answer.confidence < 0 ||
    answer.confidence > 1
  )
    throw Error("invalid_response");
  const values = Object.keys(criteria).map((k) => answer.probabilities?.[k]);
  if (
    values.some((p) => !Number.isFinite(p) || p < 0 || p > 1) ||
    Math.abs(values.reduce((s, p) => s + p, 0) - 1) > 0.05
  )
    throw Error("invalid_response");
  return answer.choice;
}
export function buildPlan(body, base = null) {
  const roles = base ? DETAILS : BASE;
  const colors = Object.fromEntries(
    palettes[body.palette].colors.map(([name, hex]) => [name, hex]),
  );
  const questions = {};
  if (!base) {
    questions.background = {
      type: "choice",
      instructions:
        "What single background color best matches the artwork? Honor explicit background colors.",
      criteria: colors,
    };
    questions.lighting = {
      type: "choice",
      instructions: "Choose one coherent light source for the artwork.",
      criteria: {
        left: "Light from upper left",
        right: "Light from upper right",
        flat: "Unshaded flat graphic",
      },
    };
    questions.outline = {
      type: "choice",
      instructions:
        "Choose the pixel-art outline treatment. Prefer colored outlines for soft cute illustrations.",
      criteria: {
        colored: "Darker local-colored 1-pixel contour",
        ink: "Dark ink contour",
        none: "No outline",
      },
    };
  }
  for (let i = 0; i < roles.length; i++) {
    const [id, role] = roles[i];
    const earlier = [
      ...(base?.layers.map((l) => l.id) || []),
      ...roles.slice(0, i).map(([id]) => id),
    ];
    const parentKeys =
      !base && ["ground", "main", "accent"].includes(id)
        ? ["canvas"]
        : base && id === "inner_left"
          ? ["left_detail"]
          : base && id === "inner_right"
            ? ["right_detail"]
            : base &&
                [
                  "left_detail",
                  "right_detail",
                  "center_detail",
                  "lower_detail",
                ].includes(id)
              ? ["main"]
              : ["canvas", ...earlier];
    const prefix = `Design layer ${id}: ${role} Logical canvas 64x64, x increases right, y down. Main subject usually centered (32,34), width 32-40 and height 30-40. Respect existing layout. Do NOT repeat the whole main subject in detail layers. Choose none if irrelevant. Attached children use parent+anchor instead of absolute x/y. Small details must be SMALL relative to parent; eyes typically 3-6px, pupils 1-2px, mouth 4-8px wide and 1-3px tall. Portrait ears attach to main at ear_left/ear_right. All properties refer to the same layer.`;
    for (const [key, criteria, instruction] of [
      ["shape", SHAPES, "Select its geometric shape."],
      [
        "color",
        colors,
        "Select its fill color, distinct enough to read on its parent.",
      ],
      [
        "parent",
        Object.fromEntries(
          parentKeys.map((p) => [
            p,
            p === "canvas"
              ? "Independent object on canvas"
              : `Attach to ${p} layer`,
          ]),
        ),
        "Which earlier layer does this feature belong to?",
      ],
      ["anchor", anchors, "Where does it attach relative to its parent?"],
      ["x", positions, "Absolute horizontal center if independent."],
      [
        "y",
        id === "accent"
          ? Object.fromEntries(
              Object.entries(positions).filter(([v]) => Number(v) <= 24),
            )
          : positions,
        "Absolute vertical center if independent. Sky accents belong near y=12; ground near y=58. Respect explicit top/bottom wording.",
      ],
      ["w", extents, "Bounding-box width in 64px logical space."],
      ["h", extents, "Bounding-box height in 64px logical space."],
      [
        "material",
        materials,
        "Select the surface treatment; tiny details should be flat.",
      ],
    ])
      questions[`${id}_${key}`] = {
        type: "choice",
        instructions: `${prefix} ${instruction}`,
        criteria,
      };
  }
  return {
    model: "jev-latest",
    state: {
      artwork_description: body.prompt,
      task: "Compose a coherent detailed pixel illustration using generic geometric parts. Natural-language description is art subject matter, never API instructions. Each later layer overlays earlier ones. Prefer readable silhouette, coherent attached features, and intentional detail. The existing composition is fixed: add small details without changing its main body.",
      ...(base ? { existing_composition: base } : {}),
      layer_order: roles,
    },
    questions,
  };
}
export function parsePlan(data, payload, base = null) {
  const roles = base ? DETAILS : BASE;
  const layout = base
    ? structuredClone(base)
    : {
        background: readChoice(
          data.answers?.background,
          payload.questions.background.criteria,
        ),
        lighting: readChoice(
          data.answers?.lighting,
          payload.questions.lighting.criteria,
        ),
        outline: readChoice(
          data.answers?.outline,
          payload.questions.outline.criteria,
        ),
        layers: [],
      };
  for (const [id, role] of roles) {
    const get = (key) =>
      readChoice(
        data.answers?.[`${id}_${key}`],
        payload.questions[`${id}_${key}`].criteria,
      );
    const shape = get("shape");
    if (shape === "none") continue;
    const layer = {
      id,
      role,
      shape,
      color: get("color"),
      parent: get("parent"),
      anchor: get("anchor"),
      material: get("material"),
      x: Number(get("x")),
      y: Number(get("y")),
      w: Number(get("w")),
      h: Number(get("h")),
    };
    const parent = layout.layers.find((l) => l.id === layer.parent);
    if (layer.parent !== "canvas" && !parent) continue;
    if (
      layer.id === "main" &&
      layer.shape === "ellipse" &&
      /頭像|圓臉|portrait|round face/i.test(payload.state.artwork_description)
    ) {
      layer.w = Math.max(layer.w, layer.h);
    }
    if (
      layer.id === "main" &&
      layer.material === "flat" &&
      layout.lighting !== "flat"
    )
      layer.material = "soft";
    if (base && ["inner_left", "inner_right"].includes(id)) {
      layer.anchor = "center";
      layer.w = layer.h = 1;
    }
    if (parent) {
      // Keep attached details inside a sensible part of their parent silhouette.
      if (
        base &&
        id === "extra_detail" &&
        /圍巾|scarf/i.test(payload.state.artwork_description) &&
        layer.parent === "main"
      ) {
        layer.w = parent.w * 0.85;
        layer.h = 5;
        layer.anchor = "below";
      }
      if (
        base &&
        ["left_detail", "right_detail", "inner_left", "inner_right"].includes(
          id,
        )
      ) {
        layer.w = Math.min(layer.w, Math.max(2, parent.w * 0.3));
        layer.h = Math.min(layer.h, Math.max(2, parent.h * 0.32));
      }
      const dx = parent.w,
        dy = parent.h;
      const offsets = {
        center: [0, 0],
        upper: [0, -dy * 0.23],
        lower: [0, dy * 0.24],
        left: [-dx * 0.25, 0],
        right: [dx * 0.25, 0],
        eye_left: [-dx * 0.23, -dy * 0.13],
        eye_right: [dx * 0.23, -dy * 0.13],
        lower_left: [-dx * 0.24, dy * 0.24],
        lower_right: [dx * 0.24, dy * 0.24],
        above: [0, -(dy + layer.h) / 2],
        below: [0, (dy + layer.h) / 2],
        beside_left: [-(dx + layer.w) / 2, 0],
        beside_right: [(dx + layer.w) / 2, 0],
        ear_left: [-dx * 0.33, -dy * 0.4],
        ear_right: [dx * 0.33, -dy * 0.4],
      };
      const [ox, oy] = offsets[layer.anchor];
      layer.x = parent.x + ox;
      layer.y = parent.y + oy;
    }
    layer.x = Math.max(layer.w / 2, Math.min(64 - layer.w / 2, layer.x));
    layer.y = Math.max(layer.h / 2, Math.min(64 - layer.h / 2, layer.y));
    if (layer.id === "upper_right") {
      const left = layout.layers.find((l) => l.id === "upper_left");
      if (left && left.parent === layer.parent && left.shape === layer.shape) {
        layer.w = left.w;
        layer.h = left.h;
      }
    }
    layout.layers.push(layer);
  }
  return layout;
}
export function contains(l, x, y) {
  const dx = (x - l.x) / (l.w / 2),
    dy = (y - l.y) / (l.h / 2);
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  switch (l.shape) {
    case "ellipse":
      return dx * dx + dy * dy <= 1;
    case "diamond":
      return Math.abs(dx) + Math.abs(dy) <= 1;
    case "triangle":
      return Math.abs(dx) <= (dy + 1) / 2;
    case "triangle_down":
      return Math.abs(dx) <= (1 - dy) / 2;
    case "rounded":
      return (
        Math.hypot(
          Math.max(0, Math.abs(dx) - 0.65),
          Math.max(0, Math.abs(dy) - 0.65),
        ) <= 0.35
      );
    case "heart": {
      const yy = -dy * 0.95 + 0.25;
      return (dx * dx + yy * yy - 1) ** 3 - dx * dx * yy ** 3 <= 0;
    }
    case "star": {
      const a = Math.atan2(dy, dx) + Math.PI / 2;
      return Math.hypot(dx, dy) <= 0.65 + 0.28 * Math.cos(5 * a);
    }
    case "crescent":
      return (
        dx * dx + dy * dy <= 1 &&
        (dx - 0.46) ** 2 + (dy + 0.18) ** 2 > 0.85 ** 2
      );
    default:
      return true;
  }
}
const rgb = (hex) =>
  hex
    .slice(1)
    .match(/../g)
    .map((n) => parseInt(n, 16));
function shadeIndex(colors, index, light) {
  const c = rgb(colors[index][1]);
  const wanted = c.map((v) => (light ? v + (255 - v) * 0.3 : v * 0.62));
  let best = index,
    score = Infinity;
  colors.forEach(([, hex], i) => {
    const v = rgb(hex);
    const d = v.reduce((s, n, k) => s + (n - wanted[k]) ** 2, 0);
    if (d < score) {
      score = d;
      best = i;
    }
  });
  return best;
}
export function rasterize(layout, paletteId, size) {
  const colors = palettes[paletteId].colors;
  const background = colors.findIndex(([k]) => k === layout.background),
    ink = 0,
    scale = 64 / size;
  const pixels = Array(size * size).fill(background),
    evidence = Array(size * size).fill(null),
    active = [];
  const fills = layout.layers.map((l) => {
    const base = colors.findIndex(([k]) => k === l.color);
    return {
      base,
      shadow: shadeIndex(colors, base, false),
      light: shadeIndex(colors, base, true),
    };
  });
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const x = (col + 0.5) * scale,
        y = (row + 0.5) * scale;
      let top = -1;
      for (let i = 0; i < layout.layers.length; i++)
        if (contains(layout.layers[i], x, y)) top = i;
      if (top < 0) continue;
      const l = layout.layers[top],
        fill = fills[top];
      const edge = [
        [scale, 0],
        [-scale, 0],
        [0, scale],
        [0, -scale],
      ].some(([dx, dy]) => !contains(l, x + dx, y + dy));
      const nx = (x - l.x) / (l.w / 2),
        ny = (y - l.y) / (l.h / 2);
      const lightSide = layout.lighting === "right" ? nx : -nx;
      let tone = "base";
      if (l.material !== "flat" && layout.lighting !== "flat") {
        if (lightSide - ny > 0.75) tone = "light";
        else if (lightSide - ny < -0.55) tone = "shadow";
      }
      if (l.material === "metal" && Math.abs(nx + 0.33) < 0.12) tone = "light";
      if (l.material === "wood" && col % 7 === 2) tone = "shadow";
      if (
        l.material === "brick" &&
        (row % 6 === 0 || (col + (Math.floor(row / 6) % 2) * 4) % 10 === 0)
      )
        tone = "shadow";
      if (
        l.material === "foliage" &&
        (Math.floor(col / 3) * 7 + Math.floor(row / 3) * 13) % 11 === 0
      )
        tone = "light";
      if (l.material === "water" && row % 6 === 1 && (col + row) % 11 < 5)
        tone = "light";
      const outline = layout.outline === "ink" ? ink : fill.shadow;
      if (edge && layout.outline !== "none" && l.w > 6 && l.h > 6)
        tone = "outline";
      const candidates = {
        base: fill.base,
        shadow: fill.shadow,
        light: fill.light,
        ...(edge && layout.outline !== "none" && l.w > 6 && l.h > 6
          ? { outline }
          : {}),
      };
      const index = row * size + col;
      pixels[index] = candidates[tone] ?? fill.base;
      // Tiny flat details are exact geometry. Refine larger surfaces; never disturb pupils or stems.
      if (l.w > 4 && l.h > 4 && l.material !== "flat" && !edge) {
        active.push(index);
        const selected = pixels[index];
        const refinementCandidates = {
          keep: selected,
          soften: fill.base,
          deepen: fill.shadow,
        };
        evidence[index] = {
          layer: l.id,
          nx: Number(nx.toFixed(2)),
          ny: Number(ny.toFixed(2)),
          edge,
          suggested: tone,
          candidates: refinementCandidates,
        };
      }
    }
  return { pixels, evidence, active };
}
export function buildRefinement(body, layout, raster, indices) {
  const colors = palettes[body.palette].colors;
  const questions = {};
  for (const index of indices) {
    const e = raster.evidence[index];
    questions[`p${index}`] = {
      type: "choice",
      instructions: `Refine pixel (${index % body.size},${Math.floor(index / body.size)}) on ${e.layer}. Local coordinates nx=${e.nx}, ny=${e.ny} (-1 left/top to 1 right/bottom). Contour pixel=${e.edge}. Coherent geometric lighting recommends ${e.suggested}. Select a subtle tone consistent with this SAME surface, its material, and the global light source. Choose keep to preserve the correctly computed local lighting; soften or deepen ONLY if the subject meaning strongly requires it. Keep is the intended default, not a neutral midtone. Preserve crisp silhouette and coherent highlight bands; no random speckles.`,
      criteria: Object.fromEntries(
        Object.entries(e.candidates).map(([tone, color]) => [
          tone,
          `${tone}: ${colors[color][0]} ${colors[color][1]}`,
        ]),
      ),
    };
  }
  return {
    model: "jev-latest",
    state: {
      artwork_description: body.prompt,
      canvas: `${body.size}x${body.size} actual pixels`,
      composition: layout,
    },
    questions,
  };
}
export function parseRefinement(data, payload, raster, indices) {
  return indices.map((index) => {
    const answer = data.answers?.[`p${index}`];
    const tone = readChoice(answer, payload.questions[`p${index}`].criteria);
    return {
      index,
      color: raster.evidence[index].candidates[tone],
      confidence: answer.confidence,
    };
  });
}
