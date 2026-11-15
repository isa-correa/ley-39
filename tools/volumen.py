#!/usr/bin/env python3
"""Importa el volumen «Ley 39/2015 por bloques» (carpeta Ley39_Apuntes) a la web.

Uso: python3 -I tools/volumen.py <carpeta Ley39_Apuntes>

Lee 1_Apuntes_finales/fuente_del_volumen/index.html, copia cada hoja a img/esquemas/v-<hoja>-1.webp
y escribe tools/volumen.json, que lee tools/esquemas.py para el catálogo, la pestaña Apuntes y la
relación pregunta -> apuntes.

Quedan fuera las 4 hojas de texto del volumen (cómo usarlo, método del supuesto y los dos de señuelos):
remiten a páginas del PDF y en la web no tienen sentido. Las 4 hojas del art. 85 ya estaban como esquema
propio: no se duplican, apuntan a «art85».
"""
import html, json, os, re, shutil, sys
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# imagen del volumen -> esquema que ya existe en la web (comprobado imagen a imagen)
YA_EXISTEN = {"B09_p4.webp": "art85", "B09_p5.webp": "art85", "B09_p6.webp": "art85", "B09_p7.webp": "art85"}


def numeros(texto):
    """'arts. 19 a 23 y 36 a 60' -> {19..23, 36..60}; 'art. 24.1, 25' -> {24, 25}"""
    res = set()
    for m in re.finditer(r"\barts?\.?\s*((?:\d+(?:\.\w+)*(?:\s*(?:,|y|a|-|al)\s*)?)+)", texto, re.I):
        for n in re.finditer(r"(\d+)(?:\.\w+)*(?:\s*(?:a|-|al)\s*(\d+))?", m.group(1)):
            a = int(n.group(1)); b = int(n.group(2)) if n.group(2) else a
            if 0 < b - a <= 60: res.update(range(a, b + 1))
            elif a <= 133: res.add(a)
    return res


def compactar(nums):
    nums = sorted(nums); partes = []; i = 0
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1: j += 1
        partes.append(str(nums[i]) if i == j else "%d-%d" % (nums[i], nums[j])); i = j + 1
    return ",".join(partes)


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    base = os.path.join(sys.argv[1], "1_Apuntes_finales", "fuente_del_volumen")
    h = open(os.path.join(base, "index.html"), encoding="utf-8").read()
    salida = os.path.join(RAIZ, "img", "esquemas"); os.makedirs(salida, exist_ok=True)
    bloques = []
    for sec in re.split(r'(?=<section class="bloque)', h)[1:]:
        sid = re.search(r'id="([^"]+)"', sec).group(1)
        if sid == "antes": continue   # hojas de texto del volumen
        nombre = html.unescape(re.search(r"<h2>(.*?)</h2>", sec).group(1))
        arts = html.unescape(re.search(r'<p class="arts">(.*?)</p>', sec).group(1))
        rango = numeros(arts)
        paginas = []
        for k, a in enumerate(re.split(r"(?=<article )", sec)[1:], 1):
            img = re.search(r'<img src="paginas/([^"]+)"', a)
            if not img: continue
            img = img.group(1)
            cls = re.search(r'class="([^"]*)"', a).group(1).split()
            titulo = html.unescape(re.search(r"<h3>(.*?)</h3>", a).group(1))
            texto = re.search(r"<details><summary>.*?</summary><p>(.*?)</p>", a, re.S)
            texto = html.unescape(texto.group(1)) if texto else ""
            nums = numeros(texto) or rango  # sin artículos citados: los de su bloque
            if img in YA_EXISTEN:
                pagina = {"id": YA_EXISTEN[img], "existente": True}
            else:
                eid = "v%s-%d" % (sid.lstrip("b") if sid != "anexo" else "a", k)
                im = Image.open(os.path.join(base, "paginas", img))
                shutil.copyfile(os.path.join(base, "paginas", img), os.path.join(salida, eid + "-1.webp"))
                pagina = {"id": eid, "titulo": titulo, "w": im.width, "h": im.height, "a": compactar(nums),
                          "practica": "test" in cls}
            paginas.append(pagina)
        bloques.append({"id": sid, "nombre": nombre, "arts": arts, "paginas": paginas})
    json.dump(bloques, open(os.path.join(RAIZ, "tools", "volumen.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    nuevas = sum(1 for b in bloques for p in b["paginas"] if not p.get("existente"))
    print("bloques:", len(bloques), "· hojas:", sum(len(b["paginas"]) for b in bloques), "· nuevas:", nuevas)


if __name__ == "__main__":
    main()
