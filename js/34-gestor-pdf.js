/* Painel Colafix · 34-gestor-pdf.js (22/10)
   Relatórios do gestor (dia e mês) em PDF de verdade (jsPDF, baixa o arquivo; sem janela de impressão),
   com a logo da Colafix e a da Lys (icons/assinatura.png), números em quadros, gráficos e tabelas. */
"use strict";
const GPDF={W:210,H:297,M:14,cor:{pet:[20,63,84],pet2:[27,81,104],ink:[20,63,84],mut:[85,102,111],lin:[221,228,233],soft:[243,246,248],zeb:[248,250,251],ok:[60,138,99],warn:[173,132,50],crit:[181,71,63],cinza:[201,211,218],teal:[31,110,128],red:[227,49,45]}};
let _gpImg=null;
async function gpImgs(){ if(_gpImg) return _gpImg; const ld=src=>new Promise(res=>{ const i=new Image(); i.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); res({d:c.toDataURL('image/png'),w:i.naturalWidth,h:i.naturalHeight}); }catch(e){ res(null); } }; i.onerror=()=>res(null); i.src=src; });
  const claro=(document.querySelector('.brand img')||{}).src||'';
  const [esc1,lys,cl]=await Promise.all([ld('icons/logo-colafix-escuro.png'),ld('icons/assinatura.png'),claro?ld(claro):Promise.resolve(null)]);
  _gpImg={escuro:esc1,lys,claro:cl}; return _gpImg; }
