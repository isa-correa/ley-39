#!/usr/bin/env python3
"""Une preguntas y respuestas razonadas en data/ley39-fuentes.js.
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
           ("recursos", "Recursos administrativos (arts. 112 a 126)"), ("iniciativa", "Iniciativa legislativa (arts. 127 a 133)")]
validos = {b for b, _ in BLOQUES}
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
tema = {"id": "ley39", "nombre": "Ley 39/2015 + Fuentes del Derecho", "bloques": [{"id": a, "nombre": b} for a, b in BLOQUES],
        "calendarios": D["calendarios"], "casos": casos, "preguntas": salida}
with open("data/ley39-fuentes.js", "w", encoding="utf8") as f:
    f.write("window.BANCO = window.BANCO || [];\nwindow.BANCO.push(" + json.dumps(tema, ensure_ascii=False, separators=(",", ":")) + ");\n")
print(len(salida), "preguntas en la app de", len(D["preguntas"]), "·", len(casos), "casos")
