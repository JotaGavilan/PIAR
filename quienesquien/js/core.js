// ============================================================
//  core.js – Quién es quién neuronal: motor sin DOM (se prueba con node)
//  Nivel avanzado: 12 personajes × 6 rasgos · neurona logística · red con N neuronas ocultas (tanh + softmax, Adam)
//  Nivel básico:   6 personajes × 4 rasgos · puntos enteros · corrección tipo perceptrón
//  Los textos (nombres de rasgos y preguntas) están en i18n.js (claves qq.f.*, qq.q.*, qq.bf.*, qq.bq.*).
// ============================================================
(function (root) {
'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
// <NN>
const CHARS=[
  ['Ana',[0,0,0,1,1,1]],['Biel',[1,0,1,0,0,0]],['Carla',[0,1,0,0,1,1]],['Dani',[0,0,1,1,0,1]],
  ['Eva',[1,1,0,0,1,0]],['Fran',[0,1,1,0,0,0]],['Gala',[1,0,0,1,0,1]],['Hugo',[0,0,0,0,0,1]],
  ['Inés',[1,0,0,0,1,0]],['Joan',[0,1,0,1,0,0]],['Lola',[0,0,0,1,1,0]],['Marc',[1,1,1,0,0,1]]
].map(([name,v])=>({name,v}));
const sig=z=>1/(1+Math.exp(-z));
function rnd(){return Math.random()+Math.random()+Math.random()+Math.random()-2;}
function argmax(a){let b=0;for(let i=1;i<a.length;i++)if(a[i]>a[b])b=i;return b;}

function makeNet(H){
  const n=H*6+H+12*H+12;
  const th=new Float64Array(n);
  const net={H:H,th:th,m:new Float64Array(n),v:new Float64Array(n),t:0,oW1:0,ob1:H*6,oW2:H*6+H,ob2:H*6+H+12*H};
  for(let j=0;j<H;j++)for(let i=0;i<6;i++)th[j*6+i]=rnd()*0.9;
  for(let k=0;k<12;k++)for(let j=0;j<H;j++)th[net.oW2+k*H+j]=rnd()*0.5;
  return net;
}
function forward(net,x){
  const H=net.H,th=net.th;
  const h=new Float64Array(H),z=new Float64Array(12),p=new Float64Array(12);
  for(let j=0;j<H;j++){let s=th[net.ob1+j];for(let i=0;i<6;i++)s+=th[j*6+i]*x[i];h[j]=Math.tanh(s);}
  let mx=-1e9;
  for(let k=0;k<12;k++){let s=th[net.ob2+k];for(let j=0;j<H;j++)s+=th[net.oW2+k*H+j]*h[j];z[k]=s;if(s>mx)mx=s;}
  let sum=0;
  for(let k=0;k<12;k++){p[k]=Math.exp(z[k]-mx);sum+=p[k];}
  for(let k=0;k<12;k++)p[k]/=sum;
  return {h:h,p:p};
}
function trainEpoch(net,idx,lr){
  const H=net.H,th=net.th,g=new Float64Array(th.length);
  let loss=0;
  for(const c of idx){
    const x=CHARS[c].v,f=forward(net,x),h=f.h,p=f.p;
    loss-=Math.log(p[c]+1e-12);
    const dh=new Float64Array(H);
    for(let k=0;k<12;k++){
      const dz=p[k]-(k===c?1:0);
      g[net.ob2+k]+=dz;
      for(let j=0;j<H;j++){g[net.oW2+k*H+j]+=dz*h[j];dh[j]+=th[net.oW2+k*H+j]*dz;}
    }
    for(let j=0;j<H;j++){
      const dp=dh[j]*(1-h[j]*h[j]);
      g[net.ob1+j]+=dp;
      for(let i=0;i<6;i++)g[j*6+i]+=dp*x[i];
    }
  }
  const n=idx.length,b1=0.9,b2=0.999;
  net.t++;
  for(let q=0;q<th.length;q++){
    const gq=g[q]/n;
    net.m[q]=b1*net.m[q]+(1-b1)*gq;
    net.v[q]=b2*net.v[q]+(1-b2)*gq*gq;
    const mh=net.m[q]/(1-Math.pow(b1,net.t)),vh=net.v[q]/(1-Math.pow(b2,net.t));
    th[q]-=lr*mh/(Math.sqrt(vh)+1e-8);
  }
  return loss/n;
}
function neuronStep(st,lr){
  const gw=[0,0,0,0,0,0];let gb=0;
  CHARS.forEach((c,k)=>{
    const y=k===st.t?1:0;
    let z=st.b;for(let i=0;i<6;i++)z+=st.w[i]*c.v[i];
    const d=(sig(z)-y)*(y?4:1)/12;
    gb+=d;for(let i=0;i<6;i++)gw[i]+=d*c.v[i];
  });
  for(let i=0;i<6;i++)st.w[i]=clamp(st.w[i]-lr*gw[i],-6,6);
  st.b=clamp(st.b-lr*gb,-15,15);
}

/* ---- Nivel básico: 6 personajes, 4 rasgos, puntos enteros ---- */
const BCHARS=[
  ['Ana',[0,1,0,1]],['Biel',[1,0,1,0]],['Carla',[1,0,0,1]],
  ['Dani',[0,1,1,0]],['Eva',[1,1,0,0]],['Hugo',[0,0,1,1]]
].map(([name,v])=>({name,v}));
function bFace(v){return [v[0],v[1],v[2],0,0,v[3]];}
function bScores(W,x){return W.map(r=>r.reduce((s,w,j)=>s+w*x[j],0));}
function bWinners(s){const m=Math.max.apply(null,s);const w=[];s.forEach((v,i)=>{if(v===m)w.push(i);});return w;}
function bNew(){return BCHARS.map(()=>[0,0,0,0]);}
function bRecognized(W,c){const w=bWinners(bScores(W,BCHARS[c].v));return w.length===1&&w[0]===c;}
function bTeach(W,x,y){
  const s=bScores(W,x),w=bWinners(s);
  if(w.length===1&&w[0]===y)return {ok:true,wrong:-1,tie:false,s:s};
  let k=-1,best=-1e9;
  s.forEach((v,i)=>{if(i!==y&&v>best){best=v;k=i;}});
  for(let j=0;j<4;j++)if(x[j]){W[y][j]+=1;W[k][j]-=1;}
  return {ok:false,wrong:k,tie:w.length>1,s:s};
}
// </NN>
function faceSVG(v,label){
  const g=v[0],s=v[1],b=v[2],c=v[3],l=v[4],o=v[5];
  const hair=c?'#e2b43c':'#3a2a24';
  let p='<path d="M12 100 C12 82 30 76 50 76 C70 76 88 82 88 100 Z" fill="#6f7fb8"/>';
  if(l)p+='<path d="M17 52 C12 12 88 12 83 52 L90 90 L10 90 Z" fill="'+hair+'"/>';
  p+='<ellipse cx="50" cy="50" rx="25" ry="29" fill="#f1c9a0"/>';
  if(b)p+='<path d="M25 55 C24 90 76 90 75 55 C73 70 62 74 50 74 C38 74 27 70 25 55 Z" fill="'+hair+'"/>';
  p+='<path d="M25 46 C21 14 79 14 75 46 C69 35 58 31 50 31 C42 31 31 35 25 46 Z" fill="'+hair+'"/>';
  if(s)p+='<ellipse cx="50" cy="28" rx="35" ry="6.5" fill="#23766c"/><path d="M33 28 L33 14 C33 8 67 8 67 14 L67 28 Z" fill="#2f9486"/><rect x="33" y="21" width="34" height="5" fill="#1b5a52"/>';
  p+='<circle cx="41" cy="51" r="2.6" fill="#2a2230"/><circle cx="59" cy="51" r="2.6" fill="#2a2230"/>';
  if(g)p+='<g fill="#ffffff" fill-opacity=".25" stroke="#2a2230" stroke-width="2"><circle cx="41" cy="51" r="8"/><circle cx="59" cy="51" r="8"/></g><path d="M49 50 Q50 48.5 51 50 M33 50 L26 48 M67 50 L74 48" stroke="#2a2230" stroke-width="2" fill="none"/>';
  p+='<path d="M50 54 L47.5 61 L51.5 61" fill="none" stroke="#c18f66" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  p+=o?'<path d="M41 66 Q50 75 59 66" stroke="#7a2e2e" fill="none" stroke-width="2.4" stroke-linecap="round"/>'
      :'<path d="M43 68 Q50 69 57 68" stroke="#7a2e2e" fill="none" stroke-width="2.4" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 100 100" class="face" role="img" aria-label="'+label+'">'+p+'</svg>';
}

const api={clamp,CHARS,BCHARS,sig,rnd,argmax,makeNet,forward,trainEpoch,neuronStep,bFace,bScores,bWinners,bNew,bRecognized,bTeach,faceSVG};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.QQ=api;
})(typeof window!=='undefined'?window:globalThis);
