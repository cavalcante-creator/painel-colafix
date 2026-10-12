import sys, cv2, numpy as np, subprocess, base64, os
def y4m(img, out, n=10):
    h,w=img.shape[:2]; yuv=cv2.cvtColor(img,cv2.COLOR_BGR2YUV_I420).tobytes()
    with open(out,'wb') as f:
        f.write(f'YUV4MPEG2 W{w} H{h} F10:1 Ip A1:1 C420jpeg\n'.encode())
        for _ in range(n): f.write(b'FRAME\n'+yuv)
def cena(card, out, ang=6, blur=1.1):
    bg=np.full((720,1280,3),(118,112,104),np.uint8)
    # leve iluminação irregular
    g=np.linspace(0.85,1.1,1280)[None,:,None]; bg=np.clip(bg*g,0,255).astype(np.uint8)
    h,w=card.shape[:2]
    if h>700 or w>1260:  # bem perto: a câmera vê só o meio do crachá
        ch,cw=min(h,700),min(w,1260); y=(h-ch)//2; x=(w-cw)//2; card=card[y:y+ch,x:x+cw]; h,w=ch,cw
    M=cv2.getRotationMatrix2D((w/2,h/2),ang,1.0)
    c=cv2.warpAffine(card,M,(w,h),borderValue=(118,112,104))
    y0=(720-h)//2; x0=(1280-w)//2; bg[y0:y0+h,x0:x0+w]=c
    if blur: bg=cv2.GaussianBlur(bg,(0,0),blur)
    y4m(bg,out)
def cracha(png, idx, out, dist_mm_px=4.4):
    pg=cv2.imread(png); K=8  # imagem do teste: 8 px/mm
    W,H,gx,gy,y0=85.6,54,8,4.5,12; x0=(210-2*W-gx)/2; k=idx%10
    x=x0+(k%2)*(W+gx); y=y0+(k//2)*(H+gy)
    card=pg[int(y*K):int((y+H)*K), int(x*K):int((x+W)*K)]
    # crachá a ~25 cm de uma câmera frontal 720p: ~4,4 px por mm
    card=cv2.resize(card,(int(W*dist_mm_px),int(H*dist_mm_px)),interpolation=cv2.INTER_AREA)
    cena(card,out)
def qr(texto, out, px=130):
    e=cv2.QRCodeEncoder.create(); q=e.encode(texto); q=cv2.resize(q,(px,px),interpolation=cv2.INTER_NEAREST)
    q=cv2.copyMakeBorder(q,20,20,20,20,cv2.BORDER_CONSTANT,value=255); cena(cv2.cvtColor(q,cv2.COLOR_GRAY2BGR),out)
def medir(png, dpi=203.2):
    pg=cv2.imread(png); res={}
    d=cv2.QRCodeDetector(); ok,txts,pts,_=d.detectAndDecodeMulti(pg)
    if ok:
        for t,p in zip(txts,pts):
            if t: res[t]=round(float(np.linalg.norm(p[0]-p[1])/dpi*25.4),1)
    try:   # leitor robusto (parecido com o dos celulares) para os que o simples não pegar
        w=cv2.wechat_qrcode_WeChatQRCode(); txts,pts=w.detectAndDecode(pg)
        for t,p in zip(txts,pts):
            if t and t not in res: res[t]=round(float(np.linalg.norm(p[0]-p[1])/dpi*25.4),1)
        # também em pedaços da folha (o leitor perde alguns quando há vários na mesma imagem)
        H,W=pg.shape[:2]; th,tw=560,760
        for y in range(0,max(1,H-th)+1,th//2):
            for x in range(0,max(1,W-tw)+1,tw//2):
                txts,pts=w.detectAndDecode(pg[y:y+th,x:x+tw])
                for t,p in zip(txts,pts):
                    if t and t not in res: res[t]=round(float(np.linalg.norm(p[0]-p[1])/dpi*25.4),1)
    except Exception: pass
    print(repr(sorted(res.items())))
def servidor():
    d=cv2.QRCodeDetector()
    for linha in sys.stdin:
        try:
            b=base64.b64decode(linha.strip().split(',',1)[1]); im=cv2.imdecode(np.frombuffer(b,np.uint8),cv2.IMREAD_COLOR)
            t,_,_=d.detectAndDecode(im); print(t or '',flush=True)
        except Exception as e: print('',flush=True)
if __name__=='__main__':
    a=sys.argv[1]
    if a=='cracha': cracha(sys.argv[2],int(sys.argv[3]),sys.argv[4])
    elif a=='qr': qr(sys.argv[2],sys.argv[3])
    elif a=='medir': medir(sys.argv[2])
    elif a=='servidor': servidor()

def adesivo(png, idx, out, pxmm=4.4, salva_png=None):
    pg=cv2.imread(png); K=8; W,H,gx,gy,cols=38,54,4,4,4; x0=(210-cols*W-(cols-1)*gx)/2; y0=(297-5*H-4*gy)/2
    k=idx%20; x=x0+(k%cols)*(W+gx); y=y0+(k//cols)*(H+gy)
    card=pg[int(y*K):int((y+H)*K), int(x*K):int((x+W)*K)]
    if salva_png: cv2.imwrite(salva_png,card)
    # adesivo colado num crachá branco maior
    base=np.full((int(70*K),int(54*K),3),245,np.uint8); oy=int(14*K); ox=int(11*K); base[oy:oy+card.shape[0],ox:ox+card.shape[1]]=card
    base=cv2.resize(base,(int(54*pxmm),int(70*pxmm)),interpolation=cv2.INTER_AREA); cena(base,out)
if __name__=='__main__' and sys.argv[1]=='adesivo': adesivo(sys.argv[2],int(sys.argv[3]),sys.argv[4],float(sys.argv[5]) if len(sys.argv)>5 else 4.4)

P128=None
def le_barras(png, x, y, w, h, K=8):
    """lê as barras impressas medindo as larguras numa linha horizontal (independe do código do painel)"""
    im=cv2.imread(png,cv2.IMREAD_GRAYSCALE); lin=im[int((y+h/2)*K), int(x*K):int((x+w)*K)]<128
    runs=[]; cur=lin[0]; n=0
    for v in lin:
        if v==cur: n+=1
        else: runs.append((cur,n)); cur=v; n=1
    runs.append((cur,n)); runs=[r for r in runs]
    while runs and not runs[0][0]: runs.pop(0)
    while runs and not runs[-1][0]: runs.pop()
    tot=sum(n for _,n in runs)
    return runs, tot
def confere(png, x, y, w, h, texto):
    import importlib.util
    sp=importlib.util.spec_from_file_location('c',__import__('os').path.join(__import__('os').path.dirname(__file__),'c128.py')); c=importlib.util.module_from_spec(sp); sp.loader.exec_module(c)
    esperado=c.larguras(texto); mods=sum(int(d) for d in esperado)
    runs,tot=le_barras(png,x,y,w,h); m=tot/mods
    lido=''.join(str(max(1,min(4,round(n/m)))) for _,n in runs)
    return lido==esperado, round(m/8,3)
if __name__=='__main__' and sys.argv[1]=='confere':
    ok,mod=confere(sys.argv[2],float(sys.argv[3]),float(sys.argv[4]),float(sys.argv[5]),float(sys.argv[6]),sys.argv[7]); print(('OK' if ok else 'ERRO')+' modulo_mm='+str(mod))
