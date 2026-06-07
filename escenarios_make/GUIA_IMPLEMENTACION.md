# 🔧 Guía de implementación · Blueprints de Make

Esta guía acompaña los 4 blueprints de la carpeta `escenarios_make/`. Explica cómo importarlos, qué reemplazar, y en qué orden activarlos.

> **Importante leer primero:** los blueprints son un **punto de partida estructural**, no un sistema llave en mano. Make es muy sensible al formato interno y a las versiones de los módulos. Al importar, es muy probable que tengas que: reconectar las conexiones (siempre), revisar los mapeos de columnas (porque dependen de la estructura exacta de cada hoja), y en algunos casos reconstruir un módulo si Make no lo reconoce. Tomá esto como un andamiaje que te ahorra el 70% del trabajo, no el 100%.

---

## Orden recomendado de implementación

```
1. A2  (el más simple, sin dependencias salientes)  ← empezar aquí
2. A3  (genera el form, depende de GitHub)
3. B1  (captura pedidos, cierra el ciclo)
4. A1  (requiere WhatsApp aprobado — dejar para el final)
```

A2, A3 y B1 se pueden probar **sin WhatsApp**. A1 necesita los templates de Meta aprobados, que es lo que más tarda.

---

## Paso 0 — Preparación

Antes de importar cualquier blueprint:

1. **Subí el workbook a Google Sheets** si no lo hiciste. Anotá el `spreadsheet_id` (lo tenés: `1nlSIDb7veJoO8-WpiTD_Z_oK-whwANFazLL4cTSMTUg`).
2. **Creá las conexiones en Make** (una sola vez, se reutilizan):
   - *Google Sheets*: Make → Connections → Add → Google Sheets → autorizar con la cuenta del Nodo.
   - *GitHub*: Make → Connections → Add → GitHub → autorizar (o pegar un Personal Access Token nuevo con scope `repo`).
   - *WhatsApp Business Cloud*: cuando tengas Meta configurado.

---

## Cómo importar un blueprint

1. En Make: **Create a new scenario**.
2. Clic en los tres puntos `⋯` abajo → **Import Blueprint**.
3. Subí el archivo `.json`.
4. El escenario aparece con los módulos conectados.
5. **Reconectá cada módulo** que tenga el ícono de advertencia: clic en el módulo → elegí la conexión correcta del desplegable.

---

## Placeholders a reemplazar (todos los blueprints)

| Placeholder | Qué poner | Dónde se consigue |
| :---- | :---- | :---- |
| `REEMPLAZAR_CONEXION_SHEETS` | Tu conexión Google Sheets | La creaste en Paso 0 |
| `REEMPLAZAR_CONEXION_GITHUB` | Tu conexión GitHub | La creaste en Paso 0 |
| `REEMPLAZAR_CONEXION_WHATSAPP` | Tu conexión WhatsApp | Cuando Meta esté listo |
| `REEMPLAZAR_SPREADSHEET_ID` | `1nlSIDb7veJoO8-WpiTD_Z_oK-whwANFazLL4cTSMTUg` | Ya lo tenés |
| `REEMPLAZAR_PHONE_NUMBER_ID` | Phone Number ID de WhatsApp Business | Meta Business Suite |
| `REEMPLAZAR_WEBHOOK_A2/A3/B1` | Make los crea al importar | Automático |

Como los blueprints usan `REEMPLAZAR_SPREADSHEET_ID` literal, podés hacer buscar-y-reemplazar en el `.json` **antes** de importar: cambiá `REEMPLAZAR_SPREADSHEET_ID` por el ID real. Eso te ahorra reconfigurarlo módulo por módulo.

---

## A2 · Captura de stock — el primero a probar

**Qué hace:** recibe el POST del form `stock.html`, recorre los productos enviados, y para cada uno: si ya existe en la hoja `Productos` lo actualiza, si es nuevo lo agrega; además registra el cambio en `Log_Cambios_Stock`.

