import {generateLevel} from './puzzle.js';
// "Loops let go": every loop in each completed journey level, plus the loops of each daily tangle the first time it is solved.
// Replays never add, so the total grows with progress and daily visits, not with grinding one level.
export const LEVEL_LOOPS=Array.from({length:24},(_,i)=>generateLevel(i).rings.length);
export function dailyLoops(key){return /^\d{4}-\d{2}-\d{2}$/.test(key)?generateLevel(17,Number(key.replaceAll('-',''))).rings.length:0;}
export function loopsLetGo(saved){
 const journey=Object.keys(saved.completed||{}).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<24).reduce((sum,i)=>sum+LEVEL_LOOPS[i],0);
 return journey+(Number.isSafeInteger(saved.dailyLoops)&&saved.dailyLoops>0?saved.dailyLoops:0);
}
export function requestPlayerSession(config,win=window){
 if(win.parent===win)return Promise.reject(Error('Play on AIWANNA to join the online board.'));
 return new Promise((resolve,reject)=>{
  const requestId=crypto.randomUUID();
  const finish=(error,session)=>{win.clearTimeout(timer);win.removeEventListener('message',receive);error?reject(error):resolve(session);};
  const receive=event=>{const d=event.data;if(event.source!==win.parent||!config.origins.includes(event.origin)||d?.source!=='aimadegames-platform'||d.type!=='leaderboard-session'||d.requestId!==requestId)return;
   if(d.error)return finish(Error(String(d.error)));
   if(d.apiOrigin!==event.origin||!d.session?.token||d.session.gameId!==config.gameId||!d.session.player?.displayName)return finish(Error('Invalid player session.'));
   finish(null,{...d.session,apiOrigin:event.origin});
  };
  const timer=win.setTimeout(()=>finish(Error('AIWANNA connection timed out.')),15000);win.addEventListener('message',receive);
  // The game can be embedded on any official AIWANNA domain; the browser only delivers to the real parent.
  for(const origin of config.origins)win.parent.postMessage({source:'aimadegames',type:'leaderboard-session',requestId},origin);
 });
}
export class Leaderboard{
 constructor(config,{fetcher=globalThis.fetch?.bind(globalThis),sessionProvider=()=>requestPlayerSession(config)}={}){this.config=config;this.fetcher=fetcher;this.sessionProvider=sessionProvider;this.session=null;}
 available(key){return !!(this.config.gameId&&this.config.gameSlug&&this.config.boards[key]);}
 url(key){return this.available(key)?`${this.session?.apiOrigin||this.config.origin}/games/${encodeURIComponent(this.config.gameSlug)}/leaderboard?board=${encodeURIComponent(this.config.boards[key])}`:null;}
 begin(key){
  if(!this.available(key))return null;
  const run={boardId:this.config.boards[key],startKey:crypto.randomUUID(),scoreKey:crypto.randomUUID(),runId:null,score:null,owner:null};
  run.startPromise=this.start(run);run.startPromise.catch(()=>{});return run;
 }
 async sessionFor(run,refresh=false){
  let s=this.session;if(refresh||!s||Date.parse(s.expiresAt)<=Date.now()+60000)s=await this.sessionProvider();
  if(s.gameId!==this.config.gameId)throw Error('Player session belongs to another game.');
  const owner=`${s.player.id||s.player.displayName}\0${s.player.isGuest}`;
  if(run&&run.owner&&run.owner!==owner)throw Error('Player changed. Start a new puzzle.');if(run)run.owner=owner;this.session=s;return s;
 }
 async request(run,path,{key,body,method='POST'}={}){
  for(let attempt=0;attempt<2;attempt++){
   const s=await this.sessionFor(run,attempt>0),headers={Authorization:`Bearer ${s.token}`,...(key?{'Idempotency-Key':key}:{}),...(body?{'Content-Type':'application/json'}:{})};
   const response=await this.fetcher(`${s.apiOrigin||this.config.origin}/api/v1/${path}`,{method,credentials:'omit',headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
   const data=await response.json().catch(()=>({}));if(response.ok)return data;if(response.status===401&&!attempt)continue;throw Error(data.error?.message||`AIWANNA unavailable (${response.status}).`);
  }
 }
 async start(run){if(run.runId)return run.runId;const data=await this.request(run,`leaderboards/${run.boardId}/runs`,{key:run.startKey});if(typeof data.runId!=='string')throw Error('Could not register this puzzle.');run.runId=data.runId;return run.runId;}
 async submit(run,score){
  if(!run)throw Error('Online leaderboard is not connected yet.');
  if(!Number.isSafeInteger(score)||score<this.config.minScore||score>this.config.maxScore)throw Error('Invalid score.');
  if(run.score!==null&&run.score!==score)throw Error('Final score cannot change on retry.');run.score=score;
  if(run.receipt)return run.receipt;if(run.submission)return run.submission;
  run.submission=(async()=>{let id;try{id=await run.startPromise;}catch{run.startPromise=this.start(run);id=await run.startPromise;}const receipt=await this.request(run,`runs/${encodeURIComponent(id)}/score`,{key:run.scoreKey,body:{score}});if(receipt.accepted!==true)throw Error('Score was not accepted.');run.receipt=receipt;return receipt;})();
  try{return await run.submission;}finally{run.submission=null;}
 }
 // Top of the board plus the player's own row, for the Rankings dialog.
 async standings(key,limit=10){
  if(!this.available(key))throw Error('Online board opens once the game is on AIWANNA.');
  const id=this.config.boards[key],[top,me]=await Promise.all([this.request(null,`leaderboards/${id}/entries?limit=${limit}`,{method:'GET'}),this.request(null,`leaderboards/${id}/me?around=0`,{method:'GET'})]);
  return {entries:Array.isArray(top.entries)?top.entries:[],me:me.entry||null};
 }
}