function gpNovo(tit,sub,img){ const J=window.jspdf&&window.jspdf.jsPDF; if(!J) throw new Error('O gerador de PDF não carregou. Confira a internet e tente de novo.');
  const doc=new J({unit:'mm',format:'a4',orientation:'portrait'}); const C=GPDF.cor, W=GPDF.W, M=GPDF.M;
  const P={doc,y:0,tit,sub,img,W,M,cw:W-2*M};
  const fc=c=>doc.setFillColor(c[0],c[1],c[2]), tc=c=>doc.setTextColor(c[0],c[1],c[2]), dc=c=>doc.setDrawColor(c[0],c[1],c[2]);
  P.fc=fc; P.tc=tc; P.dc=dc;
  P.fit=(t,w)=>{ t=String(t==null?'':t); if(doc.getTextWidth(t)<=w) return t; while(t.length>1&&doc.getTextWidth(t+'…')>w) t=t.slice(0,-1); return t+'…'; };
  /* faixa do topo (1ª página) */
  P.capa=()=>{ fc(C.pet); doc.rect(0,0,W,42,'F'); fc(C.pet2); doc.triangle(W-70,0,W,0,W,42,'F'); fc(C.red); doc.rect(0,42,W,1.2,'F');
    if(img.escuro) doc.addImage(img.escuro.d,'PNG',M,9,40,40*img.escuro.h/img.escuro.w);
    if(img.lys) doc.addImage(img.lys.d,'PNG',W-M-13,8,13,13*img.lys.h/img.lys.w);
    doc.setFont('helvetica','bold'); doc.setFontSize(19); tc([255,255,255]); doc.text(tit,M,30);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); tc([200,217,225]); doc.text(sub,M,36.5);
    doc.setFontSize(7.5); doc.text('Gerado em '+new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),W-M,36.5,{align:'right'});
    P.y=52; };
  P.topo=()=>{ if(img.claro) doc.addImage(img.claro.d,'PNG',M,8,24,24*img.claro.h/img.claro.w); doc.setFont('helvetica','bold'); doc.setFontSize(9); tc(C.ink); doc.text(tit,W-M,12,{align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); tc(C.mut); doc.text(sub,W-M,16,{align:'right'}); dc(C.lin); doc.setLineWidth(.3); doc.line(M,19.5,W-M,19.5); P.y=27; };
  P.nova=()=>{ doc.addPage(); P.topo(); };
  P.cabe=h=>{ if(P.y+h>GPDF.H-18) P.nova(); };
  P.secao=(t,nota)=>{ P.cabe(16); P.y+=2; fc(C.red); doc.rect(M,P.y-3.6,1.3,4.6,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(11.5); tc(C.ink); doc.text(t,M+3.5,P.y);
    if(nota){ doc.setFont('helvetica','normal'); doc.setFontSize(7.5); tc(C.mut); doc.text(P.fit(nota,P.cw-doc.getTextWidth(t)-30),W-M,P.y,{align:'right'}); } P.y+=5; };
  /* quadros de números */
  P.kpis=(xs,cols)=>{ cols=cols||4; const g=3.5, w=(P.cw-(cols-1)*g)/cols, h=23;
    for(let i=0;i<xs.length;i+=cols){ P.cabe(h+3); xs.slice(i,i+cols).forEach((k,j)=>{ const x=M+j*(w+g), y=P.y, cs=k.c?C[k.c]:C.cinza;
        fc(C.soft); doc.roundedRect(x,y,w,h,2,2,'F'); fc(cs); doc.roundedRect(x,y,w,1.6,.8,.8,'F'); doc.rect(x,y+.8,w,.8,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(6.6); tc(C.mut); doc.text(P.fit(String(k.t).toUpperCase(),w-6),x+3.5,y+7);
        doc.setFontSize(String(k.v).length>12?11:15); tc(k.c&&k.c!=='cinza'?cs:C.ink); doc.text(P.fit(k.v,w-6),x+3.5,y+15);
        doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(C.mut); doc.text(P.fit(k.s||'',w-6),x+3.5,y+20); });
      P.y+=h+g; } P.y+=1.5; };
  /* tabela */
  P.tabela=(cols,rows,o)=>{ o=o||{}; const tw=cols.reduce((a,c)=>a+c.w,0), k=P.cw/tw; cols=cols.map(c=>Object.assign({},c,{w:c.w*k}));
    const cab=()=>{ fc([233,238,242]); doc.rect(M,P.y,P.cw,6.5,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7); tc(C.mut); let x=M; cols.forEach(c=>{ doc.text(String(c.t).toUpperCase(),c.al==='r'?x+c.w-2:x+2,P.y+4.4,{align:c.al==='r'?'right':'left'}); x+=c.w; }); P.y+=6.5; };
    P.cabe(14); cab();
    rows.forEach((r,i)=>{ const tot=r._tot; doc.setFont('helvetica',tot?'bold':'normal'); doc.setFontSize(8);
      const ls=cols.map((c,j)=>doc.splitTextToSize(String(r[j]==null?'':r[j]),c.w-4).slice(0,3)), h=Math.max(6.2,Math.max(...ls.map(l=>l.length))*3.4+2.8);
      if(P.y+h>GPDF.H-18){ P.nova(); cab(); doc.setFont('helvetica',tot?'bold':'normal'); doc.setFontSize(8); }
      if(tot){ fc([233,238,242]); doc.rect(M,P.y,P.cw,h,'F'); } else if(i%2){ fc(C.zeb); doc.rect(M,P.y,P.cw,h,'F'); }
      let x=M; cols.forEach((c,j)=>{ const cor=r._cor&&r._cor[j]; tc(cor?C[cor]:C.ink); doc.text(ls[j],c.al==='r'?x+c.w-2:x+2,P.y+4.2,{align:c.al==='r'?'right':'left'}); x+=c.w; });
      dc(C.lin); doc.setLineWidth(.2); doc.line(M,P.y+h,M+P.cw,P.y+h); P.y+=h; });
    P.y+=5; };
  P.vazio=t=>{ P.cabe(9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); tc(C.mut); doc.text(t,M,P.y+2); P.y+=8; };
  /* barras horizontais: [{l,v,txt,c}] */
  P.hbar=(xs,o)=>{ o=o||{}; const mx=o.max||Math.max(1,...xs.map(x=>x.v)), lw=o.lw||40, vw=24, bw=P.cw-lw-vw-4;
    xs.forEach(x=>{ P.cabe(7.5); doc.setFont('helvetica','normal'); doc.setFontSize(8); tc(C.ink); doc.text(P.fit(x.l,lw-2),M,P.y+3.6);
      fc(C.soft); doc.roundedRect(M+lw,P.y+.8,bw,3.8,1.5,1.5,'F'); const w=Math.max(0,Math.min(1,x.v/mx))*bw; if(w>.5){ fc(x.c?C[x.c]:C.pet); doc.roundedRect(M+lw,P.y+.8,w,3.8,1.5,1.5,'F'); }
      doc.setFont('helvetica','bold'); tc(C.ink); doc.text(x.txt,M+P.cw,P.y+3.6,{align:'right'}); P.y+=7; }); P.y+=3; };
  /* colunas agrupadas: [{l, a, b, rot, c}] */
  P.colunas=(xs,o)=>{ o=o||{}; const h=o.h||44; P.cabe(h+16); const top=P.y+4, base=top+h, mx=Math.max(1,...xs.map(x=>Math.max(x.a||0,x.b||0)));
    dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(M,y,M+P.cw,y); }
    const gw=P.cw/Math.max(1,xs.length), bw=Math.min(14,gw/3.2);
    xs.forEach((x,i)=>{ const cx=M+gw*i+gw/2; const bar=(v,dx,cor,lab)=>{ const hh=(v||0)/mx*h; fc(cor); if(hh>.3) doc.rect(cx+dx,base-hh,bw,hh,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7); tc(C.ink); if(lab) doc.text(lab,cx+dx+bw/2,base-hh-1.5,{align:'center'}); };
      bar(x.a,-bw-.8,C.pet,x.at); bar(x.b,.8,C.cinza,x.bt);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); tc(C.ink); doc.text(P.fit(x.l,gw-2),cx,base+4.5,{align:'center'}); if(x.rot){ doc.setFontSize(7.5); tc(x.c?C[x.c]:C.mut); doc.text(x.rot,cx,base+8.5,{align:'center'}); } });
    P.y=base+12; P.legenda([['Realizado',C.pet],['Meta',C.cinza]]); };
  P.legenda=xs=>{ let x=M; doc.setFont('helvetica','normal'); doc.setFontSize(7.5); xs.forEach(([t,c,tipo])=>{ fc(c); if(tipo==='linha') doc.rect(x,P.y-1.6,5,.8,'F'); else doc.roundedRect(x,P.y-2.4,3,3,.6,.6,'F'); tc(C.mut); doc.text(t,x+(tipo==='linha'?6.5:4.5),P.y); x+=doc.getTextWidth(t)+12; }); P.y+=6; };
  P.texto=(t,o)=>{ o=o||{}; doc.setFont('helvetica',o.b?'bold':'normal'); doc.setFontSize(o.fs||8.5); tc(o.c?C[o.c]:C.mut); const ls=doc.splitTextToSize(String(t),P.cw); P.cabe(ls.length*4+2); doc.text(ls,M,P.y+3); P.y+=ls.length*4+3; };
  P.fim=nome=>{ const n=doc.getNumberOfPages(); for(let i=1;i<=n;i++){ doc.setPage(i); const y=GPDF.H-9; dc(C.lin); doc.setLineWidth(.3); doc.line(M,y-4,W-M,y-4);
      if(img.lys) doc.addImage(img.lys.d,'PNG',M,y-2.6,3.4,3.4*img.lys.h/img.lys.w);
      doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(C.mut); doc.text('Painel de Operação · Colafix'+(gxEu()?' · '+gxEu():''),M+(img.lys?5:0),y); doc.text('Página '+i+' de '+n,W-M,y,{align:'right'}); }
    doc.save(nome); };
  return P; }
