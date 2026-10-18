// ============================================================
//  script.js – Quién es quién neuronal: interfaz (los motores están en core.js)
//  Todos los textos salen de i18n (_t). Los mensajes de estado se guardan como funciones para
//  poder traducirse al cambiar de idioma sin perder el estado de la actividad.
// ============================================================
(function(){
'use strict';
const Q=window.QQ;
const {CHARS,BCHARS,sig,argmax,makeNet,forward,trainEpoch,neuronStep,bFace,bScores,bWinners,bNew,bRecognized,bTeach,faceSVG,clamp}=Q;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const EN=()=>PIAR_I18N.lang==='en';
const fmt=(x,d=1)=>{const s=x.toFixed(d).replace('-','−');return EN()?s:s.replace('.',',');};
const pct=p=>Math.round(p*100)+(EN()?'%':' %');
const FN=i=>_t('qq.f.'+i), BFN=j=>_t('qq.bf.'+j);
const lc=s=>s.toLowerCase();
const AND=()=>' '+_t('qq.and')+' ';
const msgOf=f=>typeof f==='function'?f():(f||'');

/* ---------- Niveles y pestañas ---------- */
const LV={basic:['juego','detector','aprende','guia'],adv:['tablero','neurona','red','guia']};
const PANEL={juego:'tablero',tablero:'tablero',detector:'detector',aprende:'aprende',neurona:'neurona',red:'red',guia:'guia'};
const ALLTABS=['juego','detector','aprende','tablero','neurona','red','guia'];
const PANELS=['tablero','detector','aprende','neurona','red','guia'];
let LEVEL='basic';
function show(name){
  stopRuns();
  ALLTABS.forEach(t=>{
    const b=$('#t-'+t),sel=t===name;
    b.setAttribute('aria-selected',String(sel));b.tabIndex=sel?0:-1;
  });
  PANELS.forEach(p=>{$('#p-'+p).hidden=PANEL[name]!==p;});
  $('#p-'+PANEL[name]).setAttribute('aria-labelledby','t-'+name);
  try{history.replaceState(null,'','#'+name);}catch(e){}
}
function setLevel(l,tab){
  LEVEL=l;stopRuns();
  $$('[data-lv]').forEach(e=>{e.hidden=e.dataset.lv!==l;});
  $$('.lvbtn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));
  gSetData();
  show(tab||LV[l][0]);
}
function stopRuns(){
  if(N.run){N.run=false;nBtn();}
  if(R.run){R.run=false;rBtn();}
  if(A.run){A.run=false;clearTimeout(A.t);aBtn();}
}
$('.tabs').addEventListener('click',e=>{
  const b=e.target.closest('button[role=tab]');if(b)show(b.id.slice(2));
});
$('.tabs').addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  const tabs=LV[LEVEL];
  const cur=tabs.findIndex(t=>$('#t-'+t).getAttribute('aria-selected')==='true');
  const nx=(cur+(e.key==='ArrowRight'?1:tabs.length-1)+tabs.length)%tabs.length;
  show(tabs[nx]);$('#t-'+tabs[nx]).focus();
});
$('.lvsw').addEventListener('click',e=>{
  const b=e.target.closest('.lvbtn');
  if(b&&b.dataset.l!==LEVEL)setLevel(b.dataset.l);
});

/* ---------- 1. Tablero / Juego ---------- */
const GDATA={
  basic:{chars:BCHARS,q:i=>_t('qq.bq.'+i),nq:4,face:bFace},
  adv:{chars:CHARS,q:i=>_t('qq.q.'+i),nq:6,face:v=>v}
};
let GD=GDATA.basic;
const G={secret:0,asked:{},wrong:new Set(),done:false,guesses:0,help:false,msg:null};
function gRemain(){
  const out=[];
  for(let i=0;i<GD.chars.length;i++){
    if(G.wrong.has(i))continue;
    let ok=true;
    for(const f in G.asked){if(GD.chars[i].v[+f]!==G.asked[f]){ok=false;break;}}
    if(ok)out.push(i);
  }
  return out;
}
function gBest(rem){
  let best=-1,bd=1e9;
  for(let f=0;f<GD.nq;f++){
    if(f in G.asked)continue;
    const y=rem.filter(i=>GD.chars[i].v[f]===1).length,n=rem.length-y;
    if(y===0||n===0)continue;
    const d=Math.abs(y-n);
    if(d<bd){bd=d;best=f;}
  }
  return best;
}
function gSetData(){GD=GDATA[LEVEL];$('#g-board').classList.toggle('six',GD.chars.length===6);gNew();}
function gNew(){
  G.secret=Math.floor(Math.random()*GD.chars.length);
  G.asked={};G.wrong=new Set();G.done=false;G.guesses=0;
  G.msg=()=>_t('qq.g.msg0');
  gRender();
}
function gRender(){
  const ae=document.activeElement;
  const fk=ae&&ae.dataset?ae.dataset.key:null;
  const rem=gRemain(),remSet=new Set(rem),best=gBest(rem);
  $('#g-board').setAttribute('aria-label',_t('qq.g.board',{n:GD.chars.length}));
  $('#g-board').innerHTML=GD.chars.map((c,i)=>{
    const down=G.done?i!==G.secret:!remSet.has(i);
    const sec=G.done&&i===G.secret;
    return '<button class="cc'+(down?' down':'')+(sec?' secret':'')+'" data-key="c'+i+'" data-c="'+i+'"'+(down||G.done?' disabled':'')+
      ' aria-label="'+c.name+(down?' ('+_t('qq.g.discarded')+')':'')+'"><span class="fw">'+faceSVG(GD.face(c.v),c.name)+'</span><span class="nm">'+c.name+'</span></button>';
  }).join('');
  $('#g-qs').innerHTML=Array.from({length:GD.nq},(_,f)=>{
    const asked=f in G.asked;
    const y=rem.filter(i=>GD.chars[i].v[f]===1).length,n=rem.length-y;
    const isBest=G.help&&best===f&&!asked;
    let h='<button class="q'+(asked?' asked':'')+(isBest?' best':'')+'" data-key="q'+f+'" data-f="'+f+'"'+(asked||G.done?' disabled':'')+'>';
    h+='<span class="qt">'+GD.q(f)+'</span>';
    h+=asked?'<span class="ans '+(G.asked[f]?'yes':'no')+'">'+_t(G.asked[f]?'qq.yes':'qq.no')+'</span>':(isBest?'<span class="tag">'+_t('qq.g.best')+'</span>':'<span></span>');
    if(!asked)h+='<span class="bar"><i style="width:'+(rem.length?y/rem.length*100:0)+'%"></i></span><span class="sp">'+_t('qq.g.sp',{y:y,n:n})+'</span>';
    return h+'</button>';
  }).join('');
  $('#g-left').textContent=G.done?1:rem.length;
  $('#g-nq').textContent=Object.keys(G.asked).length;
  $('#g-msg').textContent=msgOf(G.msg);
  if(fk){const el=$('[data-key="'+fk+'"]');if(el&&!el.disabled)el.focus();}
}
$('#g-qs').addEventListener('click',e=>{
  const b=e.target.closest('.q');if(!b||b.disabled||G.done)return;
  const f=+b.dataset.f,ans=GD.chars[G.secret].v[f];
  G.asked[f]=ans;
  const left=gRemain().length;
  G.msg=()=>_t(left===1?'qq.g.res.one':'qq.g.res.other',{q:GD.q(f),a:_t(ans?'qq.yes':'qq.no'),n:left});
  gRender();
});
$('#g-board').addEventListener('click',e=>{
  const b=e.target.closest('.cc');if(!b||b.disabled||G.done)return;
  const i=+b.dataset.c;
  G.guesses++;
  if(i===G.secret){
    G.done=true;
    const nq=Object.keys(G.asked).length,gs=G.guesses;
    G.msg=()=>_t('qq.g.found',{name:GD.chars[i].name,q:_t(nq===1?'qq.nq.one':'qq.nq.other',{n:nq}),g:_t(gs===1?'qq.ng.one':'qq.ng.other',{n:gs})});
  }else{
    G.wrong.add(i);
    G.msg=()=>_t('qq.g.nope',{name:GD.chars[i].name});
  }
  gRender();
});
$('#g-help').addEventListener('change',e=>{G.help=e.target.checked;gRender();});
$('#g-new').addEventListener('click',gNew);

/* ---------- 2. Neurona (avanzado) ---------- */
const N={t:0,w:[0,0,0,0,0,0],b:0,sel:0,run:false,steps:0,rows:[]};
function nBuild(){
  $('#n-target').innerHTML=CHARS.map((c,i)=>'<option value="'+i+'">'+c.name+'</option>').join('');
  let h='<div class="cr hd"><span>'+_t('qq.n.col.f')+'</span><span class="c">'+_t('qq.n.col.has')+'</span><span>'+_t('qq.n.col.w')+'</span><span></span><span class="r">'+_t('qq.n.col.c')+'</span></div>';
  for(let i=0;i<6;i++){
    h+='<div class="cr"><label class="fn" for="n-w-'+i+'">'+FN(i)+'</label><span class="x" id="n-x-'+i+'">0</span>'+
      '<input type="range" id="n-w-'+i+'" min="-6" max="6" step="0.1" value="0"><output id="n-wv-'+i+'" for="n-w-'+i+'">0,0</output>'+
      '<span class="num" id="n-c-'+i+'">0,0</span></div>';
  }
  h+='<div class="cr"><label class="fn" for="n-b">'+_t('qq.n.bias')+'</label><span class="x">1</span>'+
    '<input type="range" id="n-b" min="-15" max="15" step="0.5" value="0"><output id="n-bv" for="n-b">0,0</output>'+
    '<span class="num" id="n-cb">0,0</span></div>';
  $('#n-calc').innerHTML=h;
  $('#n-list').innerHTML=CHARS.map((c,k)=>
    '<button class="rk" data-c="'+k+'" aria-pressed="false"><span class="th">'+faceSVG(c.v,c.name)+'</span><span class="rn">'+c.name+'<span class="tl" hidden> '+_t('qq.tgtl')+'</span>'+
    '</span><span class="rbar"><i></i></span><span class="rp">50 %</span><span class="rm"></span></button>').join('');
  N.rows=$$('.rk',$('#n-list')).map(el=>({el:el,bar:$('.rbar i',el),p:$('.rp',el),m:$('.rm',el),tl:$('.tl',el)}));
  $('#n-target').value=N.t;
}
function nOut(c){
  const v=CHARS[c].v;let z=N.b;
  for(let i=0;i<6;i++)z+=N.w[i]*v[i];
  return {z:z,p:sig(z)};
}
function signCls(x){return x>0.05?'pos':x<-0.05?'neg':'';}
function nUpdate(){
  const v=CHARS[N.sel].v;let z=N.b;
  for(let i=0;i<6;i++){
    const w=N.w[i],c=w*v[i];z+=c;
    $('#n-w-'+i).value=w;
    const wv=$('#n-wv-'+i);wv.textContent=fmt(w);wv.className=signCls(w);
    const xe=$('#n-x-'+i);xe.textContent=v[i];xe.className='x'+(v[i]?' on':'');
    const ce=$('#n-c-'+i);ce.textContent=fmt(c);ce.className='num '+signCls(c);
  }
  $('#n-b').value=N.b;
  const bv=$('#n-bv');bv.textContent=fmt(N.b);bv.className=signCls(N.b);
  const cb=$('#n-cb');cb.textContent=fmt(N.b);cb.className='num '+signCls(N.b);
  const p=sig(z);
  $('#n-z').textContent=fmt(z);
  $('#n-p').textContent=pct(p);
  $('#n-m').style.width=(p*100)+'%';
  $('#n-face').innerHTML=faceSVG(v,CHARS[N.sel].name);
  $('#n-who').textContent=CHARS[N.sel].name;
  const has=[0,1,2,3,4,5].filter(i=>CHARS[N.t].v[i]).map(i=>lc(FN(i)));
  $('#n-has').textContent=' · '+_t('qq.n.goal',{name:CHARS[N.t].name,has:has.length?has.join(', '):_t('qq.n.nofeat')});
  let ok=0;
  CHARS.forEach((c,k)=>{
    const o=nOut(k),good=(o.p>0.5)===(k===N.t);
    if(good)ok++;
    const r=N.rows[k];
    r.bar.style.width=(o.p*100)+'%';
    r.p.textContent=pct(o.p);
    r.m.textContent=good?'✓':'✕';
    r.m.className='rm '+(good?'good':'bad');
    r.el.classList.toggle('tgt',k===N.t);r.tl.hidden=k!==N.t;
    r.el.setAttribute('aria-pressed',String(k===N.sel));
  });
  $('#n-score').textContent=ok===12?_t('qq.n.perfect',{name:CHARS[N.t].name}):_t('qq.n.count',{n:ok});
}
function nDone(){
  for(let k=0;k<12;k++){
    const p=nOut(k).p;
    if(k===N.t?p<0.9:p>0.1)return false;
  }
  return true;
}
function nBtn(){$('#n-learn').textContent=_t(N.run?'qq.n.stop':'qq.n.learn');}
function nLoop(){
  if(!N.run)return;
  for(let k=0;k<6;k++)neuronStep(N,2);
  N.steps+=6;
  nUpdate();
  if(nDone()||N.steps>=1500){N.run=false;nBtn();return;}
  requestAnimationFrame(nLoop);
}
function nZero(){N.w=[0,0,0,0,0,0];N.b=0;N.run=false;nBtn();nUpdate();}
$('#n-calc').addEventListener('input',e=>{
  const id=e.target.id;
  if(id==='n-b')N.b=+e.target.value;
  else if(id.indexOf('n-w-')===0)N.w[+id.slice(4)]=+e.target.value;
  else return;
  N.run=false;nBtn();nUpdate();
});
$('#n-list').addEventListener('click',e=>{
  const b=e.target.closest('.rk');if(!b)return;
  N.sel=+b.dataset.c;nUpdate();
});
$('#n-target').addEventListener('change',e=>{N.t=+e.target.value;N.sel=N.t;nZero();});
$('#n-reset').addEventListener('click',nZero);
$('#n-learn').addEventListener('click',()=>{
  if(N.run){N.run=false;nBtn();return;}
  N.run=true;N.steps=0;nBtn();requestAnimationFrame(nLoop);
});

/* ---------- 3. Red (avanzado) ---------- */
const R={H:5,net:null,inc:new Set(CHARS.map((_,i)=>i)),epoch:0,losses:[],run:false,x:CHARS[0].v.slice(),
  e1:[],e2:[],ni:[],nh:[],no:[],nt:[],msg:null};
function yIn(i){return 65+i*66;}
function yHid(j){return 230+(j-(R.H-1)/2)*Math.min(66,330/R.H);}
function yOut(k){return 40+k*(380/11);}
function rBuild(){
  const H=R.H;let s='';
  s+='<text class="colh" x="112" y="14" text-anchor="middle">'+_t('qq.r.col.in')+'</text><text class="colh" x="330" y="14" text-anchor="middle">'+_t('qq.r.col.hid')+'</text><text class="colh" x="532" y="14">'+_t('qq.r.col.out')+'</text>';
  for(let j=0;j<H;j++)for(let i=0;i<6;i++)s+='<line id="e1_'+j+'_'+i+'" x1="112" y1="'+yIn(i)+'" x2="330" y2="'+yHid(j).toFixed(1)+'"/>';
  for(let k=0;k<12;k++)for(let j=0;j<H;j++)s+='<line id="e2_'+k+'_'+j+'" x1="330" y1="'+yHid(j).toFixed(1)+'" x2="540" y2="'+yOut(k).toFixed(1)+'"/>';
  for(let i=0;i<6;i++)s+='<g class="inode" data-i="'+i+'" tabindex="0" role="button" aria-label="'+_t('qq.r.node',{f:FN(i)})+'"><circle id="ni'+i+'" cx="112" cy="'+yIn(i)+'" r="11"/><text x="96" y="'+(yIn(i)+4)+'" text-anchor="end">'+FN(i)+'</text></g>';
  for(let j=0;j<H;j++)s+='<circle id="nh'+j+'" cx="330" cy="'+yHid(j).toFixed(1)+'" r="13"/>';
  for(let k=0;k<12;k++)s+='<circle id="no'+k+'" cx="540" cy="'+yOut(k).toFixed(1)+'" r="9"/><text id="nt'+k+'" x="558" y="'+(yOut(k)+4).toFixed(1)+'">'+CHARS[k].name+'</text>';
  const svg=$('#r-svg');
  svg.setAttribute('viewBox','0 0 640 440');
  svg.innerHTML=s;
  R.e1=Array.from({length:H},(_,j)=>Array.from({length:6},(_,i)=>$('#e1_'+j+'_'+i,svg)));
  R.e2=Array.from({length:12},(_,k)=>Array.from({length:H},(_,j)=>$('#e2_'+k+'_'+j,svg)));
  R.ni=Array.from({length:6},(_,i)=>$('#ni'+i,svg));
  R.nh=Array.from({length:H},(_,j)=>$('#nh'+j,svg));
  R.no=Array.from({length:12},(_,k)=>$('#no'+k,svg));
  R.nt=Array.from({length:12},(_,k)=>$('#nt'+k,svg));
  $('#r-hn').textContent=H;
}
function setEdge(el,w,op){
  el.style.stroke=w>=0?'var(--pos)':'var(--neg)';
  el.style.strokeWidth=(0.3+Math.min(1,Math.abs(w)/3)*2.9).toFixed(2);
  el.style.opacity=op.toFixed(2);
}
function rSvg(fw){
  const n=R.net,H=R.H,th=n.th,h=fw.h,p=fw.p,top=argmax(p);
  for(let j=0;j<H;j++)for(let i=0;i<6;i++)setEdge(R.e1[j][i],th[j*6+i],R.x[i]?0.9:0.1);
  for(let k=0;k<12;k++)for(let j=0;j<H;j++)setEdge(R.e2[k][j],th[n.oW2+k*H+j],Math.max(0.06,Math.abs(h[j]))*0.9);
  for(let i=0;i<6;i++)R.ni[i].style.fill=R.x[i]?'var(--ink)':'var(--surface)';
  for(let j=0;j<H;j++){R.nh[j].style.fill=h[j]>=0?'var(--pos)':'var(--neg)';R.nh[j].style.fillOpacity=Math.abs(h[j]).toFixed(2);}
  for(let k=0;k<12;k++){
    R.no[k].setAttribute('r',(5+8*p[k]).toFixed(1));
    R.no[k].style.fill='var(--pos)';
    R.no[k].style.fillOpacity=(0.15+0.85*p[k]).toFixed(2);
    R.nt[k].style.fontWeight=k===top?'700':'400';
  }
}
function rRecognized(){return CHARS.map((c,i)=>argmax(forward(R.net,c.v).p)===i);}
function rSide(fw){
  $('#r-face').innerHTML=faceSVG(R.x,_t('qq.test.h'));
  $$('.tg',$('#r-tgs')).forEach((b,i)=>b.setAttribute('aria-pressed',String(!!R.x[i])));
  const order=Array.from({length:12},(_,k)=>k).sort((a,b)=>fw.p[b]-fw.p[a]);
  const top=order[0];
  const match=CHARS.findIndex(c=>c.v.every((v,i)=>v===R.x[i]));
  $('#r-pred').textContent=(match>=0?_t('qq.pred.is',{name:CHARS[match].name}):_t('qq.pred.none'))+' '+_t('qq.r.says',{name:CHARS[top].name,p:pct(fw.p[top])});
  $('#r-rank').innerHTML=order.slice(0,5).map(k=>
    '<div class="rk" style="cursor:default"><span class="th">'+faceSVG(CHARS[k].v,CHARS[k].name)+'</span><span class="rn">'+CHARS[k].name+
    '</span><span class="rbar"><i style="width:'+(fw.p[k]*100).toFixed(1)+'%"></i></span><span class="rp">'+pct(fw.p[k])+'</span><span></span></div>').join('');
}
function rStrip(){
  const ok=rRecognized();
  CHARS.forEach((c,i)=>{
    const tc=$('#tc'+i),st=$('#tst'+i);
    tc.classList.toggle('off',!R.inc.has(i));
    $('input',tc).checked=R.inc.has(i);
    if(R.epoch===0){st.textContent='';st.className='tst';}
    else{st.textContent=ok[i]?'✓':'✕';st.className='tst '+(ok[i]?'good':'bad');st.setAttribute('aria-label',_t(ok[i]?'qq.recog':'qq.notrecog'));}
  });
  return ok.filter(Boolean).length;
}
function rChart(){
  const L=R.losses,xm=Math.max(200,L.length),step=Math.max(1,Math.ceil(L.length/300)),pts=[];
  for(let i=0;i<L.length;i+=step)pts.push((34+i/xm*278).toFixed(1)+','+(100-clamp(L[i],0,2.6)/2.6*90).toFixed(1));
  if(L.length>1&&(L.length-1)%step!==0)pts.push((34+(L.length-1)/xm*278).toFixed(1)+','+(100-clamp(L[L.length-1],0,2.6)/2.6*90).toFixed(1));
  $('#r-line').setAttribute('points',pts.join(' '));
  $('#r-xl').textContent=_t('qq.r.chart.ep',{n:xm});
  $('#r-yl').textContent=_t('qq.r.loss');
}
function rRender(){
  const fw=forward(R.net,R.x);
  rSvg(fw);rSide(fw);
  const n=rStrip();
  $('#r-ep').textContent=R.epoch;
  $('#r-loss').textContent=R.losses.length?fmt(R.losses[R.losses.length-1],2):'—';
  $('#r-ok').textContent=n;
  rChart();
  $('#r-msg').textContent=msgOf(R.msg);
}
function rBtn(){$('#r-train').textContent=_t(R.run?'qq.r.pause':'qq.r.train');}
function rMsg(f){R.msg=f;$('#r-msg').textContent=msgOf(f);}
function rSteps(n){
  const idx=Array.from(R.inc);
  for(let k=0;k<n;k++){R.losses.push(trainEpoch(R.net,idx,0.05));R.epoch++;}
}
function rLoop(){
  if(!R.run)return;
  rSteps(R.epoch<300?1:5);rRender();
  const last=R.losses[R.losses.length-1];
  if(last<0.02||R.epoch>=2500){
    R.run=false;rBtn();
    const ep=R.epoch;
    rMsg(()=>_t('qq.r.done',{ep:ep,loss:fmt(last,2)}));
    return;
  }
  rMsg(()=>_t('qq.r.training'));
  requestAnimationFrame(rLoop);
}
function rReset(f){
  R.run=false;rBtn();
  R.net=makeNet(R.H);R.epoch=0;R.losses=[];
  rMsg(f||(()=>_t('qq.r.msg0')));
  rRender();
}
function rCanTrain(){
  if(R.inc.size<2){rMsg(()=>_t('qq.min2'));return false;}
  return true;
}
function rBuildStatic(){
  $('#r-tgs').innerHTML=Array.from({length:6},(_,i)=>'<button class="tg" data-i="'+i+'" aria-pressed="false">'+FN(i)+'</button>').join('');
  $('#r-strip').innerHTML=CHARS.map((c,i)=>
    '<label class="tc" id="tc'+i+'"><span class="th">'+faceSVG(c.v,c.name)+'</span><span class="tn"><input type="checkbox" data-c="'+i+'" checked> '+c.name+
    '</span><span class="tst" id="tst'+i+'"></span></label>').join('');
}
$('#r-train').addEventListener('click',()=>{
  if(R.run){R.run=false;rBtn();rMsg(()=>_t('qq.r.paused'));return;}
  if(!rCanTrain())return;
  R.run=true;rBtn();requestAnimationFrame(rLoop);
});
$('#r-step').addEventListener('click',()=>{
  R.run=false;rBtn();
  if(!rCanTrain())return;
  rSteps(1);rRender();const ep=R.epoch;rMsg(()=>_t('qq.r.epoch',{n:ep}));
});
$('#r-reset').addEventListener('click',()=>rReset());
function rHidden(d){
  const H=clamp(R.H+d,2,8);
  if(H===R.H)return;
  R.H=H;rBuild();rReset(()=>_t('qq.r.new',{h:H}));
}
$('#r-hm').addEventListener('click',()=>rHidden(-1));
$('#r-hp').addEventListener('click',()=>rHidden(1));
$('#r-tgs').addEventListener('click',e=>{
  const b=e.target.closest('.tg');if(!b)return;
  const i=+b.dataset.i;R.x[i]=R.x[i]?0:1;rRender();
});
$('#r-svg').addEventListener('click',e=>{
  const g=e.target.closest('.inode');if(!g)return;
  const i=+g.dataset.i;R.x[i]=R.x[i]?0:1;rRender();
});
$('#r-svg').addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const g=e.target.closest('.inode');if(!g)return;
  e.preventDefault();
  const i=+g.dataset.i;R.x[i]=R.x[i]?0:1;rRender();
});
$('#r-strip').addEventListener('change',e=>{
  const c=e.target.dataset?e.target.dataset.c:null;if(c==null)return;
  if(e.target.checked)R.inc.add(+c);else R.inc.delete(+c);
  rReset(()=>_t('qq.r.changed'));
});
$('#r-presets').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const p=b.dataset.p;
  let ids=CHARS.map((_,i)=>i);
  if(p==='gafas')ids=ids.filter(i=>!CHARS[i].v[0]);
  else if(p==='sombrero')ids=ids.filter(i=>!CHARS[i].v[1]);
  else if(p==='azar')ids=ids.sort(()=>Math.random()-0.5).slice(0,6);
  R.inc=new Set(ids);
  rReset(()=>_t('qq.r.changed'));
});

