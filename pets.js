export const PET_STAGES = [
  { id: 'sprout', level: 1, name: '萌芽幼龙', title: '每一次相遇，都是成长的开始', image: 'assets/pet-dragon.png', trait: '柔软小翅膀 · 暖金幼角', description: '圆圆的脸颊，藏着满满的好奇。陪它认识一个新单词，一起迈出小小的一步。' },
  { id: 'wind', level: 4, name: '风翼龙', title: '展开双翼，去看更远的世界', image: 'assets/pet-dragon-wind.png', trait: '舒展风翼 · 挺拔龙角', description: '小小的翅膀变得宽阔，站姿也更加自信。它已经准备好，陪你飞向下一段冒险。' },
  { id: 'crystal', level: 8, name: '晶甲龙', title: '把每一份坚持，炼成守护的力量', image: 'assets/pet-dragon-crystal.png', trait: '翡翠晶甲 · 闪耀胸晶', description: '玉晶护甲在肩上生长，宽大的双翼蓄满力量。昔日的小伙伴，如今有了守护者的模样。' },
  { id: 'celestial', level: 12, name: '星冠龙', title: '星光为冠，与你一起奔赴天空', image: 'assets/pet-dragon-celestial.png', trait: '金角星冠 · 华丽晶翼', description: '舒展的晶翼、修长的金角与星光交相辉映。那只陪你学第一个单词的小龙，已经长成了威风的天空守护者。' }
];

export function petStage(level) {
  return PET_STAGES.findLast(stage => level >= stage.level) || PET_STAGES[0];
}

export function nextPetStage(level) {
  return PET_STAGES.find(stage => stage.level > level) || null;
}

export function growthToStage(progress, stage) {
  if (!stage || progress.level >= stage.level) return 0;
  const threshold = level => 15 * (level - 1) * (level + 2);
  return threshold(stage.level) - threshold(progress.level) - progress.current;
}