**Flujo:** Webhook → Iterator(productos) → Search(Productos) → Router(existe?/nuevo?) → Update o Add → Add a Log.

**Pasos para activarlo:**

1. Importá `A2_Captura_stocks.json`.
2. Clic en el módulo Webhook (módulo 1) → copiá la URL que Make generó (algo como `https://hook.eu2.make.com/xxxxx`).
3. Pegá esa URL en el form: editá `docs/forms/stock.html`, buscá `data-webhook="PEGAR_AQUI_LA_URL_DEL_WEBHOOK_A2"` y reemplazá por la URL real. Commit + push.
4. Reconectá los módulos de Sheets a tu conexión.
5. Verificá los **índices de columna** en los mapeos (módulos 5, 6, 7). Abrí tu hoja `Productos` y confirmá qué columna es cada cosa. Los blueprints asumen: col 0=id_producto, 1=id_productor, 2=nombre, 3=unidad, 6=precio, 9=disponible, 11=es_oferta, 13=ultima_actualizacion. **Si tu hoja difiere, ajustá.**
6. **Test:** abrí `stock.html?id_productor=PROD001` en el navegador, cargá un producto de prueba, enviá. En Make, mirá la ejecución: debería crear/actualizar la fila y escribir en el log.

**Generación de IDs nuevos (módulo 6):** dice `REEMPLAZAR_GENERAR_ID_PRODUCTO`. La forma simple en Make Free: agregá un módulo *Tools → Set Variable* antes, que cuente las filas existentes y arme `PROD` + número. O, más simple aún para empezar: dejá que el productor solo actualice productos existentes y cargá los nuevos a mano. (En la próxima iteración automatizamos la generación de IDs.)

---

## A3 · Generación del form de pedidos

**Qué hace:** disparado por un botón en el Sheet (vía Apps Script), lee los productos disponibles, arma un JSON, descarga el template HTML de GitHub, reemplaza los placeholders, y commitea el form generado al repo. GitHub Pages lo publica.

**Flujo:** Webhook(id_edicion) → Search(Productos disponibles) → TextAggregator(JSON) → HTTP GET(template) → SetVariable(reemplazo) → GitHub(commit) → Search(Ediciones) → Update(estado+URL).

**Limitación honesta de esta versión:** el blueprint arma una **sola categoría llamada "Catálogo"** con todos los productos juntos. La **agrupación por categoría real** (que es lo que hace lúcido el wizard) requiere lógica adicional en Make que es incómoda de expresar en un blueprint plano. Hay dos caminos:

- **Camino simple (ahora):** todos los productos en una categoría. El wizard funciona pero con un solo paso. Sirve para probar el circuito.
- **Camino completo (después):** usar un módulo *Array aggregator* agrupando por el campo `categoria`, generando el JSON anidado por categorías. Lo armamos juntos en Make directamente cuando llegues a este punto, porque es más fácil hacerlo visualmente que en JSON.

**Pasos:**

1. Importá `A3_Generacion_formulario.json`.
2. Reconectá Sheets y GitHub.
3. Copiá la URL del webhook (módulo 1).
4. Configurá el Apps Script (ver sección Apps Script abajo) con esa URL.
5. Completá los placeholders del reemplazo (módulo 5): número de edición, webhook de B1.
6. **Test:** ejecutá el escenario manualmente con un `id_edicion` de prueba (ej. `ED2026-DEMO`). Verificá que aparezca el archivo `docs/forms/pedidos-ED2026-DEMO.html` en el repo.

---

## B1 · Captura de pedido

**Qué hace:** recibe el POST del form de pedidos, busca si el consumidor existe (lo crea si no), crea la cabecera del pedido en `Pedidos`, y agrega una fila por item en `Items`.

**Flujo:** Webhook → Search(Consumidores) → Router(crear si nuevo) → Add(Pedidos) → Iterator(items) → Add(Items).

