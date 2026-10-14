/* Painel Colafix · 14-tv-melhor.js — telas de TV mais legíveis (14/10, pedido depois da foto da TV da fábrica).
   1) Encaixe: no modo TV, a tela é reduzida sozinha até caber inteira (nada cortado embaixo ou do lado).
   2) Previsto × Realizado na TV: sem as letras miúdas, nome, números e situação maiores, sem o submenu.
   3) Rodízio (Telas de TV): tempos de 5 e 10 s e "começar a passar sozinha" ao abrir o painel neste aparelho. */
"use strict";
function tvEncaixa(){ const v=document.getElementById('view'); if(!v) return; const tv=document.body.classList.contains('tv')&&S.view!=='tvsplit';
  if(!tv){ if(v.style.zoom) v.style.zoom=''; return; }
  v.style.zoom=''; let z=1;
  for(let i=0;i<4;i++){ const de=document.documentElement, f=Math.min(innerHeight/de.scrollHeight,innerWidth/de.scrollWidth); if(f>=0.997) break; z=Math.max(0.45,z*f*0.998); v.style.zoom=String(z); } }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ requestAnimationFrame(tvEncaixa); }catch(e){} return x; }; }
addEventListener('resize',()=>tvEncaixa()); setInterval(()=>{ if(document.body.classList.contains('tv')) tvEncaixa(); },1500);
/* fundo escuro na TV: usa o tema escuro do painel só enquanto estiver no modo TV (cada aparelho escolhe) */
function tvEscuro(){ try{ return localStorage.getItem('colafix.tvEscuro')==='1'; }catch(e){ return false; } }
let tvTemaNosso=false;
function tvTema(){ const de=document.documentElement, quer=document.body.classList.contains('tv')&&tvEscuro();
  if(quer&&de.getAttribute('data-theme')!=='dark'){ de.setAttribute('data-theme','dark'); tvTemaNosso=true; }
  else if(!quer&&tvTemaNosso){ de.removeAttribute('data-theme'); tvTemaNosso=false; } }
{ const _r=render; render=function(){ const x=_r.apply(this,arguments); try{ tvTema(); }catch(e){} return x; }; }
setInterval(()=>{ try{ tvTema(); }catch(e){} },700);
document.addEventListener('change',ev=>{ const t=ev.target; if(!(t.dataset&&t.dataset.act==='tv-escuro')) return; try{ localStorage.setItem('colafix.tvEscuro',t.checked?'1':'0'); }catch(e){} tvTema(); toast(t.checked?'Fundo escuro ligado nesta TV (vale no modo TV).':'Fundo escuro desligado nesta TV.'); });
/* "Nível dos silos" (a tela só de consulta) também passa na TV: quem tem Telas de TV pode abrir */
{ const _vo=viewOk; viewOk=function(v){ if(v==='silosver'){ try{ const p=acsP(); if(p&&(p.mods||[]).includes('telas')) return true; }catch(e){} } return _vo.apply(this,arguments); }; }
{ const _sr=spRota; spRota=function(v){ if(v==='silosver') return vSilosVer(); return _sr.apply(this,arguments); }; }
if(!APR_TELAS.some(t=>t.k==='silosver')){ const i=APR_TELAS.findIndex(t=>t.k==='silos'); APR_TELAS.splice(i<0?APR_TELAS.length:i+1,0,{k:'silosver',v:'silosver',nome:'Nível dos silos',d:'Os tanques de cimento e areia em tamanho grande, com o nível e o aviso de crítico. Só consulta.',cor:'#3E7A63',on:true}); }
/* começar a passar sozinha neste aparelho */
function aprAuto(){ try{ return localStorage.getItem('colafix.apresAuto')==='1'; }catch(e){ return false; } }
document.addEventListener('change',ev=>{ const t=ev.target; if(!(t.dataset&&t.dataset.act==='apr-auto')) return; try{ localStorage.setItem('colafix.apresAuto',t.checked?'1':'0'); }catch(e){} toast(t.checked?'Este aparelho vai começar a passar as telas sozinho.':'Este aparelho não vai mais começar sozinho.'); });
{ let feito=false; const t=setInterval(()=>{ if(feito) return clearInterval(t); try{ if(!S.acs||!S.acs.pronto||!S.db||!acsP()) return; feito=true; clearInterval(t);
    if(!aprAuto()||S.apres.on) return; const lista=aprTelas().filter(aprSel); if(lista.length) setTimeout(()=>aprIniciar(lista),1500); }catch(e){} },500); }
