"""Lo que el profesor marca en Fuentes_Derecho_y_Ley39_fuente.html como muy preguntado, estrella o poco preguntado.

Los apuntes del profesor todavía no están completos: llegan a Fuentes del Derecho y a la Ley 39/2015 hasta el art. 111 (la revisión de oficio). Falta desde el art. 112 (recursos).
Cuando se actualice el HTML, se añaden aquí las marcas nuevas y se vuelve a ejecutar tools/construir.py.

Cada marca se ata a artículos de una norma concreta (Ley 39/2015, Código Civil, Constitución o Ley 50/1997 del Gobierno).
Una pregunta recibe la marca si su precepto cita ese artículo de esa norma
(o ese apartado: "5.3" atrapa "art. 5.3" y "art. 5.3.a)", pero no "art. 5.4").
Si a una pregunta le tocan varias, gana la de más nivel: estrella, luego clave, luego poco.
Entre dos del mismo nivel gana la que va antes en la lista: por eso las concretas van delante de las generales.
Solo se aplica a preguntas de Fuentes del Derecho y de la Ley 39/2015.

Para añadir una marca: una línea más en MARCAS con (nivel, norma, artículos, lo que dice el profesor).
Normas: L39, CC (Código Civil), CE (Constitución), L50 (Ley 50/1997 del Gobierno).
Los artículos van separados por comas; "75-83" es un rango de artículos enteros.
"""
import re

NIVELES = {"estrella": 3, "clave": 2, "poco": 1}

MARCAS = [
    # ---------- Estrella ----------
    ("estrella", "L50", "24.1", "Según el profesor, este apartado tiene una trascendencia absoluta: la forma que adopta cada decisión del Gobierno y, sobre todo, su rango."),

    # ---------- Fuentes del Derecho ----------
    ("clave", "CC", "1.5", "Pregunta clásica de examen: los tratados internacionales."),
    ("clave", "CC", "2.1", "Pregunta clara de examen: la ley entra en vigor a los 20 días naturales (no hábiles) de su completa publicación, si ella no dice otra cosa."),
    ("clave", "CC", "1, 2", "Lo más preguntado del tema de fuentes: los arts. 1 y 2 del Código Civil."),
    ("clave", "CE", "81", "Pregunta clara de examen: ley orgánica y ley ordinaria tienen el mismo rango; lo que cambia es la materia."),
    ("clave", "CE", "82.1", "Primera pregunta de examen de los decretos legislativos."),
    ("clave", "CE", "82.2", "La pregunta de examen principal del apartado: ley de bases o ley ordinaria, según el texto que vaya a hacer el Gobierno."),
    ("clave", "CE", "86.2", "Datos de examen de la convalidación de los decretos-leyes por el Congreso."),
    ("poco", "L50", "26", "En clase se saltó: el profesor dice que el procedimiento de elaboración de normas no es de lo más habitual en el examen."),

    # ---------- Ley 39/2015 ----------
    ("clave", "L39", "1.2", "Muy preguntado: qué solo puede hacer una ley y qué puede hacer un reglamento con el procedimiento."),
    ("clave", "L39", "3, 4", "Según el profesor, los arts. 3 y 4 son muy preguntados."),
    ("clave", "L39", "5.3", "Pregunta «a fuego»: cuándo hay que acreditar la representación."),
    ("clave", "L39", "7", "Pregunta «regalo», pero con trampa."),
    ("clave", "L39", "22.1", "Pregunta clara de examen: los casos de suspensión potestativa del plazo para resolver."),
    ("clave", "L39", "33", "Pregunta de examen: con urgencia se reducen a la mitad todos los plazos menos los de solicitudes y recursos."),
    ("clave", "L39", "35.1.h", "Trampa muy preguntada: en responsabilidad patrimonial solo se motiva la resolución; en el sancionador, la propuesta y la resolución."),
    ("clave", "L39", "35", "La pregunta de examen de la motivación: qué actos hay que motivar."),
    ("clave", "L39", "40.1, 40.2", "Pregunta de examen: quién notifica y en qué plazo. Ojo a la literalidad: 10 días «a partir de que el acto haya sido dictado»."),
    ("clave", "L39", "13, 53", "En el examen mezclan los derechos de las personas (art. 13) con los del interesado (art. 53): hay que saber cuál es cuál."),
    ("clave", "L39", "65", "Pregunta de examen: la responsabilidad patrimonial también puede iniciarse de oficio."),
    ("clave", "L39", "66.4, 66.5, 66.6", "Pregunta «clarísima»: el modelo masivo es un deber de la Administración y de uso voluntario; el específico es obligatorio."),
    ("clave", "L39", "67.1", "La trampa típica del supuesto práctico: el plazo de un año para reclamar."),
    ("clave", "L39", "76", "Muy preguntado: no confundir el art. 76.1 con el 76.2."),
    ("clave", "L39", "77.7", "Pregunta de examen: el informe se incluye en la propuesta de resolución no siempre, solo cuando sea el fundamento básico de la decisión."),
    ("clave", "L39", "85", "Dos trampas de supuesto práctico en la terminación de los sancionadores."),
    ("clave", "L39", "87", "Muy preguntado: las actuaciones complementarias."),
    ("clave", "L39", "75-83", "La instrucción es, según el profesor, de lo más preguntado, en la práctica y en la oposición."),

    # ---------- Ley 39/2015, arts. 88 a 111 (finalización, ejecución y revisión de oficio) ----------
    ("estrella", "L39", "91.3", "«Super IMP», pregunta clarísima de examen y de supuesto práctico: pasados seis meses desde el inicio sin resolución ni acuerdo, silencio desestimatorio. Es uno de los cuatro casos de silencio negativo del art. 24."),
    ("clave", "L39", "92", "Marcado como IMP: resuelve el Ministro respectivo (no el Secretario de Estado). El Consejo de Ministros solo en los casos del art. 32.3 de la Ley 40/2015 o si una ley lo dispone."),
    ("clave", "L39", "94.2", "Marcado como IMP: el desistimiento o la renuncia de uno de varios firmantes solo le afecta a él."),
    ("clave", "L39", "95.1", "Pregunta de examen: la advertencia y los 3 meses. Y contra la resolución que declara la caducidad sí caben recursos, que es donde se falla."),
    ("clave", "L39", "95.3", "Marcado como IMP: la caducidad no produce por sí sola la prescripción y el procedimiento caducado no la interrumpe."),
    ("clave", "L39", "96.2", "Marcado como IMP: si alguno de los interesados se opone expresamente, se sigue la tramitación ordinaria."),
    ("clave", "L39", "96.5", "Único caso en que no cabe oposición expresa: el sancionador que se puede calificar como leve."),
    ("clave", "L39", "96", "La tramitación simplificada se usa poco en la práctica, pero en los exámenes sí aparece, incluso en el supuesto práctico."),
    ("clave", "L39", "100", "La principal pregunta de examen del capítulo de ejecución: los cuatro medios de ejecución forzosa y la proporcionalidad."),
    ("clave", "L39", "106.1", "Marcado como IMP: la nulidad se declara en cualquier momento, de oficio o a solicitud, y con dictamen favorable del Consejo de Estado."),
    ("clave", "L39", "106.3", "Marcado como IMP: se inadmiten a trámite, motivadamente y sin dictamen, las solicitudes sin fundamento."),
    ("clave", "L39", "106.5", "Marcado como IMP: seis meses. De oficio caduca; a solicitud del interesado se entiende desestimada."),
    ("clave", "L39", "107.2", "Pregunta de examen: la lesividad no puede declararse pasados 4 años desde que se dictó el acto. Y la declaración de lesividad no es recurrible (marcado como IMP)."),
    ("poco", "L39", "110", "Anotación del profesor: «No lo preguntan mucho»."),
]

