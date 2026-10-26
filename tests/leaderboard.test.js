import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL_LOOPS,dailyLoops,loopsLetGo,requestPlayerSession,Leaderboard} from '../src/leaderboard.js';
import {generateLevel} from '../src/puzzle.js';
import {leaderboardConfig,LOOPS_LET_GO} from '../src/leaderboard-config.js';
const config={...leaderboardConfig,gameId:'game-1',gameSlug:'little-loops',boards:{[LOOPS_LET_GO]:'board-1'}};
test('each completed journey level counts its loops once, plus the daily tally',()=>{
 assert.equal(loopsLetGo({completed:{},dailyLoops:0}),0);
 assert.equal(loopsLetGo({completed:{0:{stars:3},1:{stars:1}},dailyLoops:0}),LEVEL_LOOPS[0]+LEVEL_LOOPS[1]);
 assert.equal(LEVEL_LOOPS[0],2);assert.equal(LEVEL_LOOPS[1],3);
 assert.equal(loopsLetGo({completed:{0:{},99:{},x:{}},dailyLoops:7}),2+7,'unknown levels are ignored');
 assert.equal(loopsLetGo({completed:{},dailyLoops:-4}),0);
});
test('a daily tangle is worth the loops of that day’s puzzle',()=>{
 assert.equal(dailyLoops('2026-10-26'),generateLevel(17,20261026).rings.length);assert.equal(dailyLoops('nope'),0);
});
function fakeWindow(reply){
 const listeners=new Set(),win={setTimeout,clearTimeout,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),sent:[]};
 win.parent={postMessage:(message,origin)=>{win.sent.push(origin);if(origin===reply.origin)queueMicrotask(()=>listeners.forEach(f=>f({source:win.parent,origin,data:{source:'aimadegames-platform',type:'leaderboard-session',requestId:message.requestId,apiOrigin:reply.apiOrigin??origin,session:{token:'t',expiresAt:new Date(Date.now()+3600e3).toISOString(),gameId:'game-1',player:{displayName:'Ana',isGuest:false}}}})));}};
 return win;
}
test('the handshake asks every official AIWANNA origin and uses the one that answers',async()=>{
 const win=fakeWindow({origin:'https://ai-made.games'}),s=await requestPlayerSession(config,win);
 assert.deepEqual(win.sent,config.origins);assert.equal(s.apiOrigin,'https://ai-made.games');
});
test('a reply whose apiOrigin differs from its sender is rejected',async()=>{
 await assert.rejects(requestPlayerSession(config,fakeWindow({origin:'https://aiwanna.games',apiOrigin:'https://evil.example'})),/Invalid player session/);
});
test('the board stays offline until it is configured',()=>{
 const b=new Leaderboard({...leaderboardConfig,gameId:'',boards:{[LOOPS_LET_GO]:''}},{fetcher:()=>{throw Error('no network');}});
 assert.equal(b.available(LOOPS_LET_GO),false);assert.equal(b.begin(LOOPS_LET_GO),null);assert.equal(b.url(LOOPS_LET_GO),null);
});
test('a finished puzzle registers a run and submits the total to the answering origin',async()=>{
 const calls=[],fetcher=async(url,init)=>{calls.push([url,init.method,JSON.parse(init.body||'null')]);return {ok:true,json:async()=>url.endsWith('/runs')?{runId:'run-1'}:{accepted:true,rank:2,participants:9}};};
 const b=new Leaderboard(config,{fetcher,sessionProvider:async()=>({token:'t',expiresAt:new Date(Date.now()+3600e3).toISOString(),gameId:'game-1',player:{displayName:'Ana',isGuest:false},apiOrigin:'https://aiwanna.games'})});
 const run=b.begin(LOOPS_LET_GO),receipt=await b.submit(run,41);
 assert.equal(receipt.rank,2);assert.deepEqual(calls.map(c=>c[0]),['https://aiwanna.games/api/v1/leaderboards/board-1/runs','https://aiwanna.games/api/v1/runs/run-1/score']);assert.deepEqual(calls[1][2],{score:41});
 await assert.rejects(b.submit(run,42),/cannot change/);await assert.rejects(b.submit(b.begin(LOOPS_LET_GO),0),/Invalid score/);
});
