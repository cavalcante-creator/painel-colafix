/* Folha do almoço pela foto (23/10): a folha impressa tem 4 marcas pretas nos cantos e um código de quadradinhos
   (dia, número da folha e versão da impressão). Pela foto o painel acha as marcas, endireita a folha (homografia)
   e mede a tinta na coluna "Assinatura" de cada linha — não lê a letra, só vê se a linha foi assinada.
   Os nomes de cada linha vêm do que foi impresso (rh/dados/almocofolha/<dia>.emit.pags).
   window.RHAlmFoto: G (medidas em mm), paginas(...) (HTML das folhas), ler(file, pags) (leitura da foto). */
(function(){
  /* medidas da folha A4 em mm (impressão com margem zero) */
  const G={W:210,H:297,mk:7,mc:[[12,12],[198,12],[198,285],[12,285]],x0:25,cw:[66,70,12,12],y0:22,rh:5.5,por:45,cx:27,cy:12,cc:2.8,nb:26};
  const colX=i=>G.x0+G.cw.slice(0,i).reduce((a,b)=>a+b,0);
  /* ---------- código da folha: guarda(1) + dia(13) + folha(3) + versão(2) + conferência(6) + guarda(0) ---------- */
  const D0=Date.UTC(2026,0,1);
  const diaN=d=>Math.round((Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))-D0)/864e5);
  const nDia=n=>new Date(D0+n*864e5).toISOString().slice(0,10);
  const ckDe=v=>{ let c=7; for(let i=0;i<18;i++) c=((c<<1)^((v>>i)&1?43:0)^(c>>5?37:0))&63; return c; };
  function codBits(d,pg,ver){ const v=((diaN(d)&8191)<<5)|((pg&7)<<2)|(ver&3), ck=ckDe(v); const b=[1];
    for(let i=17;i>=0;i--) b.push((v>>i)&1); for(let i=5;i>=0;i--) b.push((ck>>i)&1); b.push(0); return b; }
  function decBits(b){ if(b.length!==G.nb||b[0]!==1||b[G.nb-1]!==0) return null; let v=0, ck=0; for(let i=1;i<19;i++) v=v*2+b[i]; for(let i=19;i<25;i++) ck=ck*2+b[i];
    if(ckDe(v)!==ck) return null; return {dia:nDia(v>>5),pg:(v>>2)&7,ver:v&3}; }

  /* ---------- HTML das folhas (uma página A4 por bloco de 45 nomes) ---------- */
  const e=s=>String(s==null?'':s).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
  function pagsDe(L,mk){ const rows=L.map(x=>({nome:x.nome,cz:mk(x)||''})); const ps=[]; for(let i=0;i<rows.length;i+=G.por) ps.push(rows.slice(i,i+G.por));
    if(!ps.length) ps.push([]); const ult=ps[ps.length-1]; const vaz=Math.min(4,G.por-ult.length); for(let i=0;i<vaz;i++) ult.push({nome:'',cz:''}); return ps; }
  function paginas(ps,d,ver,titulo){ const brB=d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4), mm=v=>v+'mm';
    const cel=(x,y,w,cls,txt)=>`<div class="c ${cls}" style="left:${mm(x)};top:${mm(y)};width:${mm(w)}">${txt||''}</div>`;
    return ps.map((rows,pi)=>{ let h=G.mc.map(([x,y])=>`<i class="mk" style="left:${mm(x-G.mk/2)};top:${mm(y-G.mk/2)}"></i>`).join('');
      codBits(d,pi,ver).forEach((b,i)=>{ h+=`<i class="cd ${b?'b':''}" style="left:${mm(G.cx+i*G.cc)};top:${mm(G.cy-G.cc/2)}"></i>`; });
      h+=`<div class="id" style="left:${mm(G.cx+G.nb*G.cc+4)};top:${mm(G.cy-2.2)}">Folha ${pi+1} de ${ps.length} · ${brB}</div>`;
      h+=cel(colX(0),G.y0,G.cw[0],'th nm',e(titulo))+cel(colX(1),G.y0,G.cw[1],'th','Assinatura')+cel(colX(2),G.y0,G.cw[2],'th','')+cel(colX(3),G.y0,G.cw[3],'th','');
      rows.forEach((r,i)=>{ const y=G.y0+G.rh*(i+1), z=r.cz?' cz':''; h+=cel(colX(0),y,G.cw[0],'nm'+z,e(r.nome))+cel(colX(1),y,G.cw[1],'as'+z,r.cz?e(r.cz):'')+cel(colX(2),y,G.cw[2],z,'')+cel(colX(3),y,G.cw[3],z,''); });
      h+=`<div class="rod" style="left:${mm(G.x0)};top:${mm(289.5)}">Para conferir pela foto: fotografe a folha inteira, de frente, com as 4 marcas pretas aparecendo.</div>`;
      return `<section class="pg">${h}</section>`; }).join(''); }
  const CSS=`@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}body{font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pg{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page;background:#fff}.pg:last-child{page-break-after:auto;break-after:auto}
    .pg i{position:absolute;display:block}.mk{width:7mm;height:7mm;background:#000}.cd{width:2.8mm;height:2.8mm;background:#fff}.cd.b{background:#000}
    .id{position:absolute;font-size:9pt;font-weight:700;white-space:nowrap}.rod{position:absolute;font-size:7.5pt;color:#444;white-space:nowrap}
    .c{position:absolute;box-sizing:border-box;height:5.5mm;border:0.6pt solid #000;margin:-0.3pt 0 0 -0.3pt;padding:0 3px;font-size:11pt;font-weight:700;line-height:5.2mm;white-space:nowrap;overflow:hidden}
    .c.th{background:#BFBFBF;font-style:italic;text-align:center}.c.nm{text-align:left}.c.th.nm{text-align:center}.c.as{text-align:center;font-weight:400;font-style:italic;font-size:10pt}.c.cz{background:#BFBFBF}`;

  /* ---------- leitura da foto ---------- */
  async function imagem(file){ const url=URL.createObjectURL(file); try{ const im=new Image(); await new Promise((ok,no)=>{ im.onload=ok; im.onerror=()=>no(new Error('Não consegui abrir a foto.')); im.src=url; });
      const s=Math.min(1,2200/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.round(im.naturalWidth*s), h=Math.round(im.naturalHeight*s), cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(im,0,0,w,h); return cv; }
    finally{ setTimeout(()=>URL.revokeObjectURL(url),2000); } }
  function cinza(cv){ const w=cv.width,h=cv.height,d=cv.getContext('2d').getImageData(0,0,w,h).data,g=new Float32Array(w*h); for(let i=0,j=0;i<g.length;i++,j+=4) g[i]=.299*d[j]+.587*d[j+1]+.114*d[j+2]; return g; }
  function marcas(g,w,h){ const W=w+1, I=new Float64Array(W*(h+1)); for(let y=0;y<h;y++){ let s=0; for(let x=0;x<w;x++){ s+=g[y*w+x]; I[(y+1)*W+x+1]=I[y*W+x+1]+s; } }
    const r=Math.max(8,Math.round(Math.max(w,h)/9)), M=new Uint8Array(w*h);
    for(let y=0;y<h;y++){ const y0=Math.max(0,y-r), y1=Math.min(h,y+r+1); for(let x=0;x<w;x++){ const x0=Math.max(0,x-r), x1=Math.min(w,x+r+1);
      const m=(I[y1*W+x1]-I[y0*W+x1]-I[y1*W+x0]+I[y0*W+x0])/((y1-y0)*(x1-x0)); if(g[y*w+x]<m*.62) M[y*w+x]=1; } }
    const L=Math.max(w,h), aMin=Math.pow(L*.006,2), aMax=Math.pow(L*.09,2), cs=[], st=new Int32Array(w*h);
    for(let i=0;i<M.length;i++){ if(M[i]!==1) continue; let n=0, sp=0, a=0, sx=0, sy=0, xa=1e9, xb=-1, ya=1e9, yb=-1; st[sp++]=i; M[i]=2;
      while(sp){ const p=st[--sp], x=p%w, y=(p-x)/w; a++; sx+=x; sy+=y; if(x<xa) xa=x; if(x>xb) xb=x; if(y<ya) ya=y; if(y>yb) yb=y;
        if(x>0&&M[p-1]===1){ M[p-1]=2; st[sp++]=p-1; } if(x<w-1&&M[p+1]===1){ M[p+1]=2; st[sp++]=p+1; } if(y>0&&M[p-w]===1){ M[p-w]=2; st[sp++]=p-w; } if(y<h-1&&M[p+w]===1){ M[p+w]=2; st[sp++]=p+w; } }
      const bw=xb-xa+1, bh=yb-ya+1; if(a<aMin||a>aMax) continue; const asp=bw/bh, fill=a/(bw*bh); if(asp<.55||asp>1.8||fill<.55) continue; cs.push({x:sx/a,y:sy/a,a}); n++; }
    cs.sort((p,q)=>q.a-p.a); const C=cs.slice(0,14); if(C.length<4) return null;
    let best=null; const alvo=(G.mc[1][0]-G.mc[0][0])/(G.mc[3][1]-G.mc[0][1]);
    for(let i=0;i<C.length;i++) for(let j=i+1;j<C.length;j++) for(let k=j+1;k<C.length;k++) for(let l=k+1;l<C.length;l++){ const q=[C[i],C[j],C[k],C[l]];
      const amx=Math.max(...q.map(o=>o.a)), amn=Math.min(...q.map(o=>o.a)); if(amx/amn>2.6) continue;
      const cx=q.reduce((s,o)=>s+o.x,0)/4, cy=q.reduce((s,o)=>s+o.y,0)/4; q.sort((p,o)=>Math.atan2(p.y-cy,p.x-cx)-Math.atan2(o.y-cy,o.x-cx));
      const dd=(p,o)=>Math.hypot(p.x-o.x,p.y-o.y), s=[dd(q[0],q[1]),dd(q[1],q[2]),dd(q[2],q[3]),dd(q[3],q[0])];
      const ar=Math.min((s[0]+s[2])/(s[1]+s[3]),(s[1]+s[3])/(s[0]+s[2])), op=Math.max(s[0]/s[2],s[2]/s[0])+Math.max(s[1]/s[3],s[3]/s[1])-2;
      const lado=Math.sqrt(amn), tam=Math.min(...s)/lado; if(tam<8) continue; /* as marcas ficam longe uma da outra */
      const sc=Math.abs(ar-alvo)*3+op+(amx/amn-1)*.4-Math.log(amn)*.02; if(!best||sc<best.sc) best={sc,q}; }
    return best&&best.sc<1.6?best.q:null; }
  function homog(src,dst){ /* src mm → dst px */ const A=[], b=[];
    for(let i=0;i<4;i++){ const [x,y]=src[i], [u,v]=dst[i]; A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u); A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v); }
    for(let c=0;c<8;c++){ let p=c; for(let r=c+1;r<8;r++) if(Math.abs(A[r][c])>Math.abs(A[p][c])) p=r; [A[c],A[p]]=[A[p],A[c]]; [b[c],b[p]]=[b[p],b[c]]; if(Math.abs(A[c][c])<1e-12) return null;
      for(let r=0;r<8;r++){ if(r===c) continue; const f=A[r][c]/A[c][c]; if(!f) continue; for(let k=c;k<8;k++) A[r][k]-=f*A[c][k]; b[r]-=f*b[c]; } }
    const hh=b.map((v,i)=>v/A[i][i]); return (x,y)=>{ const z=hh[6]*x+hh[7]*y+1; return [(hh[0]*x+hh[1]*y+hh[2])/z,(hh[3]*x+hh[4]*y+hh[5])/z]; }; }
  function amostra(g,w,h,H){ return (x,y)=>{ const [u,v]=H(x,y), i=Math.floor(u), j=Math.floor(v); if(i<0||j<0||i>=w-1||j>=h-1) return 255; const a=u-i, c=v-j, p=j*w+i;
    return g[p]*(1-a)*(1-c)+g[p+1]*a*(1-c)+g[p+w]*(1-a)*c+g[p+w+1]*a*c; }; }
  const media=(S,x,y,r)=>{ let s=0,n=0; for(let a=-r;a<=r+1e-9;a+=r/3) for(let b=-r;b<=r+1e-9;b+=r/3){ s+=S(x+a,y+b); n++; } return s/n; };
  /* tinta num retângulo (mm): fração de pontos bem mais escuros que o papel em volta */
  function tinta(S,x0,y0,x1,y1){ const seg=Math.max(1,Math.round((x1-x0)/12)), sw=(x1-x0)/seg; let n=0, tot=0;
    for(let k=0;k<seg;k++){ const v=[]; for(let y=y0;y<=y1;y+=.2) for(let x=x0+k*sw;x<=x0+(k+1)*sw;x+=.2) v.push(S(x,y)); const o=v.slice().sort((a,b)=>a-b), br=o[Math.floor(o.length*.9)]||255;
      v.forEach(t=>{ if(t<br*.8) n++; }); tot+=v.length; } return n/(tot||1); }
  /* pags = o que foi impresso: [[{nome,cz}], …] por folha, ou função (código lido) → linhas da folha */
  async function ler(file,pags){ const cv=await imagem(file), w=cv.width, h=cv.height, g=cinza(cv), q=marcas(g,w,h);
    if(!q) throw new Error('Não achei as 4 marcas pretas dos cantos. Tire a foto de novo com a folha inteira aparecendo, de frente e com boa luz.');
    let ok=null; for(let r=0;r<4&&!ok;r++){ const dst=[0,1,2,3].map(i=>[q[(i+r)%4].x,q[(i+r)%4].y]), H=homog(G.mc,dst); if(!H) continue; const S=amostra(g,w,h,H);
      const preto=G.mc.reduce((s,[x,y])=>s+media(S,x,y,1.4),0)/4, papel=[20,60,100,140,180].map(x=>media(S,x,17.2,1)).sort((a,b)=>a-b)[2], lim=(preto+papel)/2;
      const bits=Array.from({length:G.nb},(_,i)=>media(S,G.cx+i*G.cc+G.cc/2,G.cy,.6)<lim?1:0), dec=decBits(bits); if(dec) ok={H,S,dec}; }
    if(!ok) throw new Error('Achei a folha, mas não consegui ler o código dela (os quadradinhos ao lado da marca de cima). Confira se é uma folha impressa pelo painel e tire a foto mais perto.');
    const {S,dec,H}=ok, rows=(typeof pags==='function'?pags(dec):(pags&&pags[dec.pg]))||null, out=[];
    if(rows){ const ax=colX(1)+1.4, bx=colX(2)-1.4, ex0=colX(2)+1.2, ex1=colX(4)-1.2;
      rows.forEach((r,i)=>{ if(!r.nome) return; const y=G.y0+G.rh*(i+1), y0=y+1.15, y1=y+G.rh-1.15; if(r.cz){ out.push({nome:r.nome,i,s:'cz'}); return; }
        const t=tinta(S,ax,y0,bx,y1), ru=Math.min(tinta(S,ex0,y0,colX(3)-1.2,y1),tinta(S,colX(3)+1.2,y0,ex1,y1)), lim=Math.max(.012,ru*3+.006); out.push({nome:r.nome,i,t:+t.toFixed(4),u:+ru.toFixed(4),s:t>=lim?'sim':t>=Math.max(.004,ru*1.5+.002)?'duv':'nao'}); }); }
    /* foto pequena com as linhas marcadas (verde assinou, vermelho em branco, laranja conferir) e a foto para guardar */
    const k=Math.min(1,1000/Math.max(w,h)), vw=document.createElement('canvas'); vw.width=Math.round(w*k); vw.height=Math.round(h*k); const x=vw.getContext('2d'); x.drawImage(cv,0,0,vw.width,vw.height);
    const cor={sim:'rgba(47,140,90,.38)',nao:'rgba(200,50,40,.30)',duv:'rgba(230,140,20,.45)',cz:'rgba(120,120,120,.18)'};
    out.forEach(o=>{ const y=G.y0+G.rh*(o.i+1), pts=[[colX(1),y],[colX(2),y],[colX(2),y+G.rh],[colX(1),y+G.rh]].map(([a,b])=>H(a,b)); x.fillStyle=cor[o.s]; x.beginPath(); pts.forEach(([u,v],j)=>j?x.lineTo(u*k,v*k):x.moveTo(u*k,v*k)); x.closePath(); x.fill(); });
    const sv=document.createElement('canvas'), ks=Math.min(1,1600/Math.max(w,h)); sv.width=Math.round(w*ks); sv.height=Math.round(h*ks); sv.getContext('2d').drawImage(cv,0,0,sv.width,sv.height);
    const blob=await new Promise(res=>sv.toBlob(res,'image/jpeg',.72));
    return {dia:dec.dia,pg:dec.pg,ver:dec.ver,linhas:out,semLista:!rows,vista:vw.toDataURL('image/jpeg',.7),blob}; }
  window.RHAlmFoto={G,pagsDe,paginas,CSS,ler,_bits:{codBits,decBits}};
})();