document.head.insertAdjacentHTML('beforeend',`<style id="tv-melhor-css">
body.tv .navsub{display:none!important}
body.tv .sv-ts{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:20px!important}
body.tv .sv-t{padding:16px 12px!important}
body.tv .sv-tk svg{width:auto!important;height:clamp(150px,22vh,260px)!important;max-width:100%}
body.tv .sv-n{font-size:clamp(18px,1.6vw,30px)!important;font-weight:700}
body.tv .sv-q{font-size:clamp(34px,3.2vw,60px)!important}
body.tv .sv-p{font-size:clamp(16px,1.3vw,24px)!important}
body.tv .sv-gh{font-size:clamp(16px,1.3vw,24px)}
:root[data-theme="dark"] .rtv{--rt-bg:#0F171B;--rt-card:#172127;--rt-card2:#1B272D;--rt-line:#2A3940;--rt-ink:#F1F5F7;--rt-mut:#A9B8BF;--rt-track:#2B3A41;--rt-ok:#3CC274;--rt-bad:#FF6B5E;--rt-warn:#F2B33D;--rt-blue:#62B6DC;
  --surface:#172127;--surface-2:#1B272D;--muted:#A9B8BF;--ink:#F1F5F7;--ink-2:#D3DDE1;--line-2:#24323A;--teal:#62B6DC;--teal-strong:#8FCBE7;--crit:#FF6B5E;--crit-ink:#FF8F86;--ok:#3CC274;--ok-ink:#62D893;--sunken:#2B3A41;background:var(--rt-bg)}
:root[data-theme="dark"] body.tv{background:#0F171B}
html:root[data-theme="dark"] body.tv #view img[alt="Colafix" i],html:root[data-theme="dark"] body.tv #view img[src*="logo" i]{background:#FFFFFF;border-radius:8px;padding:4px 8px}
html:root[data-theme="dark"] body:has(.tv2){background:#15191B!important}
html:root[data-theme="dark"] .tv2{color:#EEF1F2} html:root[data-theme="dark"] .tv2-top{border-bottom-color:#2B3337} html:root[data-theme="dark"] .tv2-ey{color:#8FCBE7}
html:root[data-theme="dark"] .tv2-col{background:#1E2427!important} html:root[data-theme="dark"] body.tv .tv2-col{border-color:#333C41}
html:root[data-theme="dark"] .tv2-st,html:root[data-theme="dark"] .tv2-nm,html:root[data-theme="dark"] .tv2-qq,html:root[data-theme="dark"] .tv2-m{color:#CBD3D6} html:root[data-theme="dark"] .tv2-qq b{color:#FFFFFF}
html:root[data-theme="dark"] .tv2-now,html:root[data-theme="dark"] .tv2-nx{border-color:#2B3337} html:root[data-theme="dark"] .tv2-vz,html:root[data-theme="dark"] .tv2-cap,html:root[data-theme="dark"] .tv2-ft,html:root[data-theme="dark"] .tv2-nx small{color:#A3AEB3}
html:root[data-theme="dark"] .tv2-pb{background:#2A3237} html:root[data-theme="dark"] .tv2-lp{color:#E1C07E;background:#352D1C}
html:root[data-theme="dark"] .tv2-pr{background:#43211E;color:#FF948B} html:root[data-theme="dark"] .tv2-pr.p2{background:#3D2E10;color:#F4C766} html:root[data-theme="dark"] .tv2-pr.p3{background:#35301A;color:#E8D27A} html:root[data-theme="dark"] .tv2-pr.p4{background:#2A3237;color:#CBD3D6}
html:root[data-theme="dark"] .tv2-x{border-color:#333C41;background:#1E2427;color:#CBD3D6} html:root[data-theme="dark"] .tv2-x:hover{background:#2A3237;color:#FFFFFF}
html:root[data-theme="dark"] .tv2-top img:first-of-type{background:#FFFFFF;border-radius:8px;padding:4px 8px}
/* a TV da fábrica (.tv2) é clara por padrão; com "Fundo escuro na TV" ligado, usa o tema escuro do painel */
html:root[data-theme="dark"]:has(.tv2){color-scheme:dark; --ground:#15191B; --surface:#1E2427; --surface-2:#232A2E; --sunken:#2A3237; --ink:#EEF1F2; --ink-2:#CBD3D6; --muted:#9FAAAF; --faint:#6E7A80; --line:#333C41; --line-2:#2B3337; --teal:#5FA3C2; --teal-strong:#8CC2DA; --teal-tint:#23343D; --teal-wash:#1F3039; --nav:#0F2A38; --nav-ink:#D5E2E8; --nav-muted:#8FA9B6; --ok:#6FA585; --ok-ink:#8DC4A3; --ok-tint:#203129; --warn:#C9A152; --warn-ink:#E1C07E; --warn-tint:#352D1C; --crit:#C9736A; --crit-ink:#E59C94; --crit-tint:#3A2422; --tank:#2A3237; --tank-line:#9FAAAF; --leg:#6E7A80; --shadow:0 2px 8px rgba(0,0,0,.35); --logo-bg:#FFFFFF; --logo-pad:3px 6px;}
:root[data-theme="dark"] .rtv-t,:root[data-theme="dark"] .rtv-cv{background:var(--rt-card)!important}
:root[data-theme="dark"] .rtv-ey{color:#8FCBE7}
:root[data-theme="dark"] .rtv-logo{background:#FFFFFF;border-radius:8px;padding:4px 8px}
:root[data-theme="dark"] .rtv-chip{background:#24323A;color:#D3DDE1}
:root[data-theme="dark"] .st-ok .rtv-chip,:root[data-theme="dark"] .rtv-chip.st-ok,:root[data-theme="dark"] .rtv .rit-cvt .pill.ok{background:#173A28;color:#66DA96}
:root[data-theme="dark"] .st-warn .rtv-chip,:root[data-theme="dark"] .rtv-chip.st-warn,:root[data-theme="dark"] .rtv .rit-cvt .pill.warn{background:#3D2E10;color:#F4C766}
:root[data-theme="dark"] .st-crit .rtv-chip,:root[data-theme="dark"] .rtv-chip.st-crit,:root[data-theme="dark"] .rtv .rit-cvt .pill.crit{background:#43211E;color:#FF948B}
:root[data-theme="dark"] .rtv .neg,:root[data-theme="dark"] .rtv .rit-cvk.neg b{color:#FF7D72}
:root[data-theme="dark"] .rtv .pos,:root[data-theme="dark"] .rtv .rit-cvk.pos b{color:#62D893}
:root[data-theme="dark"] .rtv-tl i.ok,:root[data-theme="dark"] .rtv-tl i.ok.hj,:root[data-theme="dark"] .rtv .rit-prog i{background:#62B6DC}
:root[data-theme="dark"] .rtv-al{background:#3A2F18;border-color:#5C4A22;color:#F4D59E}
:root[data-theme="dark"] .rtv-al.crit{background:#3E2220;border-color:#6A3430;color:#FFB6AF}
body.tv .rtv .rtv-pl{display:none!important}
body.tv .rtv .rtv-fig em{display:none!important}
body.tv .rtv .rtv-ln{font-size:clamp(17px,1.2vw,24px)!important;font-weight:700}
body.tv .rtv .rtv-fig b{font-size:clamp(26px,1.95vw,38px)!important;line-height:1.05}
body.tv .rtv .rtv-fig span{font-size:clamp(13px,.9vw,18px)!important;white-space:nowrap}
body.tv .rtv .rtv-chip{font-size:clamp(12px,.85vw,16px)!important}
body.tv .rtv .rtv-al span{font-size:clamp(14px,1vw,20px)!important}
/* gerado: tv-escuro (testes/gera-tv-escuro.py) */
html:root[data-theme="dark"] body.dbmon{background:#263035!important}
html:root[data-theme="dark"] .mcol{border:1px solid #34404A}
html:root[data-theme="dark"] .mcol header b{color:#73C1E8}
html:root[data-theme="dark"] .mdw{color:#8AB6D1}
html:root[data-theme="dark"] .mdh{background:#1E2427}
html:root[data-theme="dark"] .mdt{color:#73C1E8}
html:root[data-theme="dark"] .mds{color:#A7B2B7}
html:root[data-theme="dark"] .mds b{color:#8AB6D1}
html:root[data-theme="dark"] .mddia{background:#263035}
html:root[data-theme="dark"] .mddia button{color:#A7B2B7}
html:root[data-theme="dark"] .mddia button[aria-pressed=true]{background:#1E2427;color:#73C1E8}
html:root[data-theme="dark"] .mddia input{color:#73C1E8}
html:root[data-theme="dark"] .mdk{background:#263035}
html:root[data-theme="dark"] .mdk b{color:#73C1E8}
html:root[data-theme="dark"] .mdk span{color:#A7B2B7}
html:root[data-theme="dark"] .mdk.r{background:#431414}
html:root[data-theme="dark"] .mdk.r b{color:#EA7171}
html:root[data-theme="dark"] .mdk.g{background:#183E29}
html:root[data-theme="dark"] .mdk.g b{color:#78E2A3}
html:root[data-theme="dark"] .mdclock{color:#73C1E8}
html:root[data-theme="dark"] .mdsair{background:#1E2427;border:1px solid #34404A;color:#A7B2B7}
html:root[data-theme="dark"] .mdtab th{color:#A7B2B7}
html:root[data-theme="dark"] .mdr td{background:#1E2427;border-top:1px solid #34404A;border-bottom:1px solid #34404A}
html:root[data-theme="dark"] .mdr td:first-child{border-left:1px solid #34404A}
html:root[data-theme="dark"] .mdr td:last-child{border-right:1px solid #34404A}
html:root[data-theme="dark"] .mdn{color:#A7B2B7}
html:root[data-theme="dark"] .mdsub{color:#A7B2B7}
html:root[data-theme="dark"] .mdstp i{background:#2E383D}
html:root[data-theme="dark"] .mdstp i.on{background:#144327}
html:root[data-theme="dark"] .mdl td{color:#73C1E8}
html:root[data-theme="dark"] .mdl span{color:#A7B2B7}
html:root[data-theme="dark"] .mdvz{background:#1E2427;color:#A7B2B7}
html:root[data-theme="dark"] .mdr.crit.pisca{--pb:#431414}
html:root[data-theme="dark"] .mdr.warn.pisca{--pb:#433214}
html:root[data-theme="dark"] .mecol{background:#1E2427}
html:root[data-theme="dark"] .mecol header{border-top:5px solid #29617A;border-bottom:1px solid #34404A}
html:root[data-theme="dark"] .mecol header b{color:#73C1E8}
html:root[data-theme="dark"] .mecol header span{color:#A7B2B7}
html:root[data-theme="dark"] .mei{border-bottom:1px solid #34404A}
html:root[data-theme="dark"] .mea span{color:#A7B2B7}
html:root[data-theme="dark"] .mep{color:#A7B2B7}
html:root[data-theme="dark"] .mep b{color:#8AB6D1}
html:root[data-theme="dark"] .mesub{color:#A7B2B7}
html:root[data-theme="dark"] .mei.crit.pisca{--pb:#431414}
html:root[data-theme="dark"] .mei.warn.pisca{--pb:#433214}
html:root[data-theme="dark"] .tv2{color:#F1F4F5}
html:root[data-theme="dark"] .tv2-top{border-bottom:1px solid #68583C}
html:root[data-theme="dark"] .tv2-ey{color:#71C4EA}
html:root[data-theme="dark"] .tv2-col{background:#1E2427}
html:root[data-theme="dark"] .tv2-st{color:#C9D2D6}
html:root[data-theme="dark"] .tv2-now{border-top:1px solid #67583C;border-bottom:1px solid #67583C}
html:root[data-theme="dark"] .tv2-vz{color:#A7B2B7}
html:root[data-theme="dark"] .tv2-cap{color:#A7B2B7}
html:root[data-theme="dark"] .tv2-nm{color:#C9D2D6}
html:root[data-theme="dark"] .tv2-pb{background:#382F1F}
html:root[data-theme="dark"] .tv2-qq{color:#C9D2D6}
html:root[data-theme="dark"] .tv2-qq b{color:#F1F4F5}
html:root[data-theme="dark"] .tv2-m{color:#C9D2D6}
html:root[data-theme="dark"] .tv2-nx{border-bottom:1px solid #69593A}
html:root[data-theme="dark"] .tv2-nx small{color:#C9D2D6}
html:root[data-theme="dark"] .tv2-lp{color:#D0B38B;background:#3F3318}
html:root[data-theme="dark"] .tv2-pr{background:#431414;color:#D88683}
html:root[data-theme="dark"] .tv2-pr.p2{background:#433414;color:#EBBF70}
html:root[data-theme="dark"] .tv2-pr.p3{background:#433814;color:#E2CB78}
html:root[data-theme="dark"] .tv2-pr.p4{background:#263035;color:#A7B2B7}
html:root[data-theme="dark"] .tv2-ft{color:#A7B2B7}
html:root[data-theme="dark"] /* ===== padrão de todas as telas de TV: fundo branco,html:root[data-theme="dark"] cabeçalho igual,html:root[data-theme="dark"] cartões iguais ===== */
body.tv,html:root[data-theme="dark"] body.dbmon{background:#1E2427!important}
html:root[data-theme="dark"] body.tv .tv2-col{border:1px solid #34404A}
html:root[data-theme="dark"] .tv2-x{border:1px solid #34404A;background:#1E2427;color:#A7B2B7}
html:root[data-theme="dark"] .tv2-x:hover{background:#263035;color:#F1F4F5}
html:root[data-theme="dark"] body.dbmon .mdh{border-bottom:1px solid #34404A}
html:root[data-theme="dark"] body.dbmon .mecol,html:root[data-theme="dark"] body.dbmon .mcol{background:#1E2427;border:1px solid #34404A}
html:root[data-theme="dark"] body.dbmon .mdr td{background:#1E2427}
html:root[data-theme="dark"] .mdb .mdsair[aria-pressed=true]{background:#433414;border-color:#7A6029}
html:root[data-theme="dark"] .mdb .mei:hover{background:#1D333A}
@keyframes dburgpEsc{0%,100%{background:#1E2427}50%{background:var(--pb)}}
@keyframes mdpiscaEsc{0%,100%{background:#1E2427}50%{background:var(--pb)}}
html:root[data-theme="dark"] .mdr.pisca td{animation-name:mdpiscaEsc}
@keyframes mepiscaEsc{0%,100%{background:#1E2427}50%{background:var(--pb)}}
html:root[data-theme="dark"] .mei.pisca{animation-name:mepiscaEsc}
@keyframes rapInEsc{0%,100%{background:#1E2427}50%{background:var(--pb)}}
html:root[data-theme="dark"] .rap-bd.in{animation-name:rapInEsc}
/* fim do gerado */
</style>`);
/* ===FIM TV MELHOR=== */
