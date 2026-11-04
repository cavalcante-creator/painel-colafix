/* Leitura das assinaturas digitais de um PDF (04/11, "tem que ser assinado pelo gov.br").
   Usado pelo painel (modulos/rh-assinar.js) e pela página pública assinar.html. Sem biblioteca.
   AssinLer.ler(u8) → {pdf, ass:[{nome, cpf, emissor, org, gov, icp, quando, cobre, digOk}]}
     nome/cpf = de quem assinou (certificado do signatário) · emissor = autoridade que emitiu o certificado
     gov = certificado do gov.br (Governo Federal) · icp = ICP-Brasil · cobre = a assinatura cobre o arquivo até o fim
     digOk = o resumo (hash) guardado na assinatura bate com o conteúdo assinado (true/false; null = não deu para conferir)
   Isto NÃO substitui a conferência oficial (cadeia do certificado): para isso, o Validar do ITI (validar.iti.gov.br).
   AssinLer.sha(u8) → SHA-256 em hexadecimal. */
(function(){
  const lat=u=>{ let s=''; for(let i=0;i<u.length;i+=32768) s+=String.fromCharCode.apply(null,u.subarray(i,i+32768)); return s; };
  function no(u,p){ if(p+2>u.length) return null; const t=u[p]; let l=u[p+1], h=2;
    if(l&0x80){ const n=l&0x7f; if(n<1||n>4) return null; l=0; for(let i=0;i<n;i++) l=l*256+u[p+2+i]; h=2+n; }
    return {t,p,ini:p+h,fim:p+h+l,cons:!!(t&0x20)}; }
  function filhos(u,n){ const out=[]; let p=n.ini; while(p<n.fim){ const c=no(u,p); if(!c||c.fim>n.fim) break; out.push(c); p=c.fim; } return out; }
  function oid(u,n){ const b=u.subarray(n.ini,n.fim); if(!b.length) return ''; const r=[Math.floor(b[0]/40),b[0]%40]; let v=0;
    for(let i=1;i<b.length;i++){ v=v*128+(b[i]&0x7f); if(!(b[i]&0x80)){ r.push(v); v=0; } } return r.join('.'); }
  function txt(u,n){ const b=u.subarray(n.ini,n.fim);
    if(n.t===0x1e){ let s=''; for(let i=0;i+1<b.length;i+=2) s+=String.fromCharCode(b[i]*256+b[i+1]); return s; } /* BMPString */
    try{ return new TextDecoder('utf-8').decode(b); }catch(e){ return lat(b); } }
  /* Name (SEQ de SET de SEQ{OID,valor}) → {cn, o} */
  function nome(u,n){ const r={cn:'',o:[]}; filhos(u,n).forEach(set=>filhos(u,set).forEach(sq=>{ const f=filhos(u,sq); if(f.length<2||f[0].t!==0x06) return;
      const k=oid(u,f[0]), v=txt(u,f[1]); if(k==='2.5.4.3'&&!r.cn) r.cn=v; else if(k==='2.5.4.10'||k==='2.5.4.11') r.o.push(v); })); return r; }
  /* acha os certificados dentro do PKCS#7: SEQ{ SEQ tbs, SEQ alg, BIT STRING } */
  function certs(u,raiz){ const out=[], ver=(n,d)=>{ if(d>12||!n.cons) return; const f=filhos(u,n);
      if(n.t===0x30&&f.length===3&&f[0].t===0x30&&f[1].t===0x30&&f[2].t===0x03){ const tb=filhos(u,f[0]); let i=0; if(tb[0]&&tb[0].t===0xa0) i=1;
        const iss=tb[i+2], sub=tb[i+4]; if(iss&&sub&&iss.t===0x30&&sub.t===0x30){ out.push({emissor:nome(u,iss),sujeito:nome(u,sub)}); return; } }
      f.forEach(c=>ver(c,d+1)); }; ver(raiz,0); return out; }
  /* atributos assinados: messageDigest (1.2.840.113549.1.9.4) e signingTime (…9.5) */
  function atributos(u,raiz){ const r={}, ver=(n,d)=>{ if(d>14||!n.cons) return; const f=filhos(u,n);
      if(n.t===0x30&&f.length===2&&f[0].t===0x06&&f[1].t===0x31){ const k=oid(u,f[0]), v=filhos(u,f[1])[0];
        if(v&&k==='1.2.840.113549.1.9.4'&&v.t===0x04&&!r.dig) r.dig=u.slice(v.ini,v.fim);
        if(v&&k==='1.2.840.113549.1.9.5'&&!r.quando){ const s=txt(u,v), m=s.match(v.t===0x18?/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/:/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
          if(m){ const a=m[1].length===2?(+m[1]<50?'20':'19')+m[1]:m[1]; r.quando=a+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+(m[6]||'00')+'Z'; } } }
      f.forEach(c=>ver(c,d+1)); }; ver(raiz,0); return r; }
  const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  /* SHA-256 em JS puro (endereço sem https não tem crypto.subtle) */
  function sha256js(m){ const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), L=m.length, n=((L+9+63)>>6)<<6, b=new Uint8Array(n); b.set(m); b[L]=0x80;
    const bits=L*8; b[n-4]=(bits>>>24)&255; b[n-3]=(bits>>>16)&255; b[n-2]=(bits>>>8)&255; b[n-1]=bits&255; const hi=Math.floor(L/0x20000000); b[n-5]=hi&255; b[n-6]=(hi>>>8)&255;
    const W=new Uint32Array(64), r=(x,k)=>(x>>>k)|(x<<(32-k));
    for(let o=0;o<n;o+=64){ for(let i=0;i<16;i++) W[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
      for(let i=16;i<64;i++){ const s0=r(W[i-15],7)^r(W[i-15],18)^(W[i-15]>>>3), s1=r(W[i-2],17)^r(W[i-2],19)^(W[i-2]>>>10); W[i]=(W[i-16]+s0+W[i-7]+s1)|0; }
      let x0=H[0],x1=H[1],x2=H[2],x3=H[3],x4=H[4],x5=H[5],x6=H[6],x7=H[7];
      for(let i=0;i<64;i++){ const S1=r(x4,6)^r(x4,11)^r(x4,25), ch=(x4&x5)^(~x4&x6), t1=(x7+S1+ch+K[i]+W[i])|0, S0=r(x0,2)^r(x0,13)^r(x0,22), mj=(x0&x1)^(x0&x2)^(x1&x2), t2=(S0+mj)|0;
        x7=x6; x6=x5; x5=x4; x4=(x3+t1)|0; x3=x2; x2=x1; x1=x0; x0=(t1+t2)|0; }
      H[0]+=x0; H[1]+=x1; H[2]+=x2; H[3]+=x3; H[4]+=x4; H[5]+=x5; H[6]+=x6; H[7]+=x7; }
    return Array.from(H,x=>x.toString(16).padStart(8,'0')).join(''); }
  async function sha(u8,alg){ alg=alg||'SHA-256'; if(window.crypto&&crypto.subtle) return hex(await crypto.subtle.digest(alg,u8)); if(alg==='SHA-256') return sha256js(u8); throw new Error('sem '+alg); }
  async function ler(u8){ const s=lat(u8), res={pdf:/^%PDF-/.test(s.slice(0,1024).trimStart()),ass:[]}; if(!res.pdf) return res;
    const re=/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g; let m; const vistos=new Set();
    while((m=re.exec(s))){ const br=[+m[1],+m[2],+m[3],+m[4]], k=br.join(','); if(vistos.has(k)) continue; vistos.add(k);
      if(br[0]!==0||br[1]<=0||br[2]<=br[1]||br[2]+br[3]>u8.length) continue;
      const hx=s.slice(br[1],br[2]).replace(/[<>\s]/g,''); if(!/^[0-9a-fA-F]+$/.test(hx)) continue;
      const der=new Uint8Array(hx.length>>1); for(let i=0;i<der.length;i++) der[i]=parseInt(hx.substr(i*2,2),16);
      const raiz=no(der,0); if(!raiz||raiz.t!==0x30) continue; const cs=certs(der,raiz);
      /* certificado de quem assinou = o que não é emissor de nenhum outro (o último da cadeia) */
      const cns=new Set(cs.map(c=>c.emissor.cn)), fim=cs.find(c=>!cns.has(c.sujeito.cn)||c.sujeito.cn===c.emissor.cn&&cs.length===1)||cs[0]||null;
      const at=atributos(der,raiz); let digOk=null;
      if(at.dig&&(at.dig.length===32||at.dig.length===64||at.dig.length===48)){ try{ const cont=new Uint8Array(br[1]+br[3]); cont.set(u8.subarray(0,br[1]),0); cont.set(u8.subarray(br[2],br[2]+br[3]),br[1]);
          const alg=at.dig.length===32?'SHA-256':at.dig.length===48?'SHA-384':'SHA-512'; digOk=(await sha(cont,alg))===hex(at.dig); }catch(e){ digOk=null; } }
      const cn=fim?fim.sujeito.cn:'', mc=cn.match(/^(.*?)[:\s]+(\d{11})\s*$/), em=fim?fim.emissor:{cn:'',o:[]};
      const orgs=(em.o||[]).concat(fim?fim.sujeito.o:[]).join(' ');
      res.ass.push({nome:(mc?mc[1]:cn).trim(),cpf:mc?mc[2]:'',emissor:em.cn||'',org:orgs,gov:/governo federal|gov\.?br/i.test(em.cn+' '+orgs),icp:/icp-?brasil/i.test(orgs+' '+em.cn),
        quando:at.quando||'',cobre:br[2]+br[3]===u8.length,digOk}); }
    return res; }
  window.AssinLer={ler,sha};
})();