BLOQUES_L39 = {"interesados", "actividad", "plazos", "actos", "nulidad", "iniciacion", "instruccion",
               "finalizacion", "revision", "recursos", "iniciativa"}


def _specs(texto):
    """'40.1, 40.2' -> [('40', '1'), ('40', '2')]; '75-83' -> un spec por artículo."""
    res = []
    for parte in texto.split(","):
        parte = parte.strip()
        m = re.fullmatch(r"(\d+)-(\d+)", parte)
        if m:
            res += [(str(a), "") for a in range(int(m.group(1)), int(m.group(2)) + 1)]
        else:
            art, _, ap = parte.partition(".")
            res.append((art, ap))
    return res


def _norma(trozo):
    if re.search(r"Ley\s*39/2015|\bLPAC", trozo):
        return "L39"
    if re.search(r"C[óo]digo Civil|\bCC\b", trozo):
        return "CC"
    if re.search(r"Ley\s*50/1997|Ley del Gobierno", trozo):
        return "L50"
    if re.search(r"\bCE\b|Constituci[óo]n", trozo):
        return "CE"
    if re.search(r"\bLey\b|\bRD\b|\bReal Decreto\b|\bLRJSP\b", trozo):
        return "otra"
    return None


def citas(precepto, por_defecto):
    """Artículos que cita un precepto, con su norma: 'Art. 86 CE y art. 24.1.a) de la Ley 50/1997'
    -> {('CE','86',''), ('L50','24','1.a')}. Sin norma escrita se toma la del bloque."""
    res = set()
    for trozo in re.split(r";|\s+y\s+(?=arts?\b)|,\s*(?=arts?\b)", precepto, flags=re.I):
        m = re.search(r"\barts?\b\.?\s*(.*)", trozo, re.I)
        if not m:
            continue
        norma = _norma(trozo) or por_defecto
        if not norma:
            continue
        nums = re.split(r"\s(?:de la|del|de)\s|\bCE\b|\bCC\b|\bLey\b|Constituci", m.group(1))[0]
        for n in re.finditer(r"(\d+)((?:\.\w+)*)\)?(?:\s*(?:a|-)\s*(\d+))?", nums):
            a = int(n.group(1))
            if n.group(3) and not n.group(2):
                b = int(n.group(3))
                if b - a <= 20:
                    res.update((norma, str(x), "") for x in range(a, b + 1))
                continue
            res.add((norma, str(a), n.group(2).lstrip(".")))
    return res


def _toca(cita, norma, spec):
    c_norma, art, ap = cita
    s_art, s_ap = spec
    if c_norma != norma or art != s_art:
        return False
    return not s_ap or ap == s_ap or ap.startswith(s_ap + ".")


def marca(p):
    """Devuelve {'nivel': ..., 'nota': ...} o None."""
    bloque = p.get("bloque", "")
    if bloque == "fuentes":
        defecto = None
    elif bloque in BLOQUES_L39:
        defecto = "L39"
    else:
        return None
    cs = citas(p.get("precepto") or "", defecto)
    mejor = None
    for nivel, norma, arts, nota in MARCAS:
        if any(_toca(c, norma, s) for c in cs for s in _specs(arts)):
            if not mejor or NIVELES[nivel] > NIVELES[mejor[0]]:
                mejor = (nivel, nota)
    return {"nivel": mejor[0], "nota": mejor[1]} if mejor else None