/* ---------- Básico 2. Un detector ---------- */
function sgn(n){return (n>0?'+':n<0?'−':'')+Math.abs(n);}
function sCls(n){return n>0?'pos':n<0?'neg':'';}
function pts(n){return _t(Math.abs(n)===1?'qq.pt.one':'qq.pt.other',{n:sgn(n)});}
const D={t:0,w:[0,0,0,0]};
function dTotals(){return BCHARS.map(c=>c.v.reduce((s,x,j)=>s+x*D.w[j],0));}
function dBuild(){
  $('#d-target').innerHTML=BCHARS.map((c,i)=>'<option value="'+i+'">'+c.name+'</option>').join('');
  $('#d-target').value=D.t;
  $('#d-pts').innerHTML=Array.from({length:4},(_,j)=>
    '<div class="pr"><span class="fn">'+BFN(j)+'</span>'+
    '<button class="pm" data-j="'+j+'" data-d="-1" aria-label="'+_t('qq.d.minus',{f:BFN(j)})+'">−</button>'+
    '<output class="pv" id="d-v'+j+'">0</output>'+
    '<button class="pm" data-j="'+j+'" data-d="1" aria-label="'+_t('qq.d.plus',{f:BFN(j)})+'">+</button></div>').join('');
}
function dUpdate(){
  const tot=dTotals(),mx=Math.max.apply(null,tot);
  for(let j=0;j<4;j++){const o=$('#d-v'+j);o.textContent=sgn(D.w[j]);o.className='pv '+sCls(D.w[j]);}
  $('#d-list').innerHTML=BCHARS.map((c,i)=>{
    const chips=[0,1,2,3].map(j=>c.v[j]?'<span class="chip '+sCls(D.w[j])+'">'+BFN(j)+' '+sgn(D.w[j])+'</span>':'').join('');
    return '<div class="fr'+(i===D.t?' tgt':'')+(tot[i]===mx?' top':'')+'"><span class="th">'+faceSVG(bFace(c.v),c.name)+'</span><span class="rn">'+c.name+
      '</span><span class="chips">'+chips+'</span><span class="tot '+sCls(tot[i])+'">'+sgn(tot[i])+'</span></div>';
  }).join('');
  const others=tot.filter((_,i)=>i!==D.t),bo=Math.max.apply(null,others),name=BCHARS[D.t].name;
  const ok=tot[D.t]>bo;
  const m=$('#d-msg');
  m.className='dmsg'+(ok?' ok':'');
  m.textContent=ok?_t('qq.d.ok',{name:name,pts:pts(tot[D.t])}):_t('qq.d.no',{name:name,pts:pts(tot[D.t]),other:pts(bo)});
}
$('#d-pts').addEventListener('click',e=>{
  const b=e.target.closest('.pm');if(!b)return;
  const j=+b.dataset.j;
  D.w[j]=clamp(D.w[j]+(+b.dataset.d),-6,6);
  dUpdate();
});
$('#d-target').addEventListener('change',e=>{D.t=+e.target.value;D.w=[0,0,0,0];dUpdate();});
$('#d-reset').addEventListener('click',()=>{D.w=[0,0,0,0];dUpdate();});
$('#d-sol').addEventListener('click',()=>{D.w=BCHARS[D.t].v.map(x=>x?1:-1);dUpdate();});

