# TecnoStock

Aplicación de catálogo y carrito desarrollada con HTML, CSS y JavaScript nativo. No requiere dependencias ni frameworks.

## Ejecutar localmente

La aplicación usa `fetch()` para cargar `data/products.json`, por lo que debe abrirse desde un servidor HTTP local y no directamente como archivo.

Desde la carpeta del proyecto, ejecuta:

```powershell
python -m http.server 8000
```

Después abre <http://localhost:8000> en el navegador. También puedes usar la extensión Live Server de Visual Studio Code.

## Funcionalidad

- Catálogo JSON validado al cargar, búsqueda, filtros combinables y ordenamiento por precio.
- Componentes nativos `<product-card>`, `<product-list>` y `<shopping-cart>`.
- Carrito validado contra disponibilidad e inventario, con persistencia en `localStorage`.
- Las tarjetas muestran las unidades disponibles después de descontar temporalmente las que están en el carrito; al quitar productos, esas unidades vuelven a estar disponibles.
- Descuento del 10 % desde $300.000 COP y confirmación de pedido simulada.
- Mensajes accesibles para carga, errores, resultados vacíos, operaciones y confirmación.

La confirmación es local: no procesa pagos y no actualiza el inventario del archivo JSON.
