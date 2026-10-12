import cv2, numpy as np, random
P=['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112']
def larguras(txt):
    vals=[104]+[ord(c)-32 for c in txt]; chk=(vals[0]+sum(v*(i+1) for i,v in enumerate(vals[1:])))%103
    seq=vals+[chk,106]; return ''.join(P[v] for v in seq)
def imagem(txt,mod=4,alt=120,q=10):
    w=larguras(txt); tot=sum(int(x) for x in w)+2*q; im=np.full((alt,tot*mod),255,np.uint8); x=q*mod; barra=True
    for c in w:
        n=int(c)*mod
        if barra: im[:,x:x+n]=0
        x+=n; barra=not barra
    return im
if __name__=='__main__':
    d=cv2.barcode.BarcodeDetector(); A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    ok=0; err=[]; cks=set()
    for i in range(300):
        cod='CX'+''.join(random.choice(A) for _ in range(8))
        im=cv2.copyMakeBorder(imagem(cod),40,40,40,40,cv2.BORDER_CONSTANT,value=255)
        r=d.detectAndDecode(im); t=r[0] if isinstance(r[0],str) else (r[1][0] if r[1] else '')
        vals=[104]+[ord(c)-32 for c in cod]; cks.add((vals[0]+sum(v*(i+1) for i,v in enumerate(vals[1:])))%103)
        if t==cod: ok+=1
        else: err.append((cod,t))
    print('lidos certos',ok,'de 300 · somas de verificação diferentes cobertas',len(cks),'· erros',err[:3])
