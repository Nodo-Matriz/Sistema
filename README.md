# Web pública del Nodo Matriz · nodomatriz.ar

Sitio informativo del Nodo. El sistema de la edición (formularios, guía,
galpón) vive en otro repositorio (`Sistema`) y se sirve en
`webapp.nodomatriz.ar`.

## Cómo actualizar el contenido (desde github.com, sin instalar nada)

### Novedades
Abrir `contenido/novedades.json` → ícono del lápiz → agregar un bloque **arriba**
de los demás, con la misma forma, y separado del siguiente por una coma:

```json
  {
    "fecha": "2026-10-14",
    "titulo": "Título corto",
    "texto": "Primer párrafo.\n\nSegundo párrafo."
  },
```

- La fecha va como `AAAA-MM-DD`. La página las ordena sola, la más nueva primero.
- `\n\n` separa párrafos. Las comillas dentro del texto van como `\"`.
- Guardar con **Commit changes**. En 1 o 2 minutos se ve en la web.
- Si la web deja de mostrar las novedades, casi siempre es una coma de más o de
  menos: revisar el último cambio.

### Fotos
1. Entrar a la carpeta `fotos` → **Add file → Upload files** → subir las fotos
   (JPG, idealmente de menos de 500 KB cada una; con el celular, "tamaño
   mediano" alcanza). Nombres sin espacios: `galpon-armado.jpg`.
2. Abrir `contenido/fotos.json` y listarlas:

```json
[
  { "archivo": "galpon-armado.jpg", "texto": "Armado de cajones en el galpón" },
  { "archivo": "feria-junio.jpg", "texto": "Productoras de la red" }
]
```

Antes de publicar fotos con personas, pedirles permiso.

### WhatsApp e Instagram
En `index.html`, buscar `var CONTACTO` y pegar los links entre las comillas.
Si quedan vacíos, los botones no aparecen.

## Archivos
- `index.html`: la página.
- `404.html`: si alguien entra con un link viejo del sistema
  (`nodomatriz.ar/forms/...`), lo reenvía a `webapp.nodomatriz.ar`.
- `CNAME`: lo crea GitHub solo al configurar el dominio (`nodomatriz.ar`). No borrarlo.
