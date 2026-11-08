# Test de oposición C1 AGE

Exámenes tipo test con todas las respuestas explicadas. Temas: Ley 39/2015, Ley 40/2015, Fuentes del Derecho; Contratos, subvenciones y políticas sociales.

Se publica tal cual en GitHub Pages: no necesita compilar nada. Solo hay que subir `index.html`, `css`, `js` y `data`.

## Añadir o actualizar preguntas

1. `tools/normalizar.py` limpia el JSON de origen y crea `tools/preguntas.json`.
2. Las respuestas razonadas van en `tools/respuestas/*.json`, por id de pregunta.
3. `python3 tools/construir.py` valida y genera `data/ley39.js`, `data/ley40.js`, `data/fuentes.js` y `data/contratos.js`. Solo entran las preguntas con respuesta.

Para un tema nuevo (por ejemplo, Contratos): un archivo más en `data/` y su línea `<script>` en `index.html`.