const gpCor=p=>p==null?'cinza':p>=95?'ok':p>=80?'warn':'crit';
const gpChSt=c=>c.status==='Concluída'?'Concluída':(c.exec&&c.exec.tecnico)||c.status==='Em execução'?'Em andamento':(c.status||'Aberta');
const gpAcSt=a=>{ const h=hojeStr(); return a.st==='ok'?'Concluída':a.prazo&&a.prazo<h?'Atrasada':a.st==='and'?'Em andamento':'Pendente'; };
const gpHora=iso=>{ try{ return hora(iso); }catch(e){ return ''; } };

/* ================= RELATÓRIO DO DIA ================= */
async function gxPdfDia(d){ const img=await gpImgs(), D=gxDados(d), T=D.tot, pc=gxPct(T.t,T.mT), seg=D.seg, h=hojeStr();
  const P=gpNovo('Relatório do dia',gxDiaTxt(d)+' · Fábrica de argamassa e rejunte'+(d===h?' · até '+gpHora(new Date().toISOString()):''),img); P.capa();
  const cC=D.corr.filter(c=>c.status==='Concluída').length, pC=D.prev.filter(c=>c.status==='Concluída').length;
  const PD=typeof gxpDoc==='function'?gxpDoc(d):null, PR=PD&&typeof gxpResumo==='function'?gxpResumo(PD):null;
  P.kpis([
    {t:'Produção do dia',v:gxT(T.t)+' t',s:gxN(T.sc)+' sacos · '+D.lin.filter(x=>x.sc).length+' linha(s)',c:'pet'},
    {t:'Meta do dia',v:T.mT?gxT(T.mT)+' t':'—',s:pc!=null?pc+'% atingido':'sem meta da Curva S',c:gpCor(pc)},
    {t:'Disponibilidade',v:T.disp!=null?gxN(T.disp*100,1)+'%':'—',s:'tempo rodando ÷ turno',c:T.disp==null?'cinza':T.disp>=.95?'ok':T.disp>=.85?'warn':'crit'},
    {t:'Paradas',v:gxDur(T.par),s:D.par.filter(z=>!z.setup).length+' parada(s) · sem setup',c:T.par>0?'crit':'ok'},
    {t:'Manutenção corretiva',v:D.corr.length+' OS',s:cC+' concluída(s) · '+(D.corr.length-cC)+' em aberto',c:D.corr.length-cC?'warn':'cinza'},
    {t:'Manutenção preventiva',v:D.prev.length+' OS',s:pC+' concluída(s)'+(D.prevAtr?' · '+D.prevAtr+' atrasada(s)':''),c:D.prevAtr?'warn':'cinza'},
    {t:'Segurança',v:seg?(+seg.ocorr?seg.ocorr+' ocorrência(s)':'Sem ocorrências'):'Não preenchido',s:seg?((seg.pessoas?seg.pessoas+' pessoas':'')+(seg.epi!==''&&seg.epi!=null?' · EPI '+seg.epi+'%':'')):'',c:seg?(+seg.ocorr?'crit':'ok'):'warn'},
    PR?{t:'Pessoas (Face ID)',v:PR.vieram+' de '+PR.esper,s:PR.alm+' almoçaram · '+PR.nao+' não vieram',c:PR.semReg?'warn':'ok'}:{t:'Ordens do dia',v:D.lin.reduce((a,x)=>a+x.ordsOk,0)+' de '+D.lin.reduce((a,x)=>a+x.ords,0),s:'concluídas',c:'cinza'}
  ],4);
  P.secao('Produção por linha','toneladas · realizado × meta do dia (Curva S)');
  if(D.lin.length){ P.colunas(D.lin.map(x=>{ const p=gxPct(x.t,x.mT); return {l:x.l,a:x.t,b:x.mT,at:gxT(x.t),bt:x.mT?gxT(x.mT):'',rot:p!=null?p+'%':'sem meta',c:gpCor(p)}; }));
    P.tabela([{t:'Linha',w:30},{t:'Realizado (t)',w:20,al:'r'},{t:'Sacos',w:16,al:'r'},{t:'Meta (t)',w:16,al:'r'},{t:'Atingido',w:16,al:'r'},{t:'Disponib.',w:16,al:'r'},{t:'Ordens do dia',w:30}],
      D.lin.map(x=>{ const p=gxPct(x.t,x.mT); const r=[x.l,gxT(x.t),gxN(x.sc),x.mT?gxT(x.mT):'—',p!=null?p+'%':'—',x.disp!=null?gxN(x.disp*100,1)+'%':'—',x.ords?x.ordsOk+' de '+x.ords+' concluída(s)':'—']; r._cor={4:p!=null?gpCor(p):null}; return r; })
      .concat([Object.assign(['Total',gxT(T.t),gxN(T.sc),T.mT?gxT(T.mT):'—',pc!=null?pc+'%':'—',T.disp!=null?gxN(T.disp*100,1)+'%':'—',D.lin.reduce((a,x)=>a+x.ordsOk,0)+' de '+D.lin.reduce((a,x)=>a+x.ords,0)],{_tot:1})])); }
  else P.vazio('Sem produção e sem meta neste dia.');
  const tipos=Object.entries(D.tipos).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  if(tipos.length>1){ P.secao('Produção por tipo','toneladas'); P.hbar(tipos.map(([k,v])=>({l:k,v,txt:gxT(v)+' t · '+gxPct(v,T.t)+'%'}))); }
  P.secao('Paradas de produção','setup não conta');
  if(D.par.length) P.tabela([{t:'Início',w:14},{t:'Fim',w:14},{t:'Linha',w:22},{t:'Motivo',w:60},{t:'Tempo',w:16,al:'r'}],
    D.par.map(z=>{ const r=[gpHora(z.p.inicio),z.p.fim?gpHora(z.p.fim):'aberta',z.p.linha||'',(z.p.motivo||'')+(z.setup?' (setup, não conta)':'')+(z.p.obs?' · '+String(z.p.obs).slice(0,70):''),gxDur(z.min)]; r._cor={1:z.p.fim?null:'crit'}; return r; })
    .concat([Object.assign(['','','','Total (sem setup)',gxDur(T.par)],{_tot:1,_cor:{4:'crit'}})]));
  else P.vazio('Nenhuma parada neste dia.');
  try{ if(typeof otDia==='function'){ const xs=otDia(d); if(xs.length){ P.secao('Tempo das ordens','começo e fim pelo posto');
    P.tabela([{t:'Linha',w:16},{t:'Ordem',w:12},{t:'Produto',w:40},{t:'Começo',w:12},{t:'Fim',w:12},{t:'Tempo',w:14,al:'r'},{t:'Parado',w:14,al:'r'},{t:'Sacos',w:12,al:'r'},{t:'Por hora',w:12,al:'r'}],
      xs.map(x=>[x.o.linha||'',x.o.num||'',String(x.o.produto||'').replace(/^\S+\s+-\s+/,''),gpHora(x.s.ini),x.ab?'rodando':gpHora(x.s.fim),gxDur(x.min),gxDur(x.par),gxN(x.sc),x.ph?gxN(x.ph):'—'])); } } }catch(e){}
  P.secao('Manutenção corretiva','chamados do dia');
  if(D.corr.length) P.tabela([{t:'OS',w:12},{t:'Onde',w:28},{t:'Defeito',w:60},{t:'Técnico',w:30},{t:'Situação',w:20}],D.corr.map(c=>{ const r=[manNum(c.numero),(c.linha||'')+(c.equip?' · '+c.equip:''),c.defeito||'',typeof tecNomes==='function'?tecNomes(c):((c.exec||{}).tecnico||''),gpChSt(c)]; r._cor={4:c.status==='Concluída'?'ok':'warn'}; return r; }));
  else P.vazio('Nenhum chamado neste dia.');
  P.secao('Manutenção preventiva');
  if(D.prev.length) P.tabela([{t:'OS',w:12},{t:'Onde',w:34},{t:'Serviço',w:80},{t:'Situação',w:24}],D.prev.map(c=>[manNum(c.numero),c.equip||c.linha||'',String(c.defeito||'').replace(/^PREVENTIVA:\s*/i,''),gpChSt(c)]));
  else P.vazio('Nenhuma preventiva neste dia.'+(D.prevAtr?' Atenção: '+D.prevAtr+' preventiva(s) atrasada(s).':''));
  P.secao('Segurança do trabalho','preenchido pelo gestor');
  if(seg){ P.kpis([{t:'Ocorrências',v:String(seg.ocorr===''||seg.ocorr==null?'—':seg.ocorr),c:+seg.ocorr?'crit':'ok'},{t:'Pessoas presentes',v:String(seg.pessoas===''||seg.pessoas==null?'—':seg.pessoas)},{t:'Uso de EPI',v:seg.epi!==''&&seg.epi!=null?seg.epi+'%':'—'},{t:'Desvios',v:String(seg.desvios===''||seg.desvios==null?'—':seg.desvios),c:+seg.desvios?'warn':''}],4); if(seg.obs) P.texto('Observações: '+seg.obs); }
  else P.vazio('Ainda não preenchido.');
  const acs=(S.gxAcoes||[]).filter(a=>a.st!=='ok'||(a.feitoEm&&gxDiaLocal(a.feitoEm)===d)).slice(0,25);
  P.secao('Plano de ação');
  if(acs.length) P.tabela([{t:'O que fazer',w:80},{t:'Quem',w:28},{t:'Prazo',w:16},{t:'Situação',w:22}],acs.map(a=>{ const s=gpAcSt(a), r=[a.t,a.quem||'',a.prazo?dm(a.prazo):'—',s]; r._cor={3:s==='Atrasada'?'crit':s==='Concluída'?'ok':null}; return r; }));
  else P.vazio('Nenhuma ação aberta.');
  P.fim('Relatorio-do-dia-'+d+'.pdf'); }

