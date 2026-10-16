# 🌿 Sistema · Nodo Matriz

Código y formularios del sistema de gestión digital del **Nodo Matriz Agroecológico** (Unquillo, Sierras Chicas, Córdoba).

Este repositorio sirve dos propósitos:

1. **Hospedar los formularios** que la equipa, las proveedurías y los consumidores usan en cada edición. Se publican vía [GitHub Pages](https://pages.github.com/).
2. **Versionar los artefactos del sistema** — blueprints de Make, snippets de Apps Script — para que el sistema sea replicable por otros nodos de Economía Social.

El conjunto del sistema (datos en Google Sheets, automatizaciones en Make, formularios aquí) está documentado en el README del workbook `Nodo_Matriz_Sistema_v2.1.xlsx` que vive en el Drive del Nodo. Este README cubre solo la parte que vive en GitHub.

## Estructura del repositorio

```
/Sistema/
├── README.md                            ← este archivo
├── LICENSE                              ← licencia
├── .gitignore
│
├── escenarios_make/                     ← Blueprints exportados de Make
│   └── (vacío en Fase 1 · A1, A2, A3 se agregan al activarlos)
│
├── apps_script/                         ← Snippets de Google Apps Script
│   └── (vacío en Fase 1 · botón disparador de A3 se agrega al implementarlo)
│
└── docs/                                ← Carpeta servida por GitHub Pages
    ├── index.html                       ← Landing del sitio
    ├── assets/
    │   ├── styles.css                   ← Sistema de diseño cálido orgánico
    │   └── form-logic.js                ← Lógica común (sin frameworks)
    ├── forms/
    │   ├── stock.html                   ← Form A2 (productores)
    │   └── pedidos-DEMO.html            ← Demo del template de pedidos
    └── templates/
        └── pedidos.template.html        ← Template A3 con placeholders {{...}}
```

## Cómo desplegar el sitio en GitHub Pages

Pasos por única vez (configuración inicial del repo):

1. Subir el contenido de esta carpeta al repositorio `Nodo-Matriz/Sistema` en GitHub.
2. Ir a **Settings → Pages**.
3. En **Source** elegir **Deploy from a branch**.
4. **Branch:** `main` · **Folder:** `/docs` · Guardar.
5. Esperar 1-2 minutos. El sitio queda en:

```
https://nodo-matriz.github.io/Sistema/
```

A partir de ese momento, cada `git push` a `main` actualiza el sitio en menos de un minuto.

## URLs del sitio

| Recurso | URL |
| :---- | :---- |
| Landing | `https://nodo-matriz.github.io/Sistema/` |
| Form de stock (productor X) | `https://nodo-matriz.github.io/Sistema/forms/stock.html?id_productor=PROD001` |
| Form de pedidos (demo) | `https://nodo-matriz.github.io/Sistema/forms/pedidos-DEMO.html` |
| Form de pedidos (edición real) | `https://nodo-matriz.github.io/Sistema/forms/pedidos-ED20XX-XX.html` (lo genera A3) |

## Cómo funcionan los formularios

### `stock.html` — actualización de stock por proveedurías (escenario A2)

Cada lunes Make envía un WhatsApp a cada productor activo con un link a este form, incluyendo su `id_productor` como query string:

```
https://nodo-matriz.github.io/Sistema/forms/stock.html?id_productor=PROD007
```

El productor abre el link, agrega/edita sus productos (nombre, unidad, precio, disponibilidad, oferta) y envía el form. El submit hace POST a un webhook de Make con un JSON:

```json
{
  "id_productor": "PROD007",
  "enviado_en": "2026-05-06T10:30:00-03:00",
  "productos": [
    { "nombre": "Tomate cherry", "unidad": "kg", "precio": 1800, "disponible": true, "es_oferta": false }
  ],
  "notas": "Producción reducida esta semana"
}
```

Make procesa, actualiza la tabla `Productos` del Sheet y registra los cambios en `Log_Cambios_Stock`. Notifica al productor por WhatsApp.

### `pedidos-ED20XX-XX.html` — pedidos del consumidor (escenario A3)

Cada quincena, el escenario A3 de Make:

1. Lee los productos disponibles de la tabla `Productos` (filtrados por `disponible_edicion_actual = Sí`).
2. Los agrupa por categoría y los serializa como JSON.
3. Toma el archivo `templates/pedidos.template.html` y reemplaza los placeholders `{{...}}`.
4. Commitea el resultado como `forms/pedidos-ED20XX-XX.html` vía GitHub Contents API.
5. GitHub Pages publica el archivo automáticamente.
6. El link se envía al grupo de consumidores por WhatsApp.

**Diseño del form de pedidos:**

A diferencia de un carrito de e-commerce convencional, el form está estructurado como un **wizard de navegación obligatoria**: el consumidor pasa por cada categoría antes de poder cerrar el pedido. Esta decisión de diseño es deliberada y se alinea con la filosofía del Nodo:

- **No es un supermercado online.** El consumidor no busca lo que ya conoce; recorre lo que la red trae esta quincena.
- **Cada categoría es una invitación** a descubrir productos de estación, ofertas, productores que vuelven, novedades.
- El botón "Revisar pedido" solo aparece después de visitar todas las categorías.
- El resumen, los datos personales y el envío están en una sola pantalla al final.

### Placeholders del template

| Placeholder | Reemplazado por |
| :---- | :---- |
| `{{id_edicion}}` | `ED2026-09` |
| `{{numero_edicion}}` | `9` |
| `{{anio_edicion}}` | `2026` |
| `{{fecha_cierre_human}}` | `martes 14 de mayo, 12:00 hs` |
| `{{fecha_cierre_iso}}` | `2026-05-14T12:00:00-03:00` |
| `{{webhook_url}}` | URL del webhook B1 de Make |
| `{{aporte_default_porcent}}` | `10` |
| `{{alias_pago_nodo}}` | `nodomatriz.mp` |
| `{{categorias_json}}` | JSON serializado con todas las categorías y productos de la edición |

### Formato esperado de `{{categorias_json}}`

```json
[
  {
    "id": "verduras",
    "nombre": "Verduras",
    "descripcion": "Cooperativa San Carlos · variedad sujeta a cosecha",
    "productos": [
      {
        "id_producto": "PROD1001",
        "id_productor": "PROD050",
        "nombre": "Cebolla cobriza",
        "origen": "Mendoza",
        "unidad": "kg",
        "precio": 1200,
        "fraccionable": true,
        "fracciones": ["1/4", "1/2", "1", "2"],
        "es_oferta": false,
        "notas": ""
      }
    ]
  }
]
```

## Cómo probar localmente

Para ver `index.html`, `stock.html` o `pedidos-DEMO.html` localmente:

```bash
cd docs
python3 -m http.server 8000
```

Y abrir `http://localhost:8000/` en el navegador.

El form de demo (`pedidos-DEMO.html`) está pre-cargado con productos de ejemplo y el botón submit **no envía datos** (loggea el payload en la consola del navegador). Es útil para probar el flujo del wizard sin tener Make configurado.

## Stack técnico

| Capa | Herramienta | Por qué |
| :---- | :---- | :---- |
| HTML + CSS + JS | Sin frameworks | Cero build-step, cero dependencias, soberanía total |
| Hosting | GitHub Pages | Gratis sin tope para sitios públicos, versionado nativo |
| Tipografías | Fraunces + Atkinson Hyperlegible | Open source, alta legibilidad, carácter editorial |
| Backend | Make + Google Sheets | (Ver workbook en Drive) |

## Filosofía de diseño

- **Cero frameworks JavaScript.** Vanilla JS para que el código siga siendo legible por cualquier persona en cualquier momento, sin pipeline de build.
- **CSS nativo con variables.** Sistema de diseño centralizado en `styles.css` con paleta cálida orgánica, tipografía cuidada y micro-interacciones suaves.
- **Estética distintiva.** Tonos tierra, verde oliva y crema; tipografía editorial; sin grilletes corporativos. La interfaz debe sentirse hecha a mano, no plantilleada.
- **Datos en propiedad.** Los formularios envían a webhooks bajo control del Nodo; nunca a servicios externos opacos.

## Licencia

Este sistema se libera con licencia [MIT](LICENSE) para que otros nodos lo puedan adoptar, modificar y mejorar.

## Contacto

Nodo Matriz Agroecológico · Unquillo, Sierras Chicas · Córdoba, Argentina
