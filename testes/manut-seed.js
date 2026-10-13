const H=require('./harness');
function seedManut(){ return H.seed((d,uid)=>{
  d.users['tecnico@painel-colafix.app']={uid:'uTEC',pass:'tec123',nome:'Pedro Técnico'};
  d.users['operador@painel-colafix.app']={uid:'uOPE',pass:'ope123',nome:'Ana Operadora'};
  d.users['tv@painel-colafix.app']={uid:'uTV',pass:'tv1234',nome:'TV'};
  d.docs['perfis/uTEC']={nome:'Pedro Técnico',usuario:'tecnico'}; d.docs['perfis/uOPE']={nome:'Ana Operadora',usuario:'operador'}; d.docs['perfis/uTV']={nome:'TV',usuario:'tv'};
  d.docs['acessos/uTEC']={perfil:'manut',mods:['manut'],locais:[],ativo:true};
  d.docs['acessos/uOPE']={perfil:'producao',mods:['inicio','producao'],locais:[],ativo:true};
  d.docs['acessos/uTV']={perfil:'ver',mods:['tv','telas','cal'],locais:[],ativo:true};
  d.docs['rh/config']={fichasDesde:'2000-01'}; /* nos testes as fichas valem desde sempre (na fábrica começam em 11/2026) */
  d.docs['config/manut']={equips:[{id:'eqmix1',linha:'Linha 1',nome:'Misturador',tag:'MX-01',ativo:true},{id:'eqens1',linha:'Linha 1',nome:'Ensacadeira',tag:'EN-01',ativo:true},{id:'eqcmp',linha:'Linha 2',nome:'Compressor 01',tag:'CP-01',ativo:true}],prev:[],pecas:[{cod:'ROL6205',desc:'Rolamento 6205',un:'un',min:2}]};
}); }
module.exports={seedManut};