/* ================= RELATÓRIO DO MÊS ================= */
async function gxPdfMes(cp){ const M=gxMesDados(cp); if(!M){ toast('Sem a previsão deste mês na Curva S.'); return; } const img=await gpImgs(), T=M.tot, pc=gxPct(T.t,T.mAte), disp=T.turno?1-T.par/T.turno:null;
  const P=gpNovo('Relatório do mês',gxMesTxt(cp).replace(/^./,c=>c.toUpperCase())+' · Fábrica de argamassa e rejunte',img); P.capa();
  const cC=M.corr.filter(c=>c.status==='Concluída').length, pC=M.prev.filter(c=>c.status==='Concluída').length, parT=Object.values(M.parM).reduce((a,v)=>a+v,0);
  const diasSem=M.ultOc?Math.floor((new Date(hojeStr()+'T12:00:00')-new Date(M.ultOc+'T12:00:00'))/864e5):null;
  P.kpis([
    {t:'Produção do mês',v:gxT(T.t)+' t',s:'de '+gxT(T.mMes)+' t · '+(gxPct(T.t,T.mMes)||0)+'% do mês',c:'pet'},
    {t:'Meta até hoje',v:gxT(T.mAte)+' t',s:pc!=null?pc+'% atingido':'',c:gpCor(pc)},
    {t:'Disponibilidade',v:disp!=null?gxN(disp*100,1)+'%':'—',s:'média das linhas',c:disp==null?'cinza':disp>=.95?'ok':disp>=.85?'warn':'crit'},
    {t:'Paradas',v:gxDur(parT),s:M.nPar+' parada(s) no mês',c:parT?'crit':'ok'},
    {t:'Corretivas',v:M.corr.length+' OS',s:cC+' concluída(s)'+(M.MZ&&M.MZ.rep!=null?' · '+gxDur(M.MZ.rep)+' em média':'')},
    {t:'Preventivas',v:M.prev.length?gxPct(pC,M.prev.length)+'%':'—',s:pC+' de '+M.prev.length+' concluída(s)'},
    {t:'Segurança',v:M.ocorr?M.ocorr+' ocorrência(s)':'0 acidentes',s:(diasSem!=null?diasSem+' dias sem acidente · ':'')+M.desv+' desvio(s)',c:M.ocorr?'crit':'ok'},
    {t:'Dias úteis',v:M.ate.length+' de '+M.dias.length,s:M.rem?'faltam '+gxT(Math.max(0,T.mMes-T.t))+' t: '+gxT(Math.max(0,T.mMes-T.t)/M.rem)+' t/dia':'mês fechado'}
  ],4);
  /* produção por dia */
  P.secao('Produção por dia','toneladas · traço = meta do dia'); { const doc=P.doc, C=GPDF.cor, h=40; P.cabe(h+18); const top=P.y+2, base=top+h, xs=M.porDia, mx=Math.max(1,...xs.map(x=>Math.max(x.t||0,x.m||0))), gw=P.cw/Math.max(1,xs.length), bw=Math.max(2,Math.min(7,gw*.62));
    P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); } doc.setFontSize(6.5); P.tc(C.mut); doc.text(gxT(mx)+' t',P.M,top-1.5);
    xs.forEach((x,i)=>{ const cx=P.M+gw*i+gw/2; if(!x.fut){ const p=gxPct(x.t,x.m), hh=(x.t||0)/mx*h; P.fc(C[gpCor(p)]||C.pet); if(hh>.3) doc.rect(cx-bw/2,base-hh,bw,hh,'F'); }
      if(x.m){ const y=base-(x.m/mx*h); P.fc(C.ink); doc.rect(cx-bw/2-1,y-.35,bw+2,.7,'F'); } doc.setFont('helvetica','normal'); doc.setFontSize(6.3); P.tc(C.mut); doc.text(x.d.slice(8),cx,base+3.6,{align:'center'}); });
    P.y=base+9; P.legenda([['95% da meta ou mais',C.ok],['80 a 95%',C.warn],['abaixo de 80%',C.crit],['meta do dia',C.ink,'linha']]); }
  /* curva S */
  P.secao('Curva S do mês','realizado acumulado × planejado'); { const doc=P.doc, C=GPDF.cor, h=46; P.cabe(h+14); const top=P.y+2, base=top+h;
    let ra=0, pa=0; const pts=M.porDia.map(x=>{ pa+=x.m!=null?x.m:(T.mMes/M.dias.length); if(!x.fut) ra+=x.t||0; return {pa,ra:x.fut?null:ra}; });
    const my=Math.max(1,T.mMes,pa,ra), X=i=>P.M+(i/Math.max(1,pts.length-1))*P.cw, Y=v=>base-v/my*h;
    P.dc(C.lin); doc.setLineWidth(.2); for(let i=0;i<=4;i++){ const y=base-h*i/4; doc.line(P.M,y,P.M+P.cw,y); doc.setFontSize(6.3); P.tc(C.mut); doc.text(gxT(my*i/4),P.M-1,y+1,{align:'right'}); }
    P.dc(C.cinza); doc.setLineWidth(.9); doc.setLineDashPattern([1.6,1.2],0); for(let i=1;i<pts.length;i++) doc.line(X(i-1),Y(pts[i-1].pa),X(i),Y(pts[i].pa)); doc.setLineDashPattern([],0);
    P.dc(C.pet); doc.setLineWidth(1.2); const rr=pts.filter(p=>p.ra!=null); for(let i=1;i<rr.length;i++) doc.line(X(i-1),Y(rr[i-1].ra),X(i),Y(rr[i].ra));
    if(rr.length){ const i=rr.length-1; P.fc(C.pet); doc.circle(X(i),Y(rr[i].ra),1.2,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); P.tc(C.pet); doc.text(gxT(rr[i].ra)+' t',X(i)+2,Y(rr[i].ra)-1.5); }
    P.y=base+7; P.legenda([['Realizado acumulado',C.pet,'linha'],['Planejado (meta do mês)',C.cinza,'linha']]); }
  P.secao('Por linha');
  P.tabela([{t:'Linha',w:30},{t:'Meta do mês (t)',w:22,al:'r'},{t:'Meta até hoje',w:20,al:'r'},{t:'Realizado (t)',w:20,al:'r'},{t:'Atingido',w:16,al:'r'},{t:'Disponib.',w:16,al:'r'}],
    M.ls.map(x=>{ const p=x.mAte?x.t/x.mAte*100:null; const r=[x.l,gxT(x.mMes||0),gxT(x.mAte),gxT(x.t),p!=null?gxN(p,1)+'%':'—',x.turno?gxN((1-x.par/x.turno)*100,1)+'%':'—']; r._cor={4:p!=null?gpCor(p):null}; return r; })
    .concat([Object.assign(['Total',gxT(T.mMes),gxT(T.mAte),gxT(T.t),pc!=null?gxN(T.t/T.mAte*100,1)+'%':'—',disp!=null?gxN(disp*100,1)+'%':'—'],{_tot:1})]));
  P.secao('Paradas por causa',gxDur(parT)+' no mês · setup não conta');
  const pm=Object.entries(M.parM).sort((a,b)=>b[1]-a[1]); if(pm.length) P.hbar(pm.slice(0,12).map(([k,v])=>({l:k,v,txt:gxDur(v)+' · '+gxPct(v,parT)+'%',c:'crit'})),{lw:52}); else P.vazio('Nenhuma parada no mês.');
  P.secao('Manutenção do mês');
  P.tabela([{t:'',w:40},{t:'Abertas',w:20,al:'r'},{t:'Concluídas',w:20,al:'r'},{t:'Em aberto',w:20,al:'r'}],[['Corretivas',String(M.corr.length),String(cC),String(M.corr.length-cC)],['Preventivas',String(M.prev.length),String(pC),String(M.prev.length-pC)]]);
  P.secao('Segurança do mês','preenchido pelo gestor');
  P.kpis([{t:'Ocorrências',v:String(M.ocorr),c:M.ocorr?'crit':'ok'},{t:'Desvios',v:String(M.desv),c:M.desv?'warn':''},{t:'Dias preenchidos',v:M.segs.length+' de '+M.ate.length},{t:'Dias sem acidente',v:diasSem!=null?String(diasSem):'—'}],4);
  P.fim('Relatorio-do-mes-'+cp+'.pdf'); }

/* botões: troca a janela de impressão pelo PDF baixado */
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="gx-pdf-dia"],[data-act="gx-pdf-mes"]'); if(!b) return; ev.stopImmediatePropagation(); ev.preventDefault();
  if(b.dataset.gerando) return; b.dataset.gerando='1'; const t0=b.innerHTML; b.disabled=true; b.innerHTML=ic('baixar',18,2)+'Gerando o PDF…';
  try{ if(b.dataset.act==='gx-pdf-dia') await gxPdfDia(S.gx.dia||hojeStr()); else await gxPdfMes(S.gx.cp||hojeStr().slice(0,7)); toast('PDF baixado.'); }
  catch(e){ console.warn('[pdf gestor]',e); toast('Não foi possível gerar o PDF: '+((e&&e.message)||e)); }
  finally{ delete b.dataset.gerando; b.disabled=false; b.innerHTML=t0; } },true);
