/* Painel Colafix · treino.js (24/10) — MODO TREINAMENTO (pedido 48).
   Carregado logo depois do painel-firebase.js. Só faz alguma coisa quando o aparelho está em treinamento
   (localStorage colafix.treino = '1', ligado pelo menu do usuário — js/51-treino.js).
   Em treinamento o painel continua LENDO o banco de verdade, mas tudo o que grava (set, update, delete, add, transações,
   lotes, arquivos, criar login) fica só na memória deste aparelho: as telas mostram como se tivesse gravado, e
   recarregar a página ou sair do treinamento apaga tudo. Ninguém mais vê. */
(function(){
  'use strict';
  try{ const q=new URLSearchParams(location.search).get('treino'); if(q==='1') localStorage.setItem('colafix.treino','1'); if(q==='0') localStorage.removeItem('colafix.treino'); }catch(e){} /* ?treino=1 liga (útil no posto, oficina e celulares, que não têm o menu do usuário) */
  let on=false; try{ on=localStorage.getItem('colafix.treino')==='1'; }catch(e){}
  window.TREINO={on,n:0};
  if(!on||!window.claude) return;
  const OV=new Map(), subs=new Set();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const ehObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  function junta(a,b){ const o=ehObj(a)?clone(a):{}; for(const k in b){ const v=b[k]; if(v===undefined) continue; o[k]=ehObj(v)&&ehObj(o[k])?junta(o[k],v):clone(v); } return o; }
  let avisaT=null; function muda(){ window.TREINO.n++; clearTimeout(avisaT); avisaT=setTimeout(()=>subs.forEach(f=>{ try{ f(); }catch(e){} }),0); }
  const novoId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  const pai=p=>p.slice(0,p.lastIndexOf('/'));
  let DB0=null; const dbReal=async()=>DB0||(DB0=await useReal('db'));
  async function base(path){ if(OV.has(path)){ const x=OV.get(path); return x.del?null:clone(x.d); } try{ const g=await (await dbReal()).doc(path).get(); return g.exists?g.data():null; }catch(e){ return null; } }
  async function grava(path,d,modo){ if(modo==='del'){ OV.set(path,{del:true}); muda(); return; }
    if(modo==='set') OV.set(path,{d:clone(d)}); else { const b=await base(path); OV.set(path,{d:junta(b||{},d)}); } muda(); }
  function snap(path,real){ const x=OV.get(path); const id=path.slice(path.lastIndexOf('/')+1);
    if(!x) return real; return {id,exists:!x.del,data:()=>x.del?undefined:clone(x.d),ref:Doc(path),metadata:{fromCache:false,hasPendingWrites:false}}; }
  function Doc(path,rd){ const R=()=>rd||(DB0&&DB0.doc(path));
    return { id:path.slice(path.lastIndexOf('/')+1), path,
      get:async()=>{ if(OV.has(path)) return snap(path); return (await dbReal()).doc(path).get(); },
      set:(d,o)=>grava(path,d,o&&o.merge?'merge':'set'), update:d=>grava(path,d,'merge'), delete:()=>grava(path,null,'del'),
      onSnapshot:(ok,err,opts)=>{ let ult=null, vivo=true; const emite=()=>{ if(!vivo) return; const s=OV.has(path)?snap(path):ult; if(s) ok(s); };
        subs.add(emite); let un=()=>{}; const r=R(); if(r){ un=r.onSnapshot(s=>{ ult=s; emite(); },err,opts); } else { dbReal().then(db=>{ if(vivo) un=db.doc(path).onSnapshot(s=>{ ult=s; emite(); },err,opts); }); }
        if(OV.has(path)) setTimeout(emite,0); return ()=>{ vivo=false; subs.delete(emite); try{ un(); }catch(e){} }; },
      acquire:async()=>({acquired:true}), release:async()=>{} }; }
  const val=(o,c)=>String(c).split('.').reduce((a,k)=>a==null?a:a[k],o);
  function bate(d,f){ const v=val(d,f[0]), x=f[2]; switch(f[1]){ case '==':return v===x; case '!=':return v!==x; case '<':return v<x; case '<=':return v<=x; case '>':return v>x; case '>=':return v>=x;
    case 'in':return Array.isArray(x)&&x.includes(v); case 'not-in':return Array.isArray(x)&&!x.includes(v); case 'array-contains':return Array.isArray(v)&&v.includes(x); case 'array-contains-any':return Array.isArray(v)&&Array.isArray(x)&&x.some(y=>v.includes(y)); } return true; }
  function junta2(path,docs,Q){ const ps=new Set(); let out=[]; docs.forEach(s=>{ const p=path+'/'+s.id; ps.add(p); if(!OV.has(p)) { out.push(s); return; } const x=OV.get(p); if(x.del) return; const z=snap(p); if(Q.f.every(f=>bate(z.data(),f))) out.push(z); });
    OV.forEach((x,p)=>{ if(x.del||ps.has(p)||pai(p)!==path) return; if(Q.f.every(f=>bate(x.d,f))) out.push(snap(p)); });
    if(Q.o.length) out.sort((a,b)=>{ for(const [c,dir] of Q.o){ const x=val(a.data(),c), y=val(b.data(),c); if(x===y) continue; const r=(x==null?-1:y==null?1:x<y?-1:1); return dir==='desc'?-r:r; } return 0; });
    if(Q.l) out=out.slice(0,Q.l); return {docs:out,size:out.length,empty:!out.length,forEach:f=>out.forEach(f)}; }
  function Query(rq,path,Q){ Q=Q||{f:[],o:[],l:0};
    return { orderBy:(c,d)=>Query(rq.orderBy(c,d),path,{f:Q.f,o:Q.o.concat([[c,d||'asc']]),l:Q.l}), where:(c,op,v)=>Query(rq.where(c,op,v),path,{f:Q.f.concat([[c,op,v]]),o:Q.o,l:Q.l}), limit:n=>Query(rq.limit(n),path,{f:Q.f,o:Q.o,l:n}),
      get:async()=>{ const s=await rq.get(); return junta2(path,s.docs,Q); },
      onSnapshot:(ok,err)=>{ let ult=null, vivo=true; const emite=()=>{ if(vivo&&ult) ok(junta2(path,ult.docs,Q)); }; subs.add(emite); const un=rq.onSnapshot(s=>{ ult=s; emite(); },err); return ()=>{ vivo=false; subs.delete(emite); try{ un(); }catch(e){} }; },
      add:async d=>{ const p=path+'/'+novoId(); await grava(p,d,'set'); return Doc(p); },
      doc:id=>Doc(path+'/'+(id||novoId())) }; }
  const useReal=window.claude.use.bind(window.claude);
  let TDB=null; function treinoDB(db){ DB0=db; return TDB||(TDB={ collection:p=>Query(db.collection(p),p), doc:p=>Doc(p,db.doc(p)), _treino:true }); }
  /* arquivos: na memória */
  const ARQ=new Map(); let AS0=null;
  const tAssets=a=>({ upload:async(blob,opts)=>{ const id='treino-'+novoId(); ARQ.set(id,{b:new Uint8Array(await blob.arrayBuffer()),t:(opts&&opts.type)||blob.type||''}); return {id}; },
    bytes:async id=>ARQ.has(id)?ARQ.get(id).b:a.bytes(id), gravarComId:async(id,bytes,tipo)=>{ ARQ.set(id,{b:bytes,t:tipo||''}); }, list:a.list });
  /* acesso direto ao Firestore (transações e lotes do painel): grava na memória também */
  const fsReal=window.claude._fs();
  const refDe=p=>({ path:p, id:p.slice(p.lastIndexOf('/')+1), get:()=>Doc(p).get(), set:(d,o)=>grava(p,d,o&&o.merge?'merge':'set'), update:d=>grava(p,d,'merge'), delete:()=>grava(p,null,'del'), onSnapshot:(...a)=>Doc(p).onSnapshot(...a) });
  const FSX={ doc:p=>refDe(p), collection:p=>Object.assign(Query(fsReal.collection(p),p),{doc:id=>refDe(p+'/'+(id||novoId()))}),
    runTransaction:async fn=>{ const fila=[]; const t={ get:async ref=>Doc(ref.path).get(), set:(ref,d,o)=>{ fila.push([ref.path,d,o&&o.merge?'merge':'set']); return t; }, update:(ref,d)=>{ fila.push([ref.path,d,'merge']); return t; }, delete:ref=>{ fila.push([ref.path,null,'del']); return t; } };
      const r=await fn(t); for(const [p,d,m] of fila) await grava(p,d,m); return r; },
    batch:()=>{ const fila=[]; const b={ set:(ref,d,o)=>{ fila.push([ref.path,d,o&&o.merge?'merge':'set']); return b; }, update:(ref,d)=>{ fila.push([ref.path,d,'merge']); return b; }, delete:ref=>{ fila.push([ref.path,null,'del']); return b; }, commit:async()=>{ for(const [p,d,m] of fila) await grava(p,d,m); } }; return b; } };
  window.claude.use=async nome=>{ const r=await useReal(nome); if(nome==='db'&&r) return treinoDB(r); if(nome==='assets'&&r){ AS0=AS0||tAssets(r); return AS0; } return r; };
  window.claude.assetBytes=async id=>ARQ.has(id)?ARQ.get(id).b:(await useReal('assets')).bytes(id);
  if(window.claude._assets) window.claude._assets=tAssets(window.claude._assets);
  window.claude._fs=()=>FSX;
  window.claude.criarUsuario=async()=>{ throw {code:'treino',message:'No modo treinamento não dá para criar login.'}; };
  window.TREINO.gravados=()=>OV.size;
})();
