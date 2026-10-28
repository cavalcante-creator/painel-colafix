/* Painel Colafix · 69-tv-ajuste.js — telas de TV sem nada apertado (pedido de 28/10, foto da TV dos silos).
   Só CSS, nenhuma função muda:
   - cabeçalho: o número grande não encosta mais no rótulo de baixo (CIMENTO, FÁBRICA HOJE…);
   - silos: cada cartão mede a própria largura (container query). Com muitos silos (7 = 3 cimento + 4 areia)
     o nome fica numa linha e a etiqueta embaixo, o número diminui para caber e a % vai para a linha de baixo
     (antes o "37,8 t 126%" saía do cartão e o nome quebrava em duas linhas);
   - silos: os quadros de baixo (Cimento × programação, Cargas) crescem com o texto (a 2ª linha era cortada);
   - calendário: a ordem de hoje volta a ficar numa linha (código, nome e quantidade). Uma regra do monitor
     (.tvn-oh>div>span{display:block}) quebrava em 3 linhas e o texto saía cortado em cima e embaixo. */
"use strict";
document.head.insertAdjacentHTML('beforeend',`<style id="tvaj-css">
.tvn-st b{line-height:1.08}
.tvn-st span{display:block;margin-top:4px;line-height:1.1}
.tvn-sil{container-type:inline-size}
.tvn-sil h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.tvn-sq{flex-wrap:wrap;justify-content:center;row-gap:2px;max-width:100%}
.tvn-sil>.tvn-mut{text-align:center;line-height:1.3}
@container (max-width:330px){
  .tvn-sil .tvn-ch{flex-direction:column;align-items:flex-start;gap:6px}
  .tvn-sil h3{font-size:clamp(20px,12.5cqi,28px);max-width:100%}
  .tvn-sq b{font-size:clamp(40px,26cqi,60px)}
  .tvn-sq em{flex-basis:100%;text-align:center;margin-left:0;font-size:clamp(22px,14cqi,32px);line-height:1.1}
  .tvn-sil>.tvn-mut{font-size:clamp(13px,7.4cqi,16px)}
}
.tvn-pgsil .tvn-infs{height:auto}
.tvn-pgsil .tvn-inf{gap:4px}
.tvn-pgsil .tvn-il b{line-height:1.15}
.tvn-cc.foco .tvn-cx>span{display:inline}
</style>`);
/* ===FIM TV AJUSTE=== */
