"""Genera la pestaña Apuntes: convierte los PDF de tools/apuntes/ en imágenes (img/esquemas/) y escribe data/esquemas.js.

Cada esquema de ESQUEMAS tiene el PDF, el título, los artículos que cubre y el bloque del temario donde va.
ESQ_PREG engancha cada pregunta con sus esquemas (botón «Consultar apuntes» en la justificación).
Requiere PyMuPDF (pip install pymupdf). Uso: python3 tools/esquemas.py
"""
import glob, json, os, re, fitz

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZOOM = 2.2

# id: (pdf, título, artículos que se muestran, bloque, grupo dentro del bloque, artículos extra para el buscador)
ESQ = {
    "art85": ("Art85_Terminacion_Sancionadores.pdf", "Art. 85 · Terminación en los sancionadores: reconocer, pagar y reducción", "85", "8", "Procedimiento sancionador", ""),
    "subsanacion": ("L39_11_subsanacion_y_tramites.pdf", "Art. 68 frente a art. 73: subsanar la solicitud o cumplimentar un trámite", "68,73", "6", "Subsanación y trámites", "21-22,30"),
    "plazos": ("L39_12_repaso_plazos.pdf", "Repaso de plazos: cómo se cuentan y cuánto dura cada uno", "29-33", "3", "Repaso de plazos",
               "5-6,21-24,40,42-43,56,65,67-68,73,77-78,80-83,87-88,90-91,94-96,106-107,117-118,121-126"),
}
# Bloques del temario (mismo orden que BLOQUES de construir.py; solo salen los que tienen apuntes).
BLOQUES = {"3": ("Términos y plazos (arts. 29 a 33)", "cómputo y duración de los plazos"),
           "6": ("Iniciación (arts. 53 a 69)", "solicitud, subsanación y trámites"),
           "8": ("Finalización y ejecución (arts. 84 a 105)", "cómo termina el procedimiento")}
# Preguntas que enseñan el botón «Consultar apuntes».
PREGUNTAS = {
    "art85": ["au-17-002", "au-17-009", "au-17-010", "of-08-012", "vo-04-029", "vo-10-018", "pr-19-037",
              "pr-17-001", "pr-17-002", "pr-17-003", "pr-17-004", "pr-17-005"],
}

# Los otros dos esquemas se enlazan solos, por el artículo que cita el precepto de cada pregunta de la Ley 39/2015.
RESP = {}
for f in glob.glob(os.path.join(RAIZ, "tools", "respuestas", "*.json")):
    RESP.update(json.load(open(f, encoding="utf8")))
TEXTO, O = {}, {}
def _recoge(o):
    if isinstance(o, dict):
        if "id" in o and "opciones" in o: TEXTO[o["id"]] = o["enunciado"]; O[o["id"]] = o["opciones"]
        else: [_recoge(v) for v in o.values()]
    elif isinstance(o, list): [_recoge(v) for v in o]
_recoge(json.load(open(os.path.join(RAIZ, "tools", "preguntas.json"), encoding="utf8")))
def articulos(prec):
    m = re.match(r"Arts?\.\s*(.*?) de la Ley 39", prec)
    return {int(n) for n in re.findall(r"\d+", re.sub(r"(\d+)\.\d+", r"\1", m.group(1)))} if m else set()
# Una duración en las opciones: "10 días", "tres meses", "un año"...
DURACION = re.compile(r"\b(\d+|un|una|dos|tres|cuatro|cinco|seis|diez|quince|veinte|treinta)\s+(d[ií]as|mes(es)?|años?|horas)\b", re.I)
PLAZOS = set(range(29, 34)) | {21, 22, 23, 24, 40, 42, 43, 56, 65, 67, 68, 73, 77, 78, 80, 81, 82, 83, 87, 88, 90, 91, 94, 95, 96, 106, 107, 117, 118, 121, 122, 124, 125, 126}
PREGUNTAS["subsanacion"] = sorted(k for k, v in RESP.items() if articulos(v.get("precepto", "")) & {68, 73})
PREGUNTAS["plazos"] = sorted(k for k, v in RESP.items() if k in TEXTO and articulos(v.get("precepto", "")) & PLAZOS
                             and (articulos(v.get("precepto", "")) & set(range(29, 34)) or DURACION.search(" ".join(O[k]))))

esquemas, apuntes = {}, {}
for eid, (pdf, titulo, arts, bloque, grupo, mas) in ESQ.items():
    doc = fitz.open(os.path.join(RAIZ, "tools", "apuntes", pdf))
    paginas = []
    for i, pg in enumerate(doc, 1):
        pix = pg.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        ruta = "img/esquemas/%s-%d.png" % (eid, i)
        pix.save(os.path.join(RAIZ, ruta))
        paginas.append({"src": ruta, "w": pix.width, "h": pix.height})
    esquemas[eid] = {"titulo": titulo, "a": arts, "paginas": paginas}
    if mas: esquemas[eid]["mas"] = mas
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
