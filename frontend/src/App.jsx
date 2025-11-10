import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, RotateCcw, ListChecks, SlidersHorizontal, History } from "lucide-react";
import 'katex/dist/katex.min.css';
import katex from 'katex';

const API_BASE = import.meta?.env?.VITE_API_BASE_URL || "";

const Button = ({ className="", variant="default", children, ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition hover:shadow ${
    variant==="primary"?"bg-[#9EFFA9] text-[#29252C] hover:brightness-95":
    variant==="outline"?"border border-white/15 text-white/90 hover:bg-white/5":
    "bg-[#36485E] text-white hover:brightness-110"} ${className}`} {...props}>{children}</button>
);
const Card = ({className="", children}) => (
  <div className={`rounded-3xl border border-white/10 bg-[#333146]/60 backdrop-blur p-4 shadow-xl ${className}`}>{children}</div>
);
const Input = (props) => <input className="w-full rounded-xl border border-white/10 bg-[#29252C]/60 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#9EFFA9]/50" {...props}/>;
const Select = ({value,onChange,options}) => (
  <select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#29252C]/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#9EFFA9]/50">
    {options.map(o=> <option key={o.value} value={o.value} className="bg-[#29252C]">{o.label}</option>)}
  </select>
);

function renderMath(md){
  return md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_,e)=>katex.renderToString(e,{throwOnError:false,displayMode:true}))
    .replace(/\$([^$]+?)\$/g, (_,e)=>katex.renderToString(e,{throwOnError:false}))
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br/>');
}
function MathText({children}){
  const html = useMemo(()=>renderMath(String(children||"")),[children]);
  return <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{__html:html}}/>;
}

const TOPIC_LABELS = {
  ratio: "Attiecības/proporcijas",
  fractions_md: "Parastās daļas: ×/÷",
  decimals_md: "Decimāldaļas: ×/÷",
  solids: "Telpiskie ķermeņi",
  percent: "Procenti",
  integers: "Veselie skaitļi",
  planning: "Darbību plānošana",
};

function classifyTopic(text){
  const t = text.toLowerCase();
  if(/%|procent|atlaide|nodokl|uzcenoj/.test(t)) return 'percent';
  if(/attiec|proporc|cik reizi|dalīt attiecīb|ratio/.test(t)) return 'ratio';
  if(/(\d+\/\d+|daļ).*(reiz|dal)/.test(t)) return 'fractions_md';
  if(/decim|komat.*(reiz|dal)|10\^/.test(t)) return 'decimals_md';
  if(/tilpum|virsmas|cm\^?3|dm3|litr|cilindr|prizma|paralelskald/.test(t)) return 'solids';
  if(/negat|mazāk par 0|modul|koordin|ox|oy/.test(t)) return 'integers';
  if(/secība|iekav|vienkārš|izteiksm/.test(t)) return 'planning';
  return null;
}

async function callLLM({messages, topicHint}){
  const r = await fetch(`${API_BASE}/api/llm`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({messages, topicHint, model:'auto'})});
  if(!r.ok) throw new Error(`LLM ${r.status}`);
  const data = await r.json();
  return data.reply || data.text || '';
}

const mascotStates = {
  idle:{txt:"Sveiks! Esmu MATHIO. Raksti uzdevumu vai palūdz skaidrojumu.",emo:"🙂"},
  explaining:{txt:"Skaidroju tēmu…",emo:"📘"},
  thinking:{txt:"Domāju…",emo:"🤔"},
  hint:{txt:"Norāde!",emo:"💡"},
  correct:{txt:"Lieliski!",emo:"🎉"},
  wrong:{txt:"Mēģināsim citādi…",emo:"🧩"}
};
function Mascot({state='idle'}){
  const m = mascotStates[state]||mascotStates.idle;
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}} transition={{type:'spring',stiffness:200,damping:14}} className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-[#29252C]/60 px-4 py-3">
        <div className="text-2xl">{m.emo}</div><div className="text-sm text-white/90">{m.txt}</div>
      </motion.div>
    </div>
  );
}

