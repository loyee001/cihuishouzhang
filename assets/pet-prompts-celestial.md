# Lv12 星冠龙生成记录

- 工具：内置 image_gen；透明背景开启。
- 身份与风格参考：`assets/pet-dragon.png`（原文件未修改）。
- 最终文件：`assets/pet-dragon-celestial.png`。
- 生成源文件：`/Users/cross/.codex/generated_images/01a0f6d0-2496-7d52-82a8-39a2ed391fbe/exec-c767ced4-a776-4151-991d-3eafef8a7704.png`。
- 图像只作原样复制，没有后期修图。

## 首次生成提示词

Use case: stylized-concept, finished watercolor game companion asset.
Asset type: single character sprite, square composition, genuine transparent alpha background.
Input reference: /Users/cross/loyeeproduct/think1-journal/assets/pet-dragon.png is an IDENTITY and WATERCOLOR STYLE reference. Reimagine this exact friendly mint-green baby dragon as its magnificent fully mature final evolution, the Celestial Star-Crown Dragon (Level 12). Do not copy the baby proportions.
Subject: one breathtaking, regal yet kind adult dragon, recognizable mint and emerald skin, pale cream chest and segmented belly, warm pale-gold horns, deep forest-green expressive eyes, soft hand-painted watercolor textures. A graceful long neck, proportionally smaller mature head, athletic elegant body, strong shapely legs and paws. Confident protective expression with a subtle warm smile. Dynamic elegant three-quarter standing or gently hovering pose, all body parts visible. Two very large majestic layered emerald wings, a magical feather-crystal arrangement layered into membranous dragon wings, translucent jade tips and delicate watercolor edges; wings spread outward and upward in a beautiful balanced silhouette. Long graceful tail curls outward into an ornate emerald fin. Long branching golden horns form a natural star crown above its head. A few faceted jade-crystal shoulder scales. One refined small star-shaped gemstone with thin warm-gold edging at the chest. Only a few tiny gold star sparks float near the silhouette. Gold ornamentation is restrained, tasteful, not armor-covered. This must feel visibly more mature, powerful, elegant, and visually splendid than the reference baby while still soft, warm and welcoming for a child's vocabulary-learning app.
Composition: square full-body cutout, entire wings, tail, horns, all toes and all star sparkles contained within image. At least 8 percent clear transparent padding on all four sides, with no clipped anatomy. Centered and visually balanced, readable at small sizes.
Style: delicate hand-painted watercolor and colored-pencil detail, subtle pigment granulation, soft irregular natural edges, luminous emerald and mint palette, cream highlights, restrained pale gold. Beautiful finished illustration, same storybook family as input reference; not photorealistic, not 3D, not pixel art.
Constraints: genuinely transparent background. No text, no labels, no numbers, no letters, no scenery, no ground, no floor, no cast-shadow platform, no frame, no border, no extra characters, no black or white opaque background. Do not retain the oversized baby head, tiny baby wings or chubby seated baby pose.

## 构图修订提示词

Input reference: /Users/cross/.codex/generated_images/01a0f6d0-2496-7d52-82a8-39a2ed391fbe/exec-c33d2e19-b254-4ba3-bd7e-b0994e380ee5.png

Edit this exact finished watercolor Celestial Star-Crown Dragon asset. Preserve the dragon design, pose, face, colors, watercolor texture, mature proportions, branching gold horn crown, large layered emerald wings, jade shoulders, chest star and elegant curling tail exactly. Change ONLY the framing: show the COMPLETE existing dragon and all tiny gold sparkles at a noticeably SMALLER size, precisely centered within a larger square TRANSPARENT canvas. The total silhouette including horns, both wing tips, tail tip, toes and sparkles must fit inside the central 76 percent of the square. Leave at least 12 percent of the whole canvas EMPTY and genuinely TRANSPARENT on every side (top, bottom, left, right). The left and right wings and every toe must be fully visible and not touching the image borders. This is an uncropped full-body character sheet with generous empty transparent margins. Do not crop or zoom in. Do not change character design. No background, scene, text, floor, shadow, border or extra characters. Keep true transparent alpha.

## 验证

- RGBA PNG，1254 × 1254；alpha 范围 0–255，存在真正透明像素。
- 已人工查看：成熟长颈与身躯比例、友善深绿眼睛、薄荷翡翠配色、奶油腹部、金色分叉星冠角、玉晶肩鳞、胸前星形宝石、华丽舒展尾巴、完整双翼及足爪均可见；没有背景、文字、地面、边框或额外角色。
- 可见主体边界（alpha ≥ 8）：(157, 178, 1107, 1116)，左右上下可见留白约 12.5%、11.7%、14.2%、11.0%。
- 工具生成的极低透明度像素（alpha 1–7）散落在更外围；原样保留，没有手工清除。非零 alpha 总边界为 (0, 33, 1228, 1204)。
