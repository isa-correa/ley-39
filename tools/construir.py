#!/usr/bin/env python3
"""Une preguntas y respuestas razonadas en data/ley39.js, ley40.js, fuentes.js y contratos.js.
Solo entran las preguntas con respuesta. Si algo no cuadra, avisa y para."""
import glob, json, re, sys
D = json.load(open("tools/preguntas.json", encoding="utf8"))
R = {}
for f in sorted(glob.glob("tools/respuestas/*.json")):
    R.update(json.load(open(f, encoding="utf8")))
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
err, salida = [], []
for p in D["preguntas"]:
    r = R.get(p["id"])
    if not r:
        continue
    if len(r["justificaciones"]) != len(p["opciones"]):
        err.append(f"{p['id']}: {len(r['justificaciones'])} justificaciones para {len(p['opciones'])} opciones")
    if not 0 <= r["correcta"] < len(p["opciones"]):
        err.append(f"{p['id']}: correcta fuera de rango")
    if r["bloque"] not in validos:
        err.append(f"{p['id']}: bloque {r['bloque']}")
    if re.search("[—–]", json.dumps(r, ensure_ascii=False)):
        err.append(f"{p['id']}: lleva raya o semirraya")
    salida.append({**p, **r})
# La misma pregunta en dos tests: misma respuesta, y en los exámenes solo sale una.
norm = lambda x: re.sub(r"\W+", "", x.lower())
grupos = {}
for p in salida:
    grupos.setdefault(norm(p["enunciado"]) + "|" + "|".join(sorted(map(norm, p["opciones"]))), []).append(p)
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
total = {}
for p in D["preguntas"]:
    if "caso" in p:
        total[p["caso"]] = total.get(p["caso"], 0) + 1
hechas = {}
for p in salida:
    if "caso" in p:
        hechas[p["caso"]] = hechas.get(p["caso"], 0) + 1
casos = [c for k, c in D["casos"].items() if hechas.get(k) == total.get(k)]
ok = {c["id"] for c in casos}
salida = [p for p in salida if "caso" not in p or p["caso"] in ok]
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
