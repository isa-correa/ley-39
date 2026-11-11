"""Genera la pestaña Apuntes: convierte los PDF de tools/apuntes/ en imágenes (img/esquemas/) y escribe data/esquemas.js.

Cada esquema de ESQUEMAS tiene el PDF, el título, los artículos que cubre y el bloque del temario donde va.
ESQ_PREG engancha cada pregunta con sus esquemas (botón «Consultar apuntes» en la justificación).
Requiere PyMuPDF (pip install pymupdf). Uso: python3 tools/esquemas.py
"""
import json, os, fitz

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZOOM = 2.2

# id: (pdf, título, artículos, bloque, grupo dentro del bloque)
ESQ = {
    "art85": ("Art85_Terminacion_Sancionadores.pdf", "Art. 85 · Terminación en los sancionadores: reconocer, pagar y reducción", "85", "8", "Procedimiento sancionador"),
}
# Bloques del temario (mismo orden que BLOQUES de construir.py; solo salen los que tienen apuntes).
BLOQUES = {"8": ("Finalización y ejecución (arts. 84 a 105)", "cómo termina el procedimiento")}
# Preguntas que enseñan el botón «Consultar apuntes».
PREGUNTAS = {
    "art85": ["au-17-002", "au-17-009", "au-17-010", "of-08-012", "vo-04-029", "vo-10-018", "pr-19-037",
              "pr-17-001", "pr-17-002", "pr-17-003", "pr-17-004", "pr-17-005"],
}

esquemas, apuntes = {}, {}
for eid, (pdf, titulo, arts, bloque, grupo) in ESQ.items():
    doc = fitz.open(os.path.join(RAIZ, "tools", "apuntes", pdf))
    paginas = []
    for i, pg in enumerate(doc, 1):
        pix = pg.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        ruta = "img/esquemas/%s-%d.png" % (eid, i)
        pix.save(os.path.join(RAIZ, ruta))
        paginas.append({"src": ruta, "w": pix.width, "h": pix.height})
    esquemas[eid] = {"titulo": titulo, "a": arts, "paginas": paginas}
    grupos = apuntes.setdefault(bloque, {})
    grupos.setdefault(grupo, []).append(eid)

lista = [{"id": b, "nombre": BLOQUES[b][0], "desc": BLOQUES[b][1],
          "grupos": [{"nombre": g, "ids": ids} for g, ids in gs.items()]} for b, gs in sorted(apuntes.items(), key=lambda x: int(x[0]))]
esq_preg = {}
for eid, qs in PREGUNTAS.items():
    for q in qs:
        esq_preg.setdefault(q, []).append(eid)

dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
with open(os.path.join(RAIZ, "data", "esquemas.js"), "w", encoding="utf8") as f:
    f.write("window.ESQUEMAS=" + dump(esquemas) + ";\nwindow.APUNTES=" + dump(lista) + ";\nwindow.ESQ_PREG=" + dump(esq_preg) + ";\n")
print(len(esquemas), "esquemas ·", sum(len(e["paginas"]) for e in esquemas.values()), "páginas · data/esquemas.js")
