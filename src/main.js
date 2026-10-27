import {generateLevel,neighbors,releaseStatus,commitRotation,undo,hint,stars,daySeed,wrap} from './puzzle.js';
import {pickLanguage,translator} from './i18n.js';
import {RingRenderer} from './renderer.js';
import {Leaderboard,loopsLetGo,dailyLoops} from './leaderboard.js';
import {leaderboardConfig,LOOPS_LET_GO} from './leaderboard-config.js';
const $=id=>document.getElementById(id),canvas=$('board'),dialog=$('dialog');
const lang=pickLanguage(location.search,navigator.languages||[navigator.language]),t=translator(lang);
document.documentElement.lang=lang;document.title=t('doc.title');document.querySelector('meta[name=description]').content=t('doc.description');
document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));
document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));document.querySelectorAll('[data-i18n-title]').forEach(el=>el.title=t(el.dataset.i18nTitle));
const levelName=i=>t(`level.${i}`),chapterName=i=>t(`chapter.${i}`);
function showTotal(total){$('loops-total').innerHTML=t(total===1?'intro.loopsOne':'intro.loops',{n:`<b>${total}</b>`});}
let renderer;try{renderer=new RingRenderer(canvas);}catch(error){$('webgl-error').hidden=false;console.error('3D unavailable',error);}
let saved={unlocked:0,completed:{},daily:{},last:0};try{const s=JSON.parse(localStorage.getItem('little-loops-v1')||'null');if(s&&Number.isInteger(s.unlocked)&&s.unlocked>=0&&s.unlocked<24&&s.completed&&typeof s.completed==='object'&&s.daily&&typeof s.daily==='object')saved={...saved,...s};}catch{}
// Saves from before the leaderboard: credit the daily tangles already on record.
if(!Number.isSafeInteger(saved.dailyLoops)||saved.dailyLoops<0)saved.dailyLoops=Object.keys(saved.daily).reduce((sum,key)=>sum+dailyLoops(key),0);
const board=new Leaderboard(leaderboardConfig);let rankedRun=null;
let puzzle,selected=null,drag=null,previewAngle=null,animationClock=0,winTimer=null,winAgain=null,lastTime=0,mode='journey',dailyKey=null,sound=false,audio=null,session=0,startedAt=0;
function persist(){try{localStorage.setItem('little-loops-v1',JSON.stringify(saved));}catch{}}
function chime(win=false){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=win?[523.25,659.25,783.99,1046.5]:[523.25+Math.min(6,puzzle.rings.filter(r=>!r.active).length)*65.4,783.99];notes.forEach((frequency,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.08;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.5);});}catch{sound=false;}}
function load(index=0,isDaily=false){
 clearTimeout(winTimer);winAgain=null;session++;drag=null;previewAngle=null;selected=null;mode=isDaily?'daily':'journey';const day=daySeed();dailyKey=isDaily?day.key:null;puzzle=generateLevel(index,isDaily?day.seed:undefined);startedAt=performance.now();rankedRun=window.parent!==window?board.begin(LOOPS_LET_GO):null;showTotal(loopsLetGo(saved));renderer?.load(puzzle);if(dialog.open)dialog.close();
 if(!isDaily){saved.last=index;persist();}$('level-label').innerHTML=isDaily?t('label.daily')+' <span> / '+day.key.slice(5)+'</span>':`${t('label.level',{n:String(index+1).padStart(2,'0')})} <span>/ 24</span>`;$('level-title').textContent=isDaily?t('daily.title'):levelName(index);$('chapter-index').textContent=String(Math.floor(index/6)+1).padStart(2,'0');$('chapter-title').textContent=isDaily?t('chapter.daily'):chapterName(Math.floor(index/6));
 $('chapter-dots').replaceChildren();for(let i=0;i<6;i++){const dot=document.createElement('i'),n=Math.floor(index/6)*6+i;dot.className=n===index?'current':saved.completed[n]?'done':'';$('chapter-dots').append(dot);}
 message(index===0&&!isDaily?t('msg.start'):t('msg.find'));update();
}
function message(text,ready=false){$('board-message').textContent=text;$('board-message').classList.toggle('ready',ready);}
function update(){const remaining=puzzle.rings.filter(r=>r.active).length;$('moves').textContent=puzzle.moves;$('remaining').textContent=remaining;$('undo').disabled=!puzzle.history.length||puzzle.complete;$('hint').disabled=puzzle.complete;$('release').disabled=puzzle.complete?!winAgain:selected===null;$('release').textContent=t(puzzle.complete&&winAgain?'win.continue':'release');$('turn-left').disabled=$('turn-right').disabled=selected===null||puzzle.complete;
 if(selected!==null&&puzzle.rings[selected].active){const links=neighbors(puzzle,selected).length;$('selected-label').textContent=t(links===1?'sel.label':'sel.labelMany',{n:selected+1,links});$('selection-line').textContent=t('sel.turn');}else{$('selected-label').textContent=t('sel.pick');$('selection-line').textContent=t(remaining?'sel.drag':'sel.lighter');}
}
function select(id){selected=id;previewAngle=puzzle.rings[id].angle;renderer?.select(id);update();const status=releaseStatus(puzzle,id);message(t(status.links.length>1?'msg.manyLinks':status.links.length===0?'msg.lastLoop':'msg.turnToward'));}
function finishTurn(angle){if(selected===null||puzzle.complete)return;const id=selected,status=releaseStatus(puzzle,id,angle),result=commitRotation(puzzle,id,angle);renderer?.visualAngles.delete(id);previewAngle=null;
 if(result.removed){renderer?.remove(id,animationClock);selected=null;renderer?.select(null);message(t(puzzle.complete?'msg.allDone':`msg.removed.${id%4}`),true);chime();if(puzzle.complete)complete();}
 else message(t(status.links.length>1?'msg.stillLinked':'msg.nearly'));
 update();
}
function complete(){
 const earned=stars(puzzle),record={stars:earned,moves:puzzle.moves,hints:puzzle.hints},before=loopsLetGo(saved);
 if(mode==='daily'){const old=saved.daily[dailyKey];if(!old)saved.dailyLoops+=puzzle.rings.length;if(!old||earned>old.stars||earned===old.stars&&puzzle.moves<old.moves)saved.daily[dailyKey]=record;const keys=Object.keys(saved.daily).sort();for(const key of keys.slice(0,-45))delete saved.daily[key];}
 else{const old=saved.completed[puzzle.index];if(!old||earned>old.stars||earned===old.stars&&puzzle.moves<old.moves)saved.completed[puzzle.index]=record;saved.unlocked=Math.max(saved.unlocked,Math.min(23,puzzle.index+1));}
 persist();const total=loopsLetGo(saved),gained=total-before;showTotal(total);
 // The cumulative total is sent after every finish, so a failed or skipped submission catches up next time.
 const ranked=rankedRun&&total>0?board.submit(rankedRun,total):null;ranked?.catch(()=>{});rankedRun=null;
 const current=session;let rankText=gained>0?'':t('win.counted');
 // Closing the win dialog by accident keeps the result: the board, Enter or the release button bring it back.
 winAgain=()=>{const last=puzzle.index===23&&mode==='journey';openDialog(`<div class="dialog-kicker">${mode==='daily'?t('win.daily'):last?t('win.final'):t('win.level',{n:String(puzzle.index+1).padStart(2,'0')})}</div><h2 class="dialog-title">${t(last?'win.titleFinal':'win.title')}</h2><div class="star-row" aria-label="${t('win.stars',{n:earned})}">${[1,2,3].map(i=>`<span class="${i>earned?'empty':''}">✦</span>`).join('')}</div><p class="dialog-copy">${t(mode==='daily'?'win.copyDaily':last?'win.copyFinal':'win.copy')}</p><div class="win-metrics"><div><b>${puzzle.moves}</b><small>${t('stat.moves')}</small></div><div><b>${puzzle.hints}</b><small>${t('win.hints')}</small></div><div><b>${total}${gained>0?`<sup>+${gained}</sup>`:''}</b><small>${t('win.loops')}</small></div></div><p class="rank-line" id="rank-line">${rankText}</p><button id="next-level" class="primary">${t(mode==='daily'?'win.backJourney':last?'win.tryDaily':'win.next')}</button><button id="replay" class="secondary">${t('win.replay')}</button>`);
  $('next-level').onclick=()=>mode==='daily'?load(Math.min(saved.unlocked,saved.last)):last?load(17,true):load(puzzle.index+1);$('replay').onclick=()=>load(puzzle.index,mode==='daily');};
 const showRank=text=>{if(session!==current)return;rankText=text;const line=$('rank-line');if(line)line.textContent=text;};
 ranked?.then(r=>{if(r.rank)showRank(t('win.rank',{rank:r.rank,total:r.participants}));}).catch(()=>showRank(t('win.offline')));
 winTimer=setTimeout(()=>{if(session!==current)return;chime(true);winAgain();update();},renderer?.reduced?100:650);
}
canvas.addEventListener('pointerdown',e=>{if(puzzle.complete&&winAgain&&!dialog.open){e.preventDefault();winAgain();return;}if(!renderer||puzzle.complete||dialog.open||drag)return;const point=renderer.toWorld(e.clientX,e.clientY),id=renderer.hit(point);if(id===null)return;e.preventDefault();canvas.focus({preventScroll:true});select(id);const ring=puzzle.rings[id];drag={id,pointerId:e.pointerId,start:Math.atan2(point.y-ring.y,point.x-ring.x),angle:ring.angle,current:ring.angle};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;const p=renderer.toWorld(e.clientX,e.clientY),ring=puzzle.rings[drag.id],a=Math.atan2(p.y-ring.y,p.x-ring.x);drag.current=wrap(drag.angle+wrap(a-drag.start));previewAngle=drag.current;renderer.setAngle(drag.id,drag.current);const status=releaseStatus(puzzle,drag.id,drag.current);if(status.ready)message(t('msg.ready'),true);else if(status.links.length>1)message(t('msg.outsideFirst'));else message(t('msg.turnOther'));});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.pointerId!==e.pointerId)return;const angle=drag.current;drag=null;finishTurn(angle);});
function cancelDrag(){if(drag){renderer?.visualAngles.delete(drag.id);drag=null;previewAngle=null;}}
canvas.addEventListener('pointercancel',cancelDrag);canvas.addEventListener('lostpointercapture',cancelDrag);window.addEventListener('blur',cancelDrag);
function turn(amount){if(selected===null||!puzzle.rings[selected].active)return;previewAngle=wrap((previewAngle??puzzle.rings[selected].angle)+amount);renderer?.setAngle(selected,previewAngle);const status=releaseStatus(puzzle,selected,previewAngle);message(t(status.ready?'msg.aligned':status.links.length>1?'msg.outsideFirst':'msg.more'),status.ready);}
$('turn-left').onclick=()=>turn(Math.PI/12);$('turn-right').onclick=()=>turn(-Math.PI/12);$('release').onclick=()=>puzzle.complete?winAgain?.():finishTurn(previewAngle??puzzle.rings[selected]?.angle);
canvas.addEventListener('keydown',e=>{if(!dialog.open&&puzzle.complete&&winAgain&&(e.key==='Enter'||e.key===' ')){e.preventDefault();winAgain();return;}if(dialog.open||puzzle.complete)return;if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const active=puzzle.rings.filter(r=>r.active),at=active.findIndex(r=>r.id===selected),next=(at+(e.key==='ArrowDown'?1:-1)+active.length)%active.length;select(active[next].id);}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(selected===null)select(puzzle.rings.find(r=>r.active).id);turn((e.key==='ArrowLeft'?1:-1)*Math.PI/12);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(selected!==null)finishTurn(previewAngle??puzzle.rings[selected].angle);}});
$('undo').onclick=()=>{clearTimeout(winTimer);if(undo(puzzle)){selected=null;previewAngle=null;renderer?.load(puzzle);message(t('msg.undo'));update();}};
$('hint').onclick=()=>{const h=hint(puzzle);if(!h)return;puzzle.hints++;select(h.id);renderer?.showHint(h);message(t(neighbors(puzzle,h.id).length?'msg.hint':'msg.hintFree'));};
$('reset').onclick=()=>{if(!puzzle.moves&&!puzzle.hints){load(puzzle.index,mode==='daily');return;}openDialog(`<div class="dialog-kicker">${t('reset.kicker')}</div><h2 class="dialog-title">${t('reset.title')}</h2><p class="dialog-copy">${t('reset.copy')}</p><button id="confirm-reset" class="primary">${t('reset.confirm')}</button><button id="cancel-reset" class="secondary">${t('reset.cancel')}</button>`);$('confirm-reset').onclick=()=>load(puzzle.index,mode==='daily');$('cancel-reset').onclick=()=>dialog.close();};
function openDialog(html){cancelDrag();$('dialog-content').innerHTML=html;if(!dialog.open)dialog.showModal();}
$('close-dialog').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(puzzle.complete&&winAgain)message(t('msg.continue'),true);});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function levels(){openDialog(`<div class="dialog-kicker">${t('intro.journey')}</div><h2 class="dialog-title">${t('levels.title')}</h2><p class="dialog-copy">${t('levels.copy')}</p><div class="level-grid">${Array.from({length:24},(_,i)=>levelName(i)).map((name,i)=>`${i%6===0?'<div class="level-group-name">'+chapterName(i/6)+'</div>':''}<button data-level="${i}" class="${saved.completed[i]?'done ':''}${i===puzzle.index&&mode==='journey'?'selected':''}" ${i>saved.unlocked?'disabled':''} aria-label="${saved.completed[i]?t('levels.ariaStars',{n:i+1,name,stars:saved.completed[i].stars}):t('levels.aria',{n:i+1,name})}">${i>saved.unlocked?'·':i+1}${saved.completed[i]?'<small>'+'✦'.repeat(saved.completed[i].stars)+'</small>':''}</button>`).join('')}</div><button id="daily-dialog" class="primary">${t('levels.daily')}</button>`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>load(Number(b.dataset.level)));$('daily-dialog').onclick=()=>load(17,true);}
function rankings(){
 const total=loopsLetGo(saved),current=session;
 openDialog(`<div class="dialog-kicker">${t('rank.kicker')}</div><h2 class="dialog-title">${total}</h2><p class="dialog-copy">${t(total===1?'rank.copyOne':'rank.copy')}</p><ol class="board-list" id="board-list"></ol><p class="rank-line" id="board-note"></p><button id="rank-done" class="primary">${t('rank.done')}</button>`);
 $('rank-done').onclick=()=>dialog.close();
 const note=$('board-note'),list=$('board-list');
 if(!board.available(LOOPS_LET_GO)){note.textContent=t('rank.local');return;}
 if(window.parent===window){note.textContent=t('rank.standalone');return;}
 note.textContent=t('rank.loading');
 board.standings(LOOPS_LET_GO).then(({entries,me})=>{
  if(session!==current||!dialog.open||!list.isConnected)return;
  const row=e=>{const li=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('b'),score=document.createElement('em');li.className=e.isMe?'me':'';rank.textContent=`#${e.rank}`;name.textContent=e.player?.displayName||t('rank.player');score.textContent=e.score;li.append(rank,name,score);return li;};
  list.replaceChildren(...entries.map(row));if(me&&!entries.some(e=>e.isMe))list.append(row({...me,isMe:true}));
  note.textContent=entries.length?'':t('rank.empty');
  const url=board.url(LOOPS_LET_GO);if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=t('rank.full');note.append(a);}
 }).catch(error=>{if(list.isConnected)note.textContent=t('rank.error',{error:error.message});});
}
$('rankings').onclick=rankings;$('rankings-link').onclick=rankings;
$('levels').onclick=levels;$('daily').onclick=()=>load(17,true);
$('help').onclick=()=>{openDialog(`<div class="dialog-kicker">${t('help.kicker')}</div><h2 class="dialog-title">${t('help.title')}</h2><ol class="help-steps"><li>${t('help.step1')}</li><li>${t('help.step2')}</li><li>${t('help.step3')}</li></ol><p class="dialog-copy">${t('help.copy')}</p><button id="help-done" class="primary">${t('help.done')}</button>`);$('help-done').onclick=()=>dialog.close();};
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-label',t(sound?'sound.off':'sound.on'));$('mute-dot').hidden=sound;if(sound)chime();};
window.addEventListener('resize',()=>renderer?.resize());
function frame(now){const dt=Math.min(.05,(now-lastTime)/1000)||0;lastTime=now;animationClock=now/1000;if(!document.hidden)renderer?.render(animationClock,dt);requestAnimationFrame(frame);}
load(Math.min(saved.unlocked,Number.isInteger(saved.last)?Math.max(0,Math.min(23,saved.last)):0));requestAnimationFrame(frame);
