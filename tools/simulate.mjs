// Kør: node tools/simulate.mjs — simulerer alle svarkombinationer (8.160) med og uden salgsbonus og viser førstevalg, top 3 og afvigelser fra interesseområdet.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const s=html.indexOf('/* ANBEFALING:START'), e=html.indexOf('/* ANBEFALING:SLUT');
function load(boost){
  const answers={};
  let src=html.slice(s,e).replace('const BOOST_MAX = 2.4;','const BOOST_MAX = '+boost+';');
  const api=new Function('answers',src+'; return {educations,WEIGHTS,BRANCHES,FIELDS,FIELD_OF,SECOND_FIELD,getMatches,rankAll,WEIGHTS};')(answers);
  api.answers=answers; return api;
}
function combos(api){const out=[];for(const f of Object.keys(api.WEIGHTS[1]))for(const q2 of api.BRANCHES[f])for(const q3 of Object.keys(api.WEIGHTS[3]))for(const q4 of Object.keys(api.WEIGHTS[4]))for(const q5 of Object.keys(api.WEIGHTS[5]))for(const q6 of Object.keys(api.WEIGHTS[6]))out.push({1:f,2:q2,3:q3,4:q4,5:q5,6:q6});return out;}
function run(boost){
  const api=load(boost); const cs=combos(api); const r={n:cs.length,first:{},top3:{},outside:0,close:0,res:[],counts:{1:0,2:0,3:0},perField:{}};
  for(const a of cs){
    for(const k in api.answers) delete api.answers[k]; Object.assign(api.answers,a);
    const m=api.getMatches(a); const {score,ranked}=api.rankAll(a);
    const keys=m.map(x=>x.key); const f=keys[0];
    r.first[f]=(r.first[f]||0)+1; keys.forEach(k=>r.top3[k]=(r.top3[k]||0)+1); r.counts[m.length]++;
    const pf=(r.perField[a[1]]??={n:0,in:0}); pf.n++; if(api.FIELDS[a[1]].includes(f)) pf.in++;
    if(!api.FIELDS[a[1]].includes(f)) {r.outside++; r.res.push({a,f,keys});}
    if(score[ranked[0]]-score[ranked[1]]<0.5) r.close++;
    a._first=f; a._keys=keys.join(',');
  }
  r.cs=cs; return r;
}
const A=run(2.4), B=run(0);
console.log('combos',A.n);
const pct=(x,n)=>(100*x/n).toFixed(1)+'%';
console.log('outside field (mit bonus / uden):',pct(A.outside,A.n),pct(B.outside,B.n));
console.log('close <0.5pt:',pct(A.close,A.n),pct(B.close,B.n));
console.log('counts 1/2/3 matches',JSON.stringify(A.counts),JSON.stringify(B.counts));
let changedFirst=0,changedTop3=0,changedSet=0;
A.cs.forEach((a,i)=>{const b=B.cs[i]; if(a._first!==b._first)changedFirst++; if(a._keys!==b._keys)changedTop3++; if([...a._keys.split(',')].sort().join()!==[...b._keys.split(',')].sort().join())changedSet++;});
console.log('førstevalg ændres',changedFirst,pct(changedFirst,A.n),'| rækkefølge/top3 ændres',changedTop3,pct(changedTop3,A.n),'| sæt ændres',changedSet,pct(changedSet,A.n));
const keys=Object.keys(load(0).educations);
console.log('\nuddannelse        førstevalg med→uden   top3 med→uden');
keys.forEach(k=>console.log(k.padEnd(20),String(A.first[k]||0).padStart(5),'→',String(B.first[k]||0).padStart(5),'  ',String(A.top3[k]||0).padStart(5),'→',String(B.top3[k]||0).padStart(5)));
console.log('\nper felt in-field mit/uden');
for(const f in A.perField)console.log(f,pct(A.perField[f].in,A.perField[f].n),pct(B.perField[f].in,B.perField[f].n));
// kategoriser outside (med bonus)
const api=load(2.4);
const w=(q,a,k)=>((api.WEIGHTS[q][a[q]]||{})[k])||0;
const cat={A:[],B:[],C:[]};
A.res.forEach(x=>{const {a,f}=x; const t2=w(2,a,f), t6=w(6,a,f), sec=api.SECOND_FIELD[a[2]]===api.FIELD_OF[f];
  if(t2>=1.0&&t6>=1.5) cat.A.push(x); else if(t2>=1.0||t6>=1.5||sec) cat.B.push(x); else cat.C.push(x);});
console.log('\noutside total',A.outside,'A(emne+opgave)',cat.A.length,'B',cat.B.length,'C',cat.C.length);
for(const c of 'ABC'){const ex={};cat[c].forEach(x=>{const key=x.a[1]+'→'+x.f;ex[key]=(ex[key]||0)+1;});console.log(c,JSON.stringify(ex));if(cat[c][0])console.log('  eks',JSON.stringify(cat[c][0].a),'→',cat[c][0].keys.join());}
// fordeling (uniform over felter) for uniform-first-choice
console.log('\nmatchantal pr. uddannelse som førstevalg, uniform over Q1 (%):');
const pfN={};A.cs.forEach(a=>pfN[a[1]]=(pfN[a[1]]||0)+1);
for(const R of [['med',A],['uden',B]]){const u={};R[1].cs.forEach(a=>u[a._first]=(u[a._first]||0)+1/pfN[a[1]]/6);console.log(R[0],keys.map(k=>k+':'+(100*(u[k]||0)).toFixed(1)).join(' '));}
