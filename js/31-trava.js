/* Painel Colafix · 31-trava.js (22/10)
   1) Computador de chamados / posto TRAVADO: para sair da conta é preciso a senha de administrador
      (config/geral.travaSenha {s: sal, h: sha256(sal+senha), em, por}); a administradora define em Manutenção › Configurações.
   2) Dois técnicos no mesmo chamado: quem bipa depois pode "Entrar junto (2º técnico)" → exec.ajudante {nome, cracha, em}. */
"use strict";
function tecNomes(c){ const E=(c&&c.exec)||{}; return [E.tecnico,E.ajudante&&E.ajudante.nome].filter(Boolean).join(' e '); }
function tecEh(c,nome){ const E=(c&&c.exec)||{}, n=mxNorm(nome||''); return !!n&&((E.tecnico&&mxNorm(E.tecnico)===n)||(E.ajudante&&E.ajudante.nome&&mxNorm(E.ajudante.nome)===n)); }

/* ---------- 2º técnico ---------- */
window.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cq-junto"]'); if(!b) return; ev.stopImmediatePropagation(); ev.preventDefault();
  const T=S.tt, c=manDoc(+b.dataset.n); if(!c||!T||!T.p||T.enviando) return; if(tecEh(c,T.p.nome)){ ttVoltar(); return; }
  if(c.exec&&c.exec.ajudante&&c.exec.ajudante.nome){ T.msg='Este chamado já tem dois técnicos.'; render(); return; }
  T.enviando=true; render();
  try{ const agora=new Date().toISOString(), E=Object.assign({},c.exec||{},{ajudante:{nome:T.p.nome,cracha:T.p.codigo||null,em:agora}});
    const hist=(c.hist||[]).concat([{em:agora,por:S.uid||null,o:'Segundo técnico entrou no conserto: '+T.p.nome+(T.p.codigo?' (crachá)':'')}]).slice(-200);
    await S.db.doc('chamados/'+c._id).update({exec:E,hist}); c.exec=E; c.hist=hist; T.enviando=false;
    if(T.p.codigo) T.recente[T.p.codigo]=Date.now()+15000; toast('Chamado '+manNum(c.numero)+': '+T.p.nome+' entrou junto com '+(E.tecnico||'o técnico')+'.'); ttVoltar(); }
  catch(e){ T.enviando=false; console.warn('[2º técnico]',e); T.msg='Não foi possível registrar agora. Confira a internet e tente de novo.'; render(); } },true);

/* ---------- trava do computador ---------- */
const TRAVA_PERFIS=['chamados','posto'];
function travaOn(){ const t=S.cfg&&S.cfg.travaSenha; if(!t||!t.h) return false; const p=S.acs&&S.acs.doc&&S.acs.doc.perfil; return TRAVA_PERFIS.includes(p)||(typeof poOn==='function'&&poOn()&&!(S.acs&&S.acs.dono)); }
/* SHA-256 em JS puro (funciona também fora de https) */
function travaSha(txt){ const b=new TextEncoder().encode(txt), K=[], H=[]; let n=2;
  const pr=x=>{ for(let i=2;i*i<=x;i++) if(x%i===0) return false; return true; }, fr=x=>((x-Math.floor(x))*4294967296)|0;
  for(let k=0;k<64;){ if(pr(n)){ if(k<8) H[k]=fr(Math.pow(n,1/2)); K[k++]=fr(Math.pow(n,1/3)); } n++; }
  const l=b.length, m=new Uint8Array(((l+9+63)>>6)<<6); m.set(b); m[l]=0x80; const bits=l*8; m[m.length-4]=bits>>>24; m[m.length-3]=bits>>>16; m[m.length-2]=bits>>>8; m[m.length-1]=bits;
  const r=(x,y)=>(x>>>y)|(x<<(32-y)), W=new Array(64);
  for(let o=0;o<m.length;o+=64){ for(let i=0;i<16;i++) W[i]=(m[o+i*4]<<24)|(m[o+i*4+1]<<16)|(m[o+i*4+2]<<8)|m[o+i*4+3];
    for(let i=16;i<64;i++){ const s0=r(W[i-15],7)^r(W[i-15],18)^(W[i-15]>>>3), s1=r(W[i-2],17)^r(W[i-2],19)^(W[i-2]>>>10); W[i]=(W[i-16]+s0+W[i-7]+s1)|0; }
    let [a,bb,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){ const S1=r(e,6)^r(e,11)^r(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+K[i]+W[i])|0, S0=r(a,2)^r(a,13)^r(a,22), mj=(a&bb)^(a&c)^(bb&c), t2=(S0+mj)|0; h=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0; }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+bb)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0; H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0; }
  return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join(''); }