const EX = {
  percent: [{id:'p1',title:'Atrodi 15% no 240',steps:[
    {prompt:'Formula: $daļa = N\\cdot \\frac{p}{100}$. Kāds ir $p$?', key:'p', validate:v=>Number(v)===15, hint:'p = 15'},
    {prompt:'Ievieto: $240\\cdot \\frac{15}{100} = ?$', key:'ans', validate:v=>Math.abs(Number(v)-36)<1e-9, hint:'240×0.15 = 36'},
  ], final:'Atbilde: 36'}],
};
function Exercise({topic}){
  const ex = (EX[topic]||[null])[0];
  const [i,setI]=useState(0); const [val,setVal]=useState(''); const [log,setLog]=useState([]);
  if(!ex) return <div className="text-white/70">Šai tēmai treniņš vēl nav iestatīts.</div>;
  const s = ex.steps[i];
  function sub(){ const ok = s.validate(val); setLog(l=>[...l,{i:i+1,v:val,ok}]); if(ok){ setVal(''); if(i+1>=ex.steps.length) alert(ex.final); else setI(i+1);} }
  return (
    <Card className="space-y-3">
      <div className="text-white/90 font-semibold">{ex.title}</div>
      <div className="rounded-2xl bg-[#29252C]/60 p-4">
        <div className="text-white/70 text-sm">Solis {i+1} no {ex.steps.length}</div>
        <div className="mt-2 text-white text-lg"><MathText>{s.prompt}</MathText></div>
        <div className="mt-3 flex gap-2"><Input value={val} onChange={e=>setVal(e.target.value)} placeholder="Atbilde"/><Button onClick={sub}><Send size={16}/>Iesniegt</Button></div>
      </div>
      <div className="max-h-40 overflow-auto rounded-2xl bg-[#29252C]/40 p-3 text-xs text-white/70">
        {log.length? log.map((r,k)=>(<div key={k} className="flex gap-2 py-1"><div className="min-w-16 text-white/50">Solis {r.i}:</div><div className={r.ok?"text-[#9EFFA9]":"text-red-300"}>{r.v}</div></div>)) : <div className="text-white/40">Soli tiks reģistrēti šeit…</div>}
      </div>
    </Card>
  );
}

const LS_KEY='mathio_lv_chat'; const LS_TOPIC='mathio_lv_topic';
function Bubble({role,content}){ const me=role==='user'; return (
  <div className={`flex ${me?'justify-end':'justify-start'}`}>
    <div className={(me?'bg-[#36485E]':'bg-[#29252C]/60')+' max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm text-white border border-white/10 shadow'}>
      <MathText>{content}</MathText>
    </div>
  </div>);
}
function Chat({topicExplain,onAutoTopic,setMascotState}){
  const [input,setInput]=useState('');
  const [msgs,setMsgs]=useState(()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]')}catch{return[]}});
  const box=useRef(null);
  useEffect(()=>{localStorage.setItem(LS_KEY,JSON.stringify(msgs)); box.current?.scrollTo(0,box.current.scrollHeight);},[msgs]);
  async function send(){ const t=input.trim(); if(!t) return; setInput(''); const auto=classifyTopic(t); if(auto) onAutoTopic(auto); const u={role:'user',content:t}; setMsgs(m=>[...m,u]); const isExplain=/^(skaidro|izskaidro|teorija|konspekts)/i.test(t); const topicHint=isExplain?topicExplain:auto; try{ setMascotState(isExplain?'explaining':'thinking'); const reply=await callLLM({messages:[...msgs,u], topicHint}); setMsgs(m=>[...m,{role:'bot',content:reply}]); }catch(e){ setMsgs(m=>[...m,{role:'bot',content:`Neizdevās saņemt atbildi: ${e.message}`}]); } finally{ setMascotState('idle'); } }
  function clear(){ setMsgs([]); localStorage.setItem(LS_KEY,'[]'); }
  return (
    <Card className="flex h-[64vh] flex-col">
      <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-white/90 font-semibold"><History size={16}/>Čats</div><Button variant="outline" onClick={clear}><RotateCcw size={16}/>Notīrīt</Button></div>
      <div ref={box} className="custom-scroll flex-1 space-y-3 overflow-auto rounded-2xl bg-[#29252C]/40 p-3">
        {msgs.length? msgs.map((m,i)=>(<Bubble key={i} role={m.role} content={m.content}/>)) : (<div className="text-white/60 text-sm">Raksti uzdevumu (MATHIO automātiski noteiks tēmu) vai sāc ar “Skaidro …” — tad izmantos izvēlēto tēmu.</div>)}
      </div>
      <div className="mt-3 flex gap-2"><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Jautājums vai uzdevums…"/><Button onClick={send}><Send size={16}/>Sūtīt</Button></div>
    </Card>
  );
}

