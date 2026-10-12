/* ===================== ONEDRIVE (Microsoft 365) =====================
   Login Microsoft pelo método oficial para sites (OAuth 2.0 + PKCE, sem biblioteca) e envio/listagem de arquivos pelo Microsoft Graph.
   Configuração (a dona preenche em RH → Fichas): config/geral.onedrive = { ativo, clientId, tenant, pasta, link }
     clientId  = "ID do aplicativo (cliente)" do registro no Microsoft Entra
     tenant    = "ID do diretório (locatário)" (ou vazio = qualquer conta corporativa)
     pasta     = pasta no OneDrive de quem conectar (ex.: "Fichas EPI e Uniforme")
     link      = opcional: link de compartilhamento de uma pasta da equipe (aí todos usam a mesma pasta)
   O login fica guardado só neste aparelho (localStorage 'od.sessao'). */
(function(){ const P=window.Painel; if(!P) return;
  const ESCOPO='offline_access User.Read Files.ReadWrite.All';
  const GRAPH='https://graph.microsoft.com/v1.0';
  const cfg=()=>((P.S.cfg||{}).onedrive)||{};
  const retorno=()=>location.origin+location.pathname.replace(/[^/]*$/,'')+'modulos/onedrive.html';
  const autoridade=()=>'https://login.microsoftonline.com/'+(cfg().tenant||'organizations')+'/oauth2/v2.0';
  const b64u=buf=>btoa(String.fromCharCode.apply(null,new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const ler=()=>{ try{ return JSON.parse(localStorage.getItem('od.sessao')||'null'); }catch(e){ return null; } };
  const grava=s=>{ try{ s?localStorage.setItem('od.sessao',JSON.stringify(s)):localStorage.removeItem('od.sessao'); }catch(e){} };
  const erro=(msg,code)=>{ const e=new Error(msg); e.code=code||'onedrive'; return e; };
  let baseCache=null;
  /* SHA-256 (para o PKCE): usa o do navegador e, se não houver (página sem https), uma implementação própria */
  function sha256js(bytes){ const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; const l=bytes.length, n=((l+9+63)>>6)<<6, m=new Uint8Array(n); m.set(bytes); m[l]=0x80; const bits=l*8; m[n-4]=bits>>>24; m[n-3]=bits>>>16; m[n-2]=bits>>>8; m[n-1]=bits;
    const W=new Uint32Array(64), r=(x,y)=>(x>>>y)|(x<<(32-y));
    for(let o=0;o<n;o+=64){ for(let i=0;i<16;i++) W[i]=(m[o+4*i]<<24)|(m[o+4*i+1]<<16)|(m[o+4*i+2]<<8)|m[o+4*i+3];
      for(let i=16;i<64;i++){ const s0=r(W[i-15],7)^r(W[i-15],18)^(W[i-15]>>>3), s1=r(W[i-2],17)^r(W[i-2],19)^(W[i-2]>>>10); W[i]=(W[i-16]+s0+W[i-7]+s1)>>>0; }
      let [a,b,c,d,e,f,g,h]=H; for(let i=0;i<64;i++){ const S1=r(e,6)^r(e,11)^r(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+K[i]+W[i])>>>0, S0=r(a,2)^r(a,13)^r(a,22), mj=(a&b)^(a&c)^(b&c), t2=(S0+mj)>>>0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0; }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0; H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0; }
    const out=new Uint8Array(32); H.forEach((v,i)=>{ out[4*i]=v>>>24; out[4*i+1]=v>>>16; out[4*i+2]=v>>>8; out[4*i+3]=v; }); return out.buffer; }
  const sha256=async bytes=>(window.crypto&&crypto.subtle)?crypto.subtle.digest('SHA-256',bytes):sha256js(bytes);

  async function trocarToken(params){ const c=cfg();
    const r=await fetch(autoridade()+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(Object.assign({client_id:c.clientId,scope:ESCOPO},params)).toString()});
    const j=await r.json().catch(()=>({})); if(!r.ok||!j.access_token) throw erro('A Microsoft recusou o login: '+(j.error_description||j.error||r.status),'login');
    const s=Object.assign(ler()||{},{access:j.access_token,refresh:j.refresh_token||(ler()||{}).refresh,exp:Date.now()+(+j.expires_in||3600)*1000}); grava(s); return s; }
  async function token(){ let s=ler(); if(!s||!s.access) throw erro('Conecte o OneDrive (botão no topo da tela das fichas).','nao-conectado');
    if(Date.now()>s.exp-90000){ if(!s.refresh){ grava(null); throw erro('A conexão com o OneDrive expirou. Conecte de novo.','nao-conectado'); }
      try{ s=await trocarToken({grant_type:'refresh_token',refresh_token:s.refresh}); }catch(e){ grava(null); throw erro('A conexão com o OneDrive expirou. Conecte de novo.','nao-conectado'); } }
    return s.access; }
  async function g(caminho,op,tentou){ op=op||{}; const r=await fetch(caminho.startsWith('http')?caminho:GRAPH+caminho,Object.assign({},op,{headers:Object.assign({},op.headers||{},{Authorization:'Bearer '+await token()})}));
    if(r.status===401&&!tentou){ const s=ler(); if(s){ s.exp=0; grava(s); } return g(caminho,op,true); }
    if(r.status===404) return null; if(!r.ok) throw erro('OneDrive respondeu '+r.status+': '+(await r.text()).slice(0,160));
    return r.status===204?{}:r.json(); }
  const enc=p=>String(p).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  /* endereço de um item pela pasta configurada (pasta do usuário ou pasta compartilhada pelo link) */
  async function item(rel){ const c=cfg();
    if(c.link){ if(!baseCache||baseCache.link!==c.link){ const sh='u!'+b64u(new TextEncoder().encode(c.link)); const it=await g('/shares/'+sh+'/driveItem'); if(!it) throw erro('Não consegui abrir a pasta compartilhada. Confira o link.');
        baseCache={link:c.link,drive:it.parentReference.driveId,id:it.id}; }
      return '/drives/'+baseCache.drive+'/items/'+baseCache.id+(rel?':/'+enc(rel)+':':''); }
    const pasta=enc(c.pasta||'Fichas EPI e Uniforme'); return '/me/drive/root:/'+pasta+(rel?'/'+enc(rel):'')+':'; }

  window.OneDrive={
    ativo:()=>{ const c=cfg(); return !!(c.ativo&&c.clientId); },
    conectado:()=>{ const s=ler(); return !!(s&&s.access); },
    conta:()=>(ler()||{}).conta||'',
    retorno,
    async conectar(){ const c=cfg(); if(!c.clientId) throw erro('O OneDrive ainda não foi configurado.');
      const w=window.open('about:blank','od-login','width=520,height=680'); if(!w) throw erro('O navegador bloqueou a janela de login. Permita janelas deste site e tente de novo.');
      const verif=b64u(crypto.getRandomValues(new Uint8Array(32))), estado=b64u(crypto.getRandomValues(new Uint8Array(16)));
      const desafio=b64u(await sha256(new TextEncoder().encode(verif)));
      w.location=autoridade()+'/authorize?'+new URLSearchParams({client_id:c.clientId,response_type:'code',redirect_uri:retorno(),scope:ESCOPO,state:estado,code_challenge:desafio,code_challenge_method:'S256',prompt:'select_account'}).toString();
      const code=await new Promise((ok,er)=>{ const t0=Date.now(); const t=setInterval(()=>{ let h=''; try{ h=w.location.href; }catch(e){}
          if(h&&h.startsWith(retorno())){ clearInterval(t); const q=new URLSearchParams(h.split('?')[1]||''); w.close();
            if(q.get('state')!==estado) return er(erro('Resposta de login inválida. Tente de novo.')); if(q.get('error')) return er(erro('Login cancelado: '+(q.get('error_description')||q.get('error')))); ok(q.get('code')); }
          else if(w.closed){ clearInterval(t); er(erro('Login cancelado.')); } else if(Date.now()-t0>300000){ clearInterval(t); try{ w.close(); }catch(e){} er(erro('O login demorou demais. Tente de novo.')); } },400); });
      await trocarToken({grant_type:'authorization_code',code,redirect_uri:retorno(),code_verifier:verif});
      try{ const eu=await g('/me?$select=userPrincipalName,displayName'); const s=ler(); s.conta=(eu&&(eu.userPrincipalName||eu.displayName))||''; grava(s); }catch(e){}
      baseCache=null; return true; },
    sair(){ grava(null); baseCache=null; },
    /* envia bytes (base64) para pasta/subpasta; arquivos grandes vão em partes */
    async enviar(rel,b64,mime){ const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
      if(u.length<=3.5*1024*1024) return g((await item(rel))+'/content',{method:'PUT',headers:{'Content-Type':mime||'application/octet-stream'},body:u});
      const ses=await g((await item(rel))+'/createUploadSession',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:{'@microsoft.graph.conflictBehavior':'replace'}})});
      const PED=327680*10; let res=null;
      for(let i=0;i<u.length;i+=PED){ const fim=Math.min(u.length,i+PED); const r=await fetch(ses.uploadUrl,{method:'PUT',headers:{'Content-Range':'bytes '+i+'-'+(fim-1)+'/'+u.length},body:u.slice(i,fim)});
        if(!r.ok&&r.status!==202) throw erro('Falha ao enviar para o OneDrive ('+r.status+').'); if(r.status===200||r.status===201) res=await r.json(); }
      return res; },
    async listar(rel){ const r=await g((await item(rel)).replace(/:$/,'')+(rel?':':'')+'/children?$select=name,webUrl,lastModifiedDateTime,file&$top=999'); return (r&&r.value)||[]; },
    async buscar(q){ const base=(await item('')).replace(/:$/,''); const r=await g(base+(cfg().link?'':':')+"/search(q='"+encodeURIComponent(String(q).replace(/'/g,"''"))+"')?$top=200"); return (r&&r.value)||[]; }
  };
})();
