# Test de oposición C1 AGE: Ley 39/2015

Exámenes tipo test con todas las respuestas explicadas. Cuatro acordeones: Ley 39/2015 (LPAC), Ley 40/2015 (LRJSP), Fuentes del Derecho y Contratos, subvenciones y políticas sociales (este último solo en Supuestos).

Se publica tal cual en GitHub Pages: no necesita compilar nada. Solo hay que subir `index.html`, `css`, `js` y `data`.

## Añadir o actualizar preguntas

1. `tools/normalizar.py` limpia el JSON de origen y crea `tools/preguntas.json`.
2. Las respuestas razonadas van en `tools/respuestas/*.json`, por id de pregunta (método en `tools/trabajo/INSTRUCCIONES.md`). Una pregunta repetida en otro test hereda la respuesta de la primera.
3. `python3 tools/construir.py` valida y genera `data/ley39.js`, `data/ley40.js`, `data/fuentes.js` y `data/contratos.js`. Solo entran las preguntas con respuesta.

Sube el número `?v=` en `index.html` cuando cambien los datos, para que el móvil no use la versión antigua guardada.

## Lo que más cae

El profesor marca en `Fuentes_Derecho_y_Ley39_fuente.html` lo que más se pregunta (recuadros «Pregunta de examen», frases como «muy preguntado», «a fuego», «clarísima») y lo que casi no cae. Esas marcas están en `tools/marcas.py`, cada una atada a sus artículos y a su norma (Ley 39/2015, Código Civil, Constitución o Ley 50/1997), y `construir.py` se las pone a las preguntas cuyo precepto los cite. Hay tres niveles: Estrella del profesor, Clave de examen y Poco preguntado.

Los apuntes del profesor todavía no están completos: de momento llegan a Fuentes del Derecho y a la Ley 39/2015 hasta el art. 87. Cuando se actualice el HTML, se añaden las marcas nuevas a `MARCAS` en `tools/marcas.py` y se vuelve a ejecutar `construir.py`.

No es una procedencia: la pregunta sigue siendo Oficial, de Votaciones o la que sea, y además lleva la marca. En Examen, la casilla «Solo estrella y clave de examen» deja solo esas preguntas; sin marcarla, salen mezcladas con el resto. La marca se ve en la cabecera de la pregunta y en Soluciones, donde la justificación dice además qué comentó el profesor.

## Estadísticas

Cada tema y bloque muestra preguntas dominadas, falladas y pendientes. En Examen solo salen las pendientes: una pregunta acertada ya no vuelve a salir y una fallada solo sale en «Repasar solo las falladas» (si la aciertas ahí, pasa a dominada). Las que dejas en blanco siguen pendientes. Cuando quedan menos pendientes que el número elegido, el examen se hace con las que quedan. «Reiniciar estadísticas» lo pone todo a cero y vuelven a salir todas.

Todo se guarda en el navegador con claves `test-c1-*`, para no mezclarse con el test de contratos, que está publicado en el mismo dominio y usa `contratos-*`.

## Supuestos

Los supuestos de cada tema salen en tres grupos: Ejercicios de clase, Exámenes de clase y Supuestos prácticos. Los ejercicios sin enunciado ("Ejercicio nº 11 - Plazos administrativos") y los "Examen nº N" de clase salen en Examen y también en Supuestos. Se elige cuáles en `como_supuesto()` de `tools/construir.py`. Sus preguntas son las mismas, así que las estadísticas se comparten.

## Apuntes

La pantalla principal tiene tres pestañas: Examen, Supuestos y Apuntes. Apuntes muestra los esquemas ordenados como el temario, con visor de zoom y arrastre, buscador por tema o por artículo y el botón «Consultar apuntes» en la justificación de las preguntas que tienen esquema.

Los esquemas son PDF en `tools/apuntes/`. `python3 tools/esquemas.py` (necesita PyMuPDF) los pasa a imágenes en `img/esquemas/` y genera `data/esquemas.js`. Para añadir uno, se mete el PDF, se da de alta en `ESQ` (título, artículos y bloque) y se listan en `PREGUNTAS` los ids de las preguntas que lo enseñan (o una regla que los saque del artículo que cita su precepto, como en los de subsanación y plazos). Hoy hay tres: art. 85 (terminación en los sancionadores), art. 68 frente a art. 73 (subsanación y trámites) y repaso de plazos. El campo `mas` de un esquema añade artículos solo para el buscador.

## Movimiento

Las animaciones van en `js/movimiento.js`, con GSAP 3.13 y su plugin Flip copiados en `js/vendor/` (sin CDN, se publican con el resto).
`pintar(tipo)` decide qué se anima: `"entrar"` (pantalla nueva), `"adelante"` y `"atras"` (otra pregunta), `"pestana"` y `"plegar"`.
Sin tipo es un refresco de la misma pantalla y no se mueve nada. Con "reducir movimiento" activado en el sistema no se anima nada,
y si GSAP no carga la app funciona igual.