async function travaHash(sal,senha){ return travaSha(sal+'|'+senha); }
let _travaLib=0;
function travaSair(){ _travaLib=Date.now(); try{ ttCamDesliga(); }catch(e){} const x=document.createElement('button'); x.dataset.act='sair-conta'; x.hidden=true; document.body.appendChild(x); x.click(); x.remove(); }
function travaPede(){ if(document.getElementById('trava-m')) return; const d=document.createElement('div'); d.id='trava-m'; d.className='trava-m'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','trava-t');
  d.innerHTML=`<form class="trava-c"><h2 id="trava-t">Computador travado</h2><p>Para sair deste computador, digite a senha de administrador.</p><label for="trava-s">Senha de administrador</label><input id="trava-s" type="password" autocomplete="off" required><p class="trava-e" role="alert"></p><div class="trava-b"><button type="button" class="trava-x">Cancelar</button><button type="submit" class="trava-ok">Sair</button></div></form>`;
  document.body.appendChild(d); const i=d.querySelector('#trava-s'); setTimeout(()=>i.focus(),30);
  const fecha=()=>{ d.remove(); try{ if(typeof crCapPoe==='function') crCapPoe(); }catch(e){} };
  d.querySelector('.trava-x').onclick=fecha; d.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); fecha(); } e.stopPropagation(); });
  d.querySelector('form').onsubmit=async e=>{ e.preventDefault(); const t=S.cfg.travaSenha||{}; let okk=false; try{ okk=(await travaHash(t.s||'',i.value))===t.h; }catch(er){}
    if(!okk){ d.querySelector('.trava-e').textContent='Senha errada.'; i.value=''; i.focus(); return; } fecha(); travaSair(); }; }
window.addEventListener('click',ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="cq-sair"],[data-act="po-sair"],[data-act="sair-conta"]'); if(!b||!travaOn()) return; if(Date.now()-_travaLib<3000) return;
  ev.stopImmediatePropagation(); ev.preventDefault(); travaPede(); },true);

/* ---------- Manutenção › Configurações: definir a senha (só a administradora) ---------- */
{ const _v=S.extViews.mancfg; if(_v){ S.extViews.mancfg=function(){ let h=_v.apply(this,arguments); if(!dbMaster()) return h; const t=S.cfg.travaSenha;
  return h+`<section class="card trava-cfg"><h2>Travar os computadores da fábrica (chamados, posto e oficina)</h2><p class="sub" style="margin:4px 0 10px">Com a senha definida, ninguém sai do painel nesses computadores sem a senha de administrador (botão Sair). Para travar o computador inteiro, abra o navegador em modo quiosque — veja o passo a passo no guia.</p>
   <div class="trava-row"><label for="trava-n">Senha de administrador (mínimo 4)</label><input id="trava-n" type="password" class="txt" autocomplete="new-password"><button class="btn" data-act="trava-salvar">${t&&t.h?'Trocar a senha':'Definir a senha'}</button>${t&&t.h?'<button class="btn sec" data-act="trava-tirar">Tirar a trava</button>':''}</div>
   <p class="sub" style="margin:8px 0 0">${t&&t.h?'Trava ligada'+(t.em?' desde '+new Date(t.em).toLocaleDateString('pt-BR'):'')+'.':'Trava desligada: qualquer pessoa pode sair do computador de chamados.'}</p></section>`; }; } }
document.addEventListener('click',async ev=>{ const b=ev.target.closest&&ev.target.closest('[data-act="trava-salvar"],[data-act="trava-tirar"]'); if(!b||!dbMaster()) return;
  if(b.dataset.act==='trava-tirar'){ try{ await S.db.doc('config/geral').update({travaSenha:null}); S.cfg.travaSenha=null; toast('Trava tirada.'); }catch(e){ toast('Não foi possível salvar.'); } render(); return; }
  const i=document.getElementById('trava-n'), v=String(i&&i.value||''); if(v.length<4){ toast('A senha precisa ter pelo menos 4 caracteres.'); return; }
  const s=Math.random().toString(36).slice(2,10)+Date.now().toString(36), t={s,h:await travaHash(s,v),em:new Date().toISOString(),por:S.uid||null};
  try{ await S.db.doc('config/geral').update({travaSenha:t}); S.cfg.travaSenha=t; toast('Senha salva. O computador de chamados, o posto e o da oficina ficam travados.'); }catch(e){ toast('Não foi possível salvar.'); } render(); });
document.head.insertAdjacentHTML('beforeend',`<style id="trava-css">
.trava-m{position:fixed;inset:0;z-index:3000;background:rgba(14,30,40,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Archivo,'Segoe UI',system-ui,sans-serif}
.trava-c{background:#fff;color:#143F54;border-radius:18px;padding:24px 26px;width:min(440px,100%);display:flex;flex-direction:column;gap:8px}.trava-c h2{margin:0;font-size:24px}.trava-c p{margin:0;color:#55666F}
.trava-c label{font-weight:700;font-size:14px;margin-top:6px}.trava-c input{font:inherit;font-size:20px;border:2px solid #E3E8EC;border-radius:12px;padding:10px 12px}.trava-e{color:#B5473F!important;font-weight:700;min-height:1.2em}
.trava-b{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}.trava-b button{font:inherit;font-size:17px;font-weight:700;border-radius:12px;padding:10px 20px;cursor:pointer;border:2px solid #E3E8EC;background:#fff;color:#143F54}.trava-b .trava-ok{background:#143F54;border-color:#143F54;color:#fff}
.trava-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.trava-row label{font-weight:600}.trava-row input{max-width:220px}
</style>`);
