/* MODELO de módulo (não está na lista, então não aparece). Copie este arquivo para começar um módulo novo. */
(function(){ const P=window.Painel; if(!P) return;
  let dados=[];                                   // estado do módulo
  P.registrarModulo({ id:'exemplo', nome:'Exemplo', ic:'grid',
    telas:{ exemplo:{ nome:'Exemplo', render:()=>`<div class="head"><div><div class="eyebrow">EXEMPLO</div><h1>Módulo de exemplo</h1></div></div>
      <section class="card">${dados.length?dados.map(d=>`<div class="row">${P.esc(d.nome||d._id)}</div>`).join(''):'<div class="empty">Nada ainda.</div>'}</section>` } },
    iniciar:()=>{ P.inscrever('exemplo',()=>P.db().collection('exemplo').limit(200),snap=>{ dados=snap.docs.map(d=>Object.assign({_id:d.id},d.data())); P.rerender(); }); }
  }); })();