**Punto delicado — el `id_pedido` padre:** cuando creás la cabecera (módulo 5), Make genera/recibe un `id_pedido`. Ese mismo ID hay que escribirlo en cada item (módulo 7, campo `REEMPLAZAR_ID_PEDIDO_PADRE`). La forma de hacerlo en Make: guardar el `id_pedido` en una variable después del módulo 5 y referenciarla en el 7. Lo resolvemos al configurar.

**Pasos:**

1. Importá `B1_Captura_pedido.json`.
2. Reconectá Sheets.
3. Copiá la URL del webhook → esa es la que va en `{{webhook_url}}` del template de pedidos (la usa A3 al generar el form).
4. Revisá los índices de columna de `Pedidos` e `Items` contra tu hoja real.
5. **Test:** abrí `pedidos-DEMO.html`, hacé un pedido de prueba. Debería entrar el consumidor, la cabecera y los items.

---

## A1 · Solicitud de stocks (requiere WhatsApp)

**Qué hace:** cada lunes a las 10:00 busca los productores activos y les manda un WhatsApp con el link a su form de stock.

**Flujo:** Scheduler → Search(Productores activos) → WhatsApp(template) → Add a Log.

**No se puede activar hasta tener:**
- Cuenta WhatsApp Business Cloud verificada en Meta.
- El template `solicitud_stock_quincenal` aprobado por Meta (24-48hs).
- El `phone_number_id`.

**Pasos (cuando WhatsApp esté listo):**

1. Importá `A1_Solicitud_stocks.json`.
2. Reconectá Sheets y WhatsApp.
3. En el módulo Scheduler (1), configurá: lunes, 10:00.
4. En el módulo WhatsApp (3), confirmá el nombre del template y el orden de las variables.
5. **Test:** ejecutá manual una vez ("Run once") con un solo productor de prueba (tu propio número).

---

## Apps Script para disparar A3

Pegá esto en *Extensiones → Apps Script* del workbook, reemplazando la URL del webhook A3:

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌿 Nodo Matriz')
    .addItem('Abrir formulario de pedidos (A3)', 'dispararA3')
    .addToUi();
}

function dispararA3() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Abrir formulario público',
    'Ingresá el id_edicion (ej: ED2026-09):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() != ui.Button.OK) return;

  var idEdicion = resp.getResponseText().trim();
  var WEBHOOK_URL = 'PEGAR_AQUI_LA_URL_DEL_WEBHOOK_A3';

  var r = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ id_edicion: idEdicion })
  });
  ui.alert('Formulario generándose. Estará disponible en ~1 minuto.');
}
```

---

## Consumo de operaciones (Make Free = 1.000/mes)

| Escenario | Ops por ejecución | Frecuencia | Ops/mes aprox |
| :---- | :---- | :---- | :---- |
| A1 | ~2 por productor × 64 | 2 ediciones/mes | ~256 |
| A2 | ~4 por envío × ~40 | 2 ediciones/mes | ~320 |
| A3 | ~8 | 2 ediciones/mes | ~16 |
| B1 | ~5 por pedido × ~80 | 2 ediciones/mes | ~800 |
| **Total** | | | **~1.392/mes** |

**Vas a superar el límite de Free con operación real.** Para testing alcanza. Cuando confirmes que funciona, pasá a Make Core (~9 USD/mes, 10.000 ops).

---

## Resumen de lo que falta para que funcione end-to-end

- [ ] Subir workbook a Sheets (si no está)
- [ ] Crear conexiones Sheets + GitHub en Make
- [ ] Importar A2, conectar, pegar webhook en stock.html, testear
- [ ] Importar A3, conectar, configurar Apps Script, testear generación
- [ ] Importar B1, conectar, pegar webhook (lo usa A3), testear pedido
- [ ] Resolver generación de IDs (productos, consumidores, pedidos, items)
- [ ] Resolver agrupación por categoría en A3 (camino completo)
- [ ] Meta/WhatsApp: cuenta + templates aprobados → recién ahí A1
- [ ] Cuando funcione: pasar a Make Core
