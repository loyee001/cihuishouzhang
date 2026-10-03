import { petProgress, streak } from './core.js';
import { PET_STAGES, petStage, nextPetStage, growthToStage } from './pets.js';

function evolutionPath(state, icon, petImage) {
  const progress = petProgress(state), current = petStage(progress.level), next = nextPetStage(progress.level);
  return `<section class="paper-card evolution-card">
    <div class="section-heading"><div><span class="eyebrow">A LITTLE DRAGON, A BIG ADVENTURE</span><h2>小龙进化图鉴</h2></div><span class="evolution-count">${PET_STAGES.filter(stage=>stage.level<=progress.level).length} / ${PET_STAGES.length}</span></div>
    <p class="evolution-intro">每一段成长，都会有新的模样。点击卡片预览。</p>
    <div class="evolution-grid">${PET_STAGES.map(stage=>{
      const active=stage.id===current.id, unlocked=progress.level>=stage.level;
      return `<button class="evolution-option ${stage.id} ${active?'current':''} ${unlocked?'unlocked':'locked'}" data-action="preview-pet" data-stage="${stage.id}" aria-label="预览${stage.name}，${active?'当前形态':unlocked?'已解锁':`Lv. ${stage.level} 解锁`}"><span class="evolution-level">Lv. ${stage.level}</span>${petImage('',stage)}<strong>${stage.name}</strong><span class="evolution-status">${active?'正在陪伴你':unlocked?'已解锁':`Lv. ${stage.level} 进化`}</span></button>`;
    }).join('')}</div>
    <div class="next-evolution">${icon(next?'star':'check')}<p>${next?`下一次进化：<b>${next.name}</b><small>到达 Lv. ${next.level} · 还需 ${growthToStage(progress,next)} 成长值</small>`:'<b>所有进化形态已点亮</b><small>继续学习，星冠龙会陪你挑战更高等级。</small>'}</p></div>
  </section>`;
}

export function petPreviewView(state, stageId, esc, petImage) {
  const stage = PET_STAGES.find(item=>item.id===stageId);
  if (!stage) return null;
  const progress=petProgress(state), active=petStage(progress.level).id===stage.id, unlocked=progress.level>=stage.level;
  return `<div class="evolution-preview ${stage.id}">
    <span class="eyebrow">DRAGON FIELD NOTES · ${String(PET_STAGES.indexOf(stage)+1).padStart(2,'0')}</span>
    <span class="label lavender">${active?'当前形态':unlocked?'已解锁形态':`Lv. ${stage.level} 解锁`}</span>
    <div class="preview-art pet-aura ${stage.id}">${petImage('',stage)}</div>
    <h2>${stage.name}</h2><p class="pet-trait">${stage.trait}</p><p class="evolution-story">${stage.description}</p>
    <div class="preview-unlock">${unlocked?'每次进化都会自动换上新的模样。':`再获得 ${growthToStage(progress,stage)} 成长值，即可进化到这个形态。`}</div>
    <button class="button secondary" data-action="close-dialog">继续陪伴${esc(state.petName)}</button>
  </div>`;
}

export function petPageView(state, toolbar, icon, esc, petImage) {
  const level=petProgress(state), stage=petStage(level.level), learned=state.learned.length;
  const badges=[{icon:'leaf',name:'第一片新叶',description:'学会第一个单词',earned:learned>=1},{icon:'book',name:'词汇收藏家',description:'累计学会 12 个词',earned:learned>=12},{icon:'star',name:'闪亮满分',description:'至少 5 词的全对默写',earned:state.achievements.includes('perfect')}];
  return `${toolbar('GROW A LITTLE TOGETHER')}
  <div class="pet-layout evolved-layout">
    <section class="paper-card pet-home ${stage.id}">
      <div class="pet-home-heading"><span class="eyebrow">MY LITTLE COMPANION</span><span class="pet-form-tag">${icon('star')}${stage.name}</span></div>
      <div class="large-pet-stage pet-aura ${stage.id}">${petImage()}<span class="pet-spark spark-one" aria-hidden="true">✦</span><span class="pet-spark spark-two" aria-hidden="true">✧</span><span class="pet-spark spark-three" aria-hidden="true">✦</span></div>
      <div class="pet-name-line"><h2>${esc(state.petName)}</h2><span class="level-tag">Lv. ${level.level}</span><button class="icon-button" data-action="rename-pet" aria-label="给宠物改名">${icon('pen')}</button></div>
      <p class="pet-caption">${stage.title}</p><span class="pet-trait">${stage.trait}</span>
      <div class="pet-growth">
        <div class="progress-label"><span>Lv. ${level.level} <span aria-hidden="true">→</span> Lv. ${level.level+1}</span><b>${level.current} / ${level.target}</b></div>
        <div class="progress rose" role="progressbar" aria-label="本级成长值" aria-valuenow="${level.current}" aria-valuemin="0" aria-valuemax="${level.target}"><span style="width:${level.current/level.target*100}%"></span></div>
        <p class="pet-remaining">再获得 <b>${level.target-level.current}</b> 成长值，就能升到下一级</p>
      </div>
      <button class="button primary" data-action="feed" ${state.treats<1?'disabled':''}>${icon('gift')}喂一份小点心 <span class="treat-count">${state.treats}</span></button>
      <p class="form-hint">学会一个新词，获得一份点心；喂食增加 5 成长值。</p>
      <details class="growth-rules"><summary>升级需要多少成长值？</summary><p>从 60 开始，每升一级，下次升级所需成长值增加 30。</p><div class="level-costs">${[0,1,2].map(offset=>`<span>Lv. ${level.level+offset} → ${level.level+offset+1}<b>${level.target+offset*30}</b></span>`).join('')}</div>${state.petXpBonus>0?'<p class="migration-note">原有等级与学习记录已保留，后续按新门槛继续成长。</p>':''}</details>
    </section>
    <div class="pet-details">${evolutionPath(state,icon,petImage)}<section class="paper-card"><div class="section-heading"><h2>我们一起的成长</h2>${icon('leaf')}</div><div class="pet-numbers"><div><strong>${learned}</strong><span>累计学会</span></div><div><strong>${state.totalDictations}</strong><span>完成默写</span></div><div><strong>${streak(Object.keys(state.activity))}</strong><span>连续学习 / 天</span></div></div></section></div>
  </div>
  <div class="pet-bottom-grid">
    <section class="paper-card badge-card"><div class="section-heading"><h2>小小成就墙</h2><span class="muted">${badges.filter(b=>b.earned).length} / 3</span></div><div class="badges">${badges.map(b=>`<div class="badge ${b.earned?'earned':''}"><span>${icon(b.icon)}</span><div><b>${b.name}</b><p>${b.description}</p></div><small>${b.earned?'已点亮':'待解锁'}</small></div>`).join('')}</div></section>
    <section class="paper-card growth-tips"><span class="eyebrow">LITTLE STEPS COUNT</span><h2>下一次进化，从一个单词开始</h2><div class="growth-rewards"><p>学习新词 <b>+10</b></p><p>默写正确 <b>+5</b></p><p>游戏配对 <b>+3</b></p><p>词义挑战 <b>+2</b></p></div><a href="#learn" class="button secondary">继续学单词</a></section>
  </div>`;
}