export default function App(){
  const [mascot,setMascot]=useState('idle');
  const [explainTopic,setExplainTopic]=useState(()=>localStorage.getItem(LS_TOPIC)||'percent');
  const [autoTopic,setAutoTopic]=useState(null);
  useEffect(()=>localStorage.setItem(LS_TOPIC,explainTopic),[explainTopic]);
  const options = useMemo(()=>Object.entries(TOPIC_LABELS).map(([value,label])=>({value,label})),[]);
  return (
    <div className="min-h-screen bg-[#202025] text-white">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex items-center justify-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9EFFA9] text-[#29252C] font-black">M</div><div><div className="text-xl font-bold">MATHIO</div><div className="text-xs text-white/60">6. klases matemātikas čat‑skolotājs</div></div></div>
        <div className="mt-4"><Mascot state={mascot}/></div>
      </header>
      <main className="mx-auto mt-6 max-w-6xl grid grid-cols-1 gap-4 px-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4"><Chat topicExplain={explainTopic} onAutoTopic={setAutoTopic} setMascotState={setMascot}/>{autoTopic&&(<Card><div className="text-sm text-white/70">Automātiski noteiktā tēma:</div><div className="text-white font-semibold">{TOPIC_LABELS[autoTopic]||'—'}</div></Card>)}</div>
        <div className="space-y-4">
          <Card className="space-y-3"><div className="text-white/90 font-semibold flex items-center gap-2"><SlidersHorizontal size={16}/>Iestatījumi (tikai skaidrošanai)</div><div><div className="mb-1 text-xs text-white/60">Tēma</div><Select value={explainTopic} onChange={setExplainTopic} options={options}/><div className="mt-2 text-xs text-white/50">Ja ziņa sākas ar “Skaidro…”, izmantos šo tēmu.</div></div></Card>
          <Card><div className="text-white/90 font-semibold flex items-center gap-2"><ListChecks size={16}/>Soli pa solim</div><Exercise topic={autoTopic||'percent'}/></Card>
        </div>
      </main>
      <footer className="mx-auto mt-8 max-w-6xl px-4 pb-10"><div className="rounded-3xl border border-white/10 bg-[#29252C]/60 p-4 text-xs text-white/50">Mas­kotu pārslēdz ar setMascot('explaining'|'thinking'|'hint'|'correct'|'wrong'|'idle').</div></footer>
      <style>{`.custom-scroll{scrollbar-width:thin;scrollbar-color:#9EFFA9 #29252C}.custom-scroll::-webkit-scrollbar{height:8px;width:8px}.custom-scroll::-webkit-scrollbar-thumb{background:#9EFFA9;border-radius:9999px}.custom-scroll::-webkit-scrollbar-track{background:#29252C}`}</style>
    </div>
  );
}
