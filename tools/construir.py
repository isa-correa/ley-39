#!/usr/bin/env python3
"""Une preguntas y respuestas razonadas en data/ley39.js, ley40.js, fuentes.js y contratos.js.
Solo entran las preguntas con respuesta. Si algo no cuadra, avisa y para.
Uso (desde la raíz del proyecto): python3 tools/construir.py"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from marcas import marca  # lo que el profesor marca como muy preguntado o poco preguntado
D = json.load(open("tools/preguntas.json", encoding="utf8"))
R = {}
for f in sorted(glob.glob("tools/respuestas/*.json")):
    R.update(json.load(open(f, encoding="utf8")))
# Ejercicios de refuerzo: hechos aparte (no vienen del JSON de origen). Cada archivo trae su caso, sus preguntas
# y sus respuestas juntas. Ids: <id del caso>-NNN. Salen en Supuestos, en el grupo «Ejercicios nuevos (hechos por Claude)», y cada pregunta lleva el origen «Hecho por Claude».
for f in sorted(glob.glob("tools/refuerzo/*.json")):
    x = json.load(open(f, encoding="utf8"))
    c = x["caso"]
    D["casos"][c["id"]] = {**c, "refuerzo": True}
    D["calendarios"].update(x.get("calendarios", {}))
    for q in x["preguntas"]:
        pid = f"{c['id']}-{q['n']:03d}"
        D["preguntas"].append({"id": pid, "origen": "refuerzo", "test": c["titulo"], "n": q["n"], "enunciado": q["enunciado"],
                               "opciones": q["opciones"], "caso": c["id"], **({"calendario": q["calendario"]} if q.get("calendario") else {})})
        R[pid] = {k: q[k] for k in ("bloque", "precepto", "correcta", "correctas", "justificaciones", "ojo", "revisar") if k in q}
BLOQUES = [("fuentes", "Fuentes del Derecho"), ("interesados", "Interesados y representación (arts. 1 a 12)"),
           ("actividad", "Actividad de las Administraciones y silencio (arts. 13 a 28)"),
           ("plazos", "Términos y plazos (arts. 29 a 33)"), ("actos", "Actos y notificación (arts. 34 a 46)"),
           ("nulidad", "Nulidad y anulabilidad (arts. 47 a 52)"), ("iniciacion", "Iniciación (arts. 53 a 69)"),
           ("instruccion", "Ordenación e instrucción (arts. 70 a 83)"),
           ("finalizacion", "Finalización y ejecución (arts. 84 a 105)"), ("revision", "Revisión de oficio (arts. 106 a 111)"),
           ("recursos", "Recursos administrativos (arts. 112 a 126)"), ("iniciativa", "Iniciativa legislativa (arts. 127 a 133)"),
           ("organos", "Órganos y competencia (Ley 40/2015, arts. 5 a 22)"),
           ("responsabilidad", "Potestad sancionadora y responsabilidad patrimonial (Ley 40/2015, arts. 25 a 37)"),
           ("sector", "Sector público institucional y convenios (Ley 40/2015)")]
# Segundo tema: Ley 9/2017 de Contratos del Sector Público y materias afines.
BLOQUES_C = [("lcsp-general", "Contratos: objeto, ámbito y tipos (LCSP, arts. 1 a 27)"),
             ("lcsp-disposiciones", "Contratos: disposiciones generales, invalidez y recurso especial (LCSP, arts. 28 a 60)"),
             ("lcsp-preparacion", "Contratos: partes, objeto, precio y garantías (LCSP, arts. 61 a 130)"),
             ("lcsp-adjudicacion", "Contratos: adjudicación y procedimientos (LCSP, arts. 131 a 187)"),
             ("lcsp-ejecucion", "Contratos: efectos, ejecución y extinción (LCSP, arts. 188 a 230)"),
             ("lcsp-tipos", "Contratos: obras, concesiones, suministros y servicios (LCSP, arts. 231 a 315)"),
             ("lcsp-otros", "Contratos: organización administrativa (LCSP, arts. 316 a 347)"),
             ("subvenciones", "Ley General de Subvenciones (Ley 38/2003)"),
             ("social", "Discapacidad, dependencia e igualdad")]
CASOS_C = {"caso-43"}  # Supuesto mixto de Ley 39 y Contratos: va con el tema de Contratos
validos = {b for b, _ in BLOQUES + BLOQUES_C}
norm = lambda x: re.sub(r"\W+", "", x.lower())
clave = lambda p: norm(p["enunciado"]) + "|" + "|".join(sorted(map(norm, p["opciones"])))
# Una pregunta repetida en otro test hereda la respuesta de la primera que se respondió.
primera = {}
for p in D["preguntas"]:
    if p["id"] in R:
        primera.setdefault(clave(p), p["id"])
for p in D["preguntas"]:
    if p["id"] not in R and clave(p) in primera:
        R[p["id"]] = R[primera[clave(p)]]
err, salida = [], []
for p in D["preguntas"]:
    r = R.get(p["id"])
    if not r:
        continue
    if len(r["justificaciones"]) != len(p["opciones"]):
        err.append(f"{p['id']}: {len(r['justificaciones'])} justificaciones para {len(p['opciones'])} opciones")
    if not 0 <= r["correcta"] < len(p["opciones"]):
        err.append(f"{p['id']}: correcta fuera de rango")
    if "correctas" in r:  # respuesta múltiple: solo se usa en supuestos concretos
        c = r["correctas"]
        if not (isinstance(c, list) and len(c) >= 2 and c == sorted(set(c)) and all(isinstance(i, int) and 0 <= i < len(p["opciones"]) for i in c) and r["correcta"] == c[0]):
            err.append(f"{p['id']}: correctas no válidas")
        if "caso" not in p:
            err.append(f"{p['id']}: la respuesta múltiple solo vale en supuestos")
    if r["bloque"] not in validos:
        err.append(f"{p['id']}: bloque {r['bloque']}")
    if re.search("[—–]", json.dumps(r, ensure_ascii=False)):
        err.append(f"{p['id']}: lleva raya o semirraya")
    q = {**p, **r}
    m = marca(q)
    if m:
        q["marca"] = m
    salida.append(q)
# La misma pregunta en dos tests: misma respuesta, y en los exámenes solo sale una.
grupos = {}
for p in salida:
    grupos.setdefault(clave(p), []).append(p)
for g in grupos.values():
    if len(g) > 1:
        if len({norm(p["opciones"][p["correcta"]]) for p in g}) > 1:
            err.append("respuesta distinta en la misma pregunta: " + ", ".join(p["id"] for p in g))
        for p in g:
            p["dup"] = g[0]["id"]
fantasma = set(R) - {p["id"] for p in D["preguntas"]}
if fantasma:
    err.append(f"ids desconocidos: {sorted(fantasma)}")
if err:
    sys.exit("\n".join(err))

# ---------- Formato del enunciado de los casos ----------
# El texto original viene en una sola línea. Aquí se parte en párrafos, viñetas y apartados.
ABREV = re.compile(r"(?:\b[A-ZÁÉÍÓÚ]|\bS\.L|\bS\.A|\bO\.A|\bS\.M\.E|\bA\.A\.I|\bF\.S\.P|\bE\.P\.E|\bart|\barts|\bnúm|\bSr|\bSra|\betc|\bnº)\.$")
CABECERAS = ["Servicio de calibración de equipos de medida", "Adquisición de uniformes",
             "Impresión de material educativo", "Obras de reparación de la oficina de asistencia en materia de registro"]
ARRANQUES = ("En primer lugar", "En segundo lugar", "En tercer lugar", "Además", "En relación con el supuesto",
             "En relación con la situación", "Otros contratos", "Por otro lado", "Finalmente", "Por último")

def frases(t):
    out, ini = [], 0
    for m in re.finditer(r"(?<=[.!?:;]) (?=[A-ZÁÉÍÓÚÑ¿¡«“])", t):
        if ABREV.search(t[ini:m.start()]):
            continue
        out.append(t[ini:m.start()]); ini = m.end()
    out.append(t[ini:])
    return out

def trocear(p, tope=420):
    if len(p) <= tope or p.startswith("- ") or re.match(r"[a-e]\) ", p):
        return [p]
    res, cur = [], ""
    for f in frases(p):
        if cur and len(cur) + len(f) > tope:
            res.append(cur); cur = f
        else:
            cur = (cur + " " + f).strip()
    res.append(cur)
    return res

def dar_formato(t):
    if "\n" in t:
        return t
    for c in CABECERAS:
        t = re.sub(r"(?<=\d\. )" + re.escape(c) + " ", c + "\n", t)
    t = re.sub(r" (?=Publicación \d )", "\n", t)
    t = re.sub(r"(Publicación \d) (?=[A-ZÁÉÍÓÚ])", r"\1\n", t)
    t = re.sub(r"(?<=[.:]) (?=- [A-ZÁÉÍÓÚÑ¿¡])", "\n", t)
    t = re.sub(r" (?=- [A-ZÁÉÍÓÚÑ¿¡])", "\n", t)
    t = re.sub(r"(?<=[:.;]) (?=a\) [A-ZÁÉÍÓÚ])", "\n", t)
    t = re.sub(r"(?<=[.;]) (?=[b-e]\) [A-ZÁÉÍÓÚ])", "\n", t)
    t = re.sub(r"(?<=[.:]) (?=\d\. [A-ZÁÉÍÓÚ])", "\n", t)
    t = re.sub(r"(?<=[.:]) (?=(?:" + "|".join(ARRANQUES) + r")\b)", "\n", t)
    partes = []
    for linea in t.split("\n"):
        partes += trocear(linea.strip())
    return "\n".join(x for x in partes if x)

total = {}
for p in D["preguntas"]:
    if "caso" in p:
        total[p["caso"]] = total.get(p["caso"], 0) + 1
hechas = {}
for p in salida:
    if "caso" in p:
        hechas[p["caso"]] = hechas.get(p["caso"], 0) + 1
casos = [{**c, "texto": dar_formato(c.get("texto", ""))} for k, c in D["casos"].items() if hechas.get(k) == total.get(k)]
ok = {c["id"] for c in casos}
salida = [p for p in salida if "caso" not in p or p["caso"] in ok]

# Los ejercicios de clase sin enunciado ("Ejercicio nº 11 - ...") y los "Examen nº N" salen en Examen y también en Supuestos.
# Son las mismas preguntas, así que las estadísticas se comparten.
def como_supuesto(t):
    return bool(re.match(r"(Ejercicio(?: nº)? ?\d+\s*\.?-|Examen nº ?\d+)", t))
por_test = {}
for p in salida:
    if "caso" not in p and p["origen"] == "practicas" and como_supuesto(p["test"]):
        por_test.setdefault(p["test"], []).append(p)
for t, ps in por_test.items():
    ps.sort(key=lambda p: p["n"])
    casos.append({"id": "test-" + ps[0]["id"].split("-")[1], "titulo": t, "texto": "", "corto": True, "ids": [p["id"] for p in ps]})
def tema(id_, nombre, bloques, pred):
    ps = [p for p in salida if pred(p)]
    cs = [c for c in casos if pred({"caso": c["id"], "bloque": None})]
    return {"id": id_, "nombre": nombre, "bloques": [{"id": a, "nombre": b} for a, b in bloques],
            "calendarios": D["calendarios"], "casos": cs, "preguntas": ps}
bc = {b for b, _ in BLOQUES_C}
def es_c(p):
    return p["caso"] in CASOS_C if p.get("caso") else p["bloque"] in bc
# Ley 39, Ley 40 y Fuentes del Derecho son tres temas (tres acordeones). Los supuestos prácticos van con la Ley 39.
B40 = {"organos", "responsabilidad", "sector"}
BFU = {"fuentes"}
def es_fu(p):
    return not p.get("caso") and p["bloque"] in BFU
def es_40(p):
    return not p.get("caso") and p["bloque"] in B40
def es_39(p):
    return not es_c(p) and not es_fu(p) and not es_40(p)
def escribir(t, ruta):
    with open(ruta, "w", encoding="utf8") as f:
        f.write("window.BANCO = window.BANCO || [];\nwindow.BANCO.push(" + json.dumps(t, ensure_ascii=False, separators=(",", ":")) + ");\n")
    print(len(t["preguntas"]), "preguntas ·", len(t["casos"]), "casos ·", ruta)
escribir(tema("ley39", "Ley 39/2015, del Procedimiento Administrativo Común (LPAC)", [b for b in BLOQUES if b[0] not in B40 | BFU], es_39), "data/ley39.js")
escribir(tema("ley40", "Ley 40/2015, de Régimen Jurídico del Sector Público (LRJSP)", [b for b in BLOQUES if b[0] in B40], es_40), "data/ley40.js")
escribir(tema("fuentes", "Fuentes del Derecho", [b for b in BLOQUES if b[0] in BFU], es_fu), "data/fuentes.js")
escribir(tema("contratos", "Contratos, subvenciones y políticas sociales", BLOQUES_C, es_c), "data/contratos.js")
print(len(salida), "preguntas en la app de", len(D["preguntas"]), "·", len(casos), "casos")
