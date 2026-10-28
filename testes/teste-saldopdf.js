/* Leitor do PDF de saldo do Focco (REST0331, anlPdfSaldo em js/03): item sem estoque de segurança (linha com um número a menos)
   e empresa escrita "Empresa........: 1 - …". Roda só no node (sem navegador). Linhas no formato do relatório real de 28/10, números inventados. */
const fs=require('fs'); const res=[]; const ok=(n,c,d)=>{ res.push({n,ok:!!c}); console.log((c?'PASSOU ':'FALHOU ')+n+(d?' — '+String(d).slice(0,240):'')); };
const src=fs.readFileSync(__dirname+'/../js/03-analise.js','utf8'); const pega=re=>{ const m=src.match(re); if(!m) throw new Error('não achei '+re); return m[0]; };
const code=[pega(/function anlNumBR\(v\)\{[^\n]*\n/),pega(/const ANL_NUMRE=[^\n]*\n/),pega(/function anlPdfData\(t\)\{[\s\S]*?\n(?=\S)/),pega(/function anlPdfSaldo\(pags\)\{[\s\S]*?return \{atual:at,l,emp:[^\n]*\n/)].join('\n');
const anlPdfSaldo=new Function('hojeStr','pad',code+'; return anlPdfSaldo;')(()=>'2026-10-28',n=>String(n).padStart(2,'0'));
const pag1=['FOCCOERPREST0331','Relatório de Saldo dos Itens c/ Análise de Compras Data: 28/10/2026 01:21:33','Parâmetros','Empresa........: 1 - COLFIX INDUSTRIA E COMERCIO LTDA','Almoxarifados..: TODOS',
 'AB0001 ARGAMASSA BRANCA AC3 EMB SC 0 1.056,0000 11,062 6.648,519 601,0000','PLASTICA 20 KG','Almoxarifado: 4 AVARIAS 5.763,525 521,0000','Almoxarifado: 3 EXPEDICAO 885,000 80,0000','Almoxarifado: 30 PULMAO 221,000 20,0000',
 'RE0002 PASTINA SILICONIZADA AZUL PICINA FD 0 0,0000 34,489 254.068,015 0,0000','20X1 KG PY','Almoxarifado: 3 EXPEDICAO 0,000 0,0000',
 'RE0003 PASTINA SILICONIZADA BEIGE FD 0 16,366 254.068,015 150,0000','10X1 KG UY','Almoxarifado: 3 EXPEDICAO 2.454,870 150,0000','Almoxarifado: 4 AVARIAS 0,000 0,0000',
 'RE0005 PASTINA SILICONIZADA BEIGE FD 0 0,0000 34,489 254.068,015 0,0000','20X1 KG PY','Almoxarifado: 3 EXPEDICAO 0,000 0,0000',
 'RE0006 PASTINA SILICONIZADA BLANCO FD 0 17,484 256.690,558 120,0000','10X1 KG UY','Almoxarifado: 3 EXPEDICAO 2.098,000 120,0000',
 'AE0014 ARGAMASSA REFRAFIX EMB FD 0 15,109 193.889,036 0,0000','PLASTICO 4X5 KG EXPORTAÇÃO','Almoxarifado: 3 EXPEDICAO 0,000 0,0000',
 'CL0001 PRIMER ADD 100 BALDE 3,6 LT BD 0 50,0000 17,255 194.941,580 61,0000','Almoxarifado: 3 EXPEDICAO 1.052,000 61,0000'].join('\n');
const r=anlPdfSaldo([pag1]);
ok('Lê todos os 7 itens (antes os sem estoque de segurança sumiam)', Object.keys(r.l).length===7, Object.keys(r.l).join(','));
ok('RE0003 (estoque de segurança em branco) com saldo 150 no almox 3', r.l.RE0003&&r.l.RE0003.a3===150&&r.l.RE0003.seg===0&&r.l.RE0003.d==='PASTINA SILICONIZADA BEIGE 10X1 KG UY', JSON.stringify(r.l.RE0003));
ok('O saldo do RE0003 não vai mais para o item de cima (RE0002 = 0) e o do RE0006 não vai para o RE0005', r.l.RE0002.a3===0&&r.l.RE0005.a3===0&&r.l.RE0006.a3===120, JSON.stringify([r.l.RE0002,r.l.RE0005,r.l.RE0006]));
ok('Itens com estoque de segurança continuam iguais (AB0001: A3 80 + A30 20, seg. 1.056; avarias fora)', r.l.AB0001.a3===80&&r.l.AB0001.a30===20&&r.l.AB0001.seg===1056&&r.l.AB0001.d==='ARGAMASSA BRANCA AC3 EMB PLASTICA 20 KG', JSON.stringify(r.l.AB0001));
ok('Descrição com número no meio continua certa (CL0001 "BALDE 3,6 LT")', r.l.CL0001&&r.l.CL0001.d==='PRIMER ADD 100 BALDE 3,6 LT'&&r.l.CL0001.a3===61&&r.l.CL0001.seg===50, JSON.stringify(r.l.CL0001));
ok('Empresa lida do PDF ("Empresa........: 1")', r.emp==='1', r.emp);
const r9=anlPdfSaldo([pag1.replace('Empresa........: 1 - COLFIX','Empresa........: 9 - COLFIX')]);
ok('Empresa 9 também', r9.emp==='9', r9.emp);
process.exit(res.every(x=>x.ok)?0:1);