/* ---------- Básico 3. La red aprende ---------- */
const A={W:bNew(),inc:new Set([0,1,2,3,4,5]),x:BCHARS[0].v.slice(),n:0,f:0,run:false,last:-1,changed:new Set(),msg:null,t:null};
function aAllOk(){return Array.from(A.inc).every(c=>bRecognized(A.W,c));}
function aBuildStatic(){
  $('#a-tgs').innerHTML=Array.from({length:4},(_,j)=>'<button class="tg" data-j="'+j+'" aria-pressed="false">'+BFN(j)+'</button>').join('');
  $('#a-strip').innerHTML=BCHARS.map((c,i)=>
    '<label class="tc" id="atc'+i+'"><span class="th">'+faceSVG(bFace(c.v),c.name)+'</span><span class="tn"><input type="checkbox" data-c="'+i+'" checked> '+c.name+
    '</span><span class="tst" id="atst'+i+'"></span></label>').join('');
}
function aRender(){
  const s=bScores(A.W,A.x),w=bWinners(s),mx=Math.max.apply(null,s);
  let h='<thead><tr><th>'+_t('qq.a.col.char')+'</th>'+[0,1,2,3].map(j=>'<th>'+BFN(j)+'</th>').join('')+'<th>'+_t('qq.a.col.pts')+'</th></tr></thead><tbody>';
  BCHARS.forEach((c,i)=>{
    h+='<tr class="'+(w.length===1&&w[0]===i?'win':'')+'"><th scope="row"><span class="rowh"><span class="th">'+faceSVG(bFace(c.v),c.name)+'</span>'+c.name+'</span></th>';
    for(let j=0;j<4;j++){
      const v=A.W[i][j];
      const op=(Math.min(1,Math.abs(v)/4)*0.6).toFixed(2);
      h+='<td class="'+(A.x[j]?'on':'')+(A.changed.has(i+','+j)?' flash':'')+'"><span class="fill" style="background:'+(v>0?'var(--pos)':'var(--neg)')+';opacity:'+op+'"></span><b>'+sgn(v)+'</b></td>';
    }
    h+='<td class="sc"><b class="'+sCls(s[i])+'">'+sgn(s[i])+'</b></td></tr>';
  });
  $('#a-table').innerHTML=h+'</tbody>';
  A.changed=new Set();
  $('#a-face').innerHTML=faceSVG(bFace(A.x),_t('qq.test.h'));
  $$('.tg',$('#a-tgs')).forEach((b,j)=>b.setAttribute('aria-pressed',String(!!A.x[j])));
  const match=BCHARS.findIndex(c=>c.v.every((v,j)=>v===A.x[j]));
  $('#a-pred').textContent=(match>=0?_t('qq.pred.is',{name:BCHARS[match].name}):_t('qq.pred.none2'))+' '+
    (w.length===1?_t('qq.a.says',{name:BCHARS[w[0]].name,pts:pts(mx)}):_t('qq.a.tie',{names:w.map(i=>BCHARS[i].name).join(', '),pts:pts(mx)}));
  $('#a-msg').textContent=msgOf(A.msg);
  $('#a-n').textContent=A.n;
  $('#a-f').textContent=A.f;
  let rec=0;
  BCHARS.forEach((c,i)=>{
    const ok=bRecognized(A.W,i);if(ok)rec++;
    const tc=$('#atc'+i),st=$('#atst'+i);
    tc.classList.toggle('off',!A.inc.has(i));
    $('input',tc).checked=A.inc.has(i);
    if(A.n===0){st.textContent='';st.className='tst';}
    else{st.textContent=ok?'✓':'✕';st.className='tst '+(ok?'good':'bad');st.setAttribute('aria-label',_t(ok?'qq.recog':'qq.notrecog'));}
  });
  $('#a-ok').textContent=rec;
}
function aStep(){
  const inc=Array.from(A.inc);
  let c;
  do{c=inc[Math.floor(Math.random()*inc.length)];}while(inc.length>1&&c===A.last);
  A.last=c;
  A.x=BCHARS[c].v.slice();
  const x=A.x.slice();
  const r=bTeach(A.W,A.x,c);
  A.n++;A.changed=new Set();
  let base;
  if(r.ok){
    base=()=>_t('qq.a.hit',{name:BCHARS[c].name,pts:pts(r.s[c])});
  }else{
    A.f++;
    for(let j=0;j<4;j++)if(x[j]){A.changed.add(c+','+j);A.changed.add(r.wrong+','+j);}
    const win=bWinners(r.s);
    base=()=>{
      const bad=BCHARS[r.wrong].name;
      const feats=[0,1,2,3].filter(j=>x[j]).map(j=>lc(BFN(j))).join(AND());
      const who=r.tie?(win.length>3?_t('qq.a.dudeall'):_t('qq.a.dude',{names:win.map(i=>BCHARS[i].name).join(', ')})):_t('qq.a.says2',{name:bad});
      return _t('qq.a.miss',{name:BCHARS[c].name,who:who,bad:bad,feats:feats});
    };
  }
  const done=aAllOk();
  A.msg=()=>base()+(done?' '+_t('qq.a.all'):'');
  aRender();
  return done;
}
function aBtn(){$('#a-auto').textContent=_t(A.run?'qq.a.stop':'qq.a.auto');}
function aLoop(){
  if(!A.run)return;
  const done=aStep();
  if(done||A.n>=300){
    A.run=false;aBtn();
    if(!done){A.msg=()=>_t('qq.a.stopped');aRender();}
    return;
  }
  A.t=setTimeout(aLoop,450);
}
function aReset(f){
  A.run=false;clearTimeout(A.t);aBtn();
  A.W=bNew();A.n=0;A.f=0;A.last=-1;A.changed=new Set();
  A.msg=f||(()=>_t('qq.a.msg0'));
  aRender();
}
function aCanTrain(){
  if(A.inc.size<2){A.msg=()=>_t('qq.min2');aRender();return false;}
  return true;
}
$('#a-one').addEventListener('click',()=>{
  A.run=false;clearTimeout(A.t);aBtn();
  if(!aCanTrain())return;
  aStep();
});
$('#a-auto').addEventListener('click',()=>{
  if(A.run){A.run=false;clearTimeout(A.t);aBtn();return;}
  if(!aCanTrain())return;
  A.run=true;aBtn();aLoop();
});
$('#a-reset').addEventListener('click',()=>aReset());
$('#a-tgs').addEventListener('click',e=>{
  const b=e.target.closest('.tg');if(!b)return;
  const j=+b.dataset.j;A.x[j]=A.x[j]?0:1;aRender();
});
$('#a-strip').addEventListener('change',e=>{
  const c=e.target.dataset?e.target.dataset.c:null;if(c==null)return;
  if(e.target.checked)A.inc.add(+c);else A.inc.delete(+c);
  aReset(()=>_t('qq.a.changed'));
});
$('#a-presets').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const p=b.dataset.p;
  let ids=BCHARS.map((_,i)=>i);
  if(p==='gafas')ids=ids.filter(i=>!BCHARS[i].v[0]);
  else if(p==='sombrero')ids=ids.filter(i=>!BCHARS[i].v[1]);
  A.inc=new Set(ids);
  aReset(()=>_t('qq.a.changed'));
});

