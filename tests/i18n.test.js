import test from 'node:test';
import assert from 'node:assert/strict';
import {DICTIONARIES,pickLanguage,translator} from '../src/i18n.js';
const {en}=DICTIONARIES,holes=s=>(s.match(/\{\w+\}/g)||[]).sort().join(),breaks=s=>(s.match(/<br>/g)||[]).length;
test('every language has exactly the English keys, placeholders and line breaks',()=>{
 for(const [lang,dict] of Object.entries(DICTIONARIES)){
  assert.deepEqual(Object.keys(dict).sort(),Object.keys(en).sort(),lang);
  for(const key of Object.keys(en)){assert.equal(holes(dict[key]),holes(en[key]),`${lang} ${key}`);assert.equal(breaks(dict[key]),breaks(en[key]),`${lang} ${key}`);}
 }
});
test('?lang= wins, then the browser language, then English',()=>{
 assert.equal(pickLanguage('?lang=ja',['zh-CN']),'ja');assert.equal(pickLanguage('',['ko-KR','en']),'ko');assert.equal(pickLanguage('?lang=xx',['fr','es-MX']),'es');assert.equal(pickLanguage('',['fr']),'en');assert.equal(pickLanguage('?lang=zh-Hans',[]),'zh');
});
test('placeholders fill in and unknown keys fall back',()=>{
 assert.equal(translator('zh')('win.rank',{rank:2,total:9}),'AIWANNA 第 2 名，共 9 人');assert.equal(translator('xx')('tool.undo'),'Undo');assert.equal(translator('en')('nope'),'nope');
});
