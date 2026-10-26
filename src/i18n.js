import en from './i18n/en.json' with {type:'json'};
import zh from './i18n/zh.json' with {type:'json'};
import ja from './i18n/ja.json' with {type:'json'};
import ko from './i18n/ko.json' with {type:'json'};
import es from './i18n/es.json' with {type:'json'};
// English is the original; every other file carries the same keys. ?lang= wins over the browser language.
export const DICTIONARIES={en,zh,ja,ko,es};
function match(code){const base=String(code||'').toLowerCase().split(/[-_]/)[0];return base in DICTIONARIES?base:null;}
export function pickLanguage(search='',languages=[]){
 let asked=null;try{asked=new URLSearchParams(search).get('lang');}catch{}
 return match(asked)||languages.map(match).find(Boolean)||'en';
}
export function translator(lang){
 const dict=DICTIONARIES[lang]||en;
 return (key,params={})=>(dict[key]??en[key]??key).replace(/\{(\w+)\}/g,(m,name)=>name in params?String(params[name]):m);
}