/* ---------- Idioma: se reconstruyen los textos sin perder el estado ---------- */
function relabel(){
  nBuild();nUpdate();nBtn();
  rBuildStatic();rBuild();rBtn();rRender();
  dBuild();dUpdate();
  aBuildStatic();aBtn();aRender();
  gRender();
}
PIAR_I18N.onChange(relabel);
PIAR_I18N.mountSelector($('#langSelectHost'));

/* ---------- Arranque ---------- */
nBuild();nUpdate();
rBuildStatic();R.net=makeNet(R.H);rBuild();rMsg(()=>_t('qq.r.msg0'));rRender();
dBuild();dUpdate();
aBuildStatic();aReset();
let hsh='';
try{hsh=(location.hash||'').slice(1);}catch(e){}
const tabIni=ALLTABS.indexOf(hsh)>=0?hsh:null;
setLevel(['tablero','neurona','red'].indexOf(hsh)>=0?'adv':'basic',tabIni||undefined);
window.addEventListener('hashchange',()=>{
  const h=(location.hash||'').slice(1);
  if(ALLTABS.indexOf(h)<0)return;
  const l=['tablero','neurona','red'].indexOf(h)>=0?'adv':(['juego','detector','aprende'].indexOf(h)>=0?'basic':LEVEL);
  if(l!==LEVEL)setLevel(l,h);else show(h);
});

// Para las pruebas
window.__qq={G,N,R,D,A,setLevel,show,gNew,gRender,rSteps,rRender,aStep,aReset,relabel,get level(){return LEVEL;}};
})();
