/* Margem da TV (overscan): com 4%, todo o conteúdo do Previsto × Realizado fica dentro da área segura e nada sobra. */
const run=require('./tv-cenario-8linhas');
(async()=>{ const r=[];
 for(const vp of [{width:1920,height:1080},{width:1366,height:768}]){
  await run(vp,'/tmp/margem-'+vp.width+'.png',async p=>{
   await p.evaluate(()=>{ localStorage.setItem('colafix.tvMargem','4'); }); await p.keyboard.press('Escape'); await new Promise(x=>setTimeout(x,600));
   await p.evaluate(()=>__T.go('tvapres')); await new Promise(x=>setTimeout(x,400));
   const temOp=await p.evaluate(()=>!!document.querySelector('[data-act="tv-margem"][data-v="4"][aria-pressed="true"]'));
   await p.click('[data-act="apr-abre"][data-v="ritmo"]'); await new Promise(x=>setTimeout(x,2000));
   const m=await p.evaluate(()=>{ const W=innerWidth,H=innerHeight,mx=W*.04-1,my=H*.04-1; let fora=0, ex=null;
     document.querySelectorAll('#view *').forEach(e=>{ const b=e.getBoundingClientRect(); if(!b.width||!b.height||getComputedStyle(e).visibility==='hidden') return; if(b.left<mx||b.top<my||b.right>W-mx||b.bottom>H-my){ fora++; if(!ex) ex=e.className+' '+Math.round(b.left)+','+Math.round(b.top)+','+Math.round(b.right)+','+Math.round(b.bottom); } });
     return {fora,ex,h:document.documentElement.scrollHeight,vh:H,w:document.documentElement.scrollWidth,vw:W}; });
   await p.keyboard.press('m'); await new Promise(x=>setTimeout(x,300)); const nova=await p.evaluate(()=>localStorage.getItem('colafix.tvMargem'));
   r.push(`${vp.width}×${vp.height}: opção na tela=${temOp} · elementos fora da área segura=${m.fora}${m.ex?' (ex.: '+m.ex+')':''} · sobra ${m.h-m.vh}px/${m.w-m.vw}px · tecla M → ${nova}%`);
  });
 }
 console.log(r.join('\n')); process.exit(0); })();
