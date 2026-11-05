#!/usr/bin/env python3
"""Uso: consulta.py <norma> <art> [<art>...]  normas: 39 40 50 cc ce ljca · consulta.py apuntes "texto" (busca en los apuntes)"""
import re,sys,os
B=os.path.dirname(os.path.abspath(__file__))
F={'39':'boe39','40':'l40','50':'boe50','cc':'boecc','ce':'ce','ljca':'ljca'}
if sys.argv[1]=='apuntes':
    L=open(B+'/apuntes.txt',encoding='utf8').read().split('\n')
    pat=sys.argv[2].lower(); hits=[i for i,l in enumerate(L) if pat in l.lower()]
    last=-99
    for i in hits[:12]:
        if i-last<6: continue
        print('['+str(i)+']', '\n'.join(L[max(0,i-1):i+5])[:1100]); print('---'); last=i
    if not hits: print('sin resultados')
    sys.exit()
t=open(B+'/'+F[sys.argv[1]]+'.txt',encoding='utf8').read()
t=t.replace("\xa0"," ")
M=list(re.finditer(r'(?m)^\s*Art[íi]culo\s+(\d+)(?:\s+(bis|ter))?\.?',t))
for a in sys.argv[2:]:
    hit=[k for k,m in enumerate(M) if m.group(1)==a]
    if not hit: print('Art',a,'no encontrado'); continue
    fin_de=lambda k:(M[k+1].start() if k+1<len(M) else M[k].start()+5000)
    k=max(hit,key=lambda k:fin_de(k)-M[k].start()); fin=fin_de(k)
    print(t[M[k].start():fin].strip()[:7000]); print('=====')
