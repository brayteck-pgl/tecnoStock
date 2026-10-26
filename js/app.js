import { fetchCatalog } from "./api.js";
import {
  addProduct,
  calculateTotals,
  removeProduct,
  restoreCart,
  serializeCart,
  setProductQuantity,
  validateCart
} from "./cart.js";
import { readStoredCart, writeStoredCart } from "./storage.js";
import "./components/product-card.js";
import "./components/product-list.js";
import "./components/shopping-cart.js";

const listaProductos = document.querySelector("#product-list");
const carritoCompras = document.querySelector("#shopping-cart");
const aviso = document.querySelector("#app-notice");
const unidadesEncabezado = document.querySelector("#header-units");
const cantidadResultados = document.querySelector("#results-count");
const filtros = {
  formulario: document.querySelector("#filters"),
  busqueda: document.querySelector("#search"),
  categoria: document.querySelector("#category"),
  orden: document.querySelector("#sort"),
  soloDisponibles: document.querySelector("#available-only"),
  limpiar: document.querySelector("#clear-filters")
};
const dialogoPedido = document.querySelector("#order-dialog");
const detallePedido = document.querySelector("#order-details");
const cerrarPedido = document.querySelector("#close-order");

let productos = [];
let carrito = new Map();
let catalogoListo = false;
let secuenciaPedido = 0;

filtros.formulario.addEventListener("submit", (evento) => evento.preventDefault());
filtros.busqueda.addEventListener("input", applyFilters);
filtros.categoria.addEventListener("change", applyFilters);
filtros.orden.addEventListener("change", applyFilters);
filtros.soloDisponibles.addEventListener("change", applyFilters);
filtros.limpiar.addEventListener("click", () => {
  filtros.formulario.reset();
  applyFilters();
  setNotice("Se limpiaron los filtros.", "success");
});
cerrarPedido.addEventListener("click", () => dialogoPedido.close());
listaProductos.addEventListener("cart-add-request", (evento) => handleAdd(evento.detail?.productId));
listaProductos.addEventListener("catalog-retry", loadCatalog);
carritoCompras.addEventListener("cart-item-change", (evento) => handleCartChange(evento.detail));
carritoCompras.addEventListener("cart-clear-request", clearCart);
carritoCompras.addEventListener("checkout-request", confirmOrder);

renderCart();
loadCatalog();

async function loadCatalog() {
  catalogoListo = false;
  listaProductos.status = "loading";
  setFilterControlsDisabled(true);
  cantidadResultados.textContent = "";
  renderCart();
  try {
    productos = await fetchCatalog();
    const carritoGuardado = readStoredCart();
    const carritoRestaurado = carritoGuardado.error
      ? { cart: new Map(), warning: carritoGuardado.error }
      : restoreStoredCart(carritoGuardado.value);
    carrito = carritoRestaurado.cart;
    catalogoListo = true;
    populateCategories();
    setFilterControlsDisabled(false);
    if (carritoGuardado.error || carritoRestaurado.warning) {
      setNotice(carritoRestaurado.warning, "warning");
    } else {
      clearNotice();
    }
    applyFilters();
    renderCart();
  } catch (excepcion) {
    catalogoListo = false;
    listaProductos.message = excepcion instanceof Error ? excepcion.message : "Ocurrió un error inesperado al cargar el catálogo.";
    listaProductos.status = "error";
    cantidadResultados.textContent = "";
    renderCart();
  }
}

function restoreStoredCart(valorGuardado) {
  return restoreCart(valorGuardado, productos);
}

function populateCategories() {
  const categorias = [...new Set(productos.map((producto) => producto.category))]
    .sort((primera, segunda) => primera.localeCompare(segunda, "es"));
  const opcionInicial = filtros.categoria.options[0];
  filtros.categoria.replaceChildren(opcionInicial);
  for (const categoria of categorias) {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    opcion.textContent = categoria;
    filtros.categoria.append(opcion);
  }
}

function setFilterControlsDisabled(deshabilitados) {
  filtros.busqueda.disabled = deshabilitados;
  filtros.categoria.disabled = deshabilitados;
  filtros.orden.disabled = deshabilitados;
  filtros.soloDisponibles.disabled = deshabilitados;
  filtros.limpiar.disabled = deshabilitados;
}

function applyFilters() {
  if (!catalogoListo) {
    return;
  }

  const consulta = filtros.busqueda.value.trim().toLocaleLowerCase("es");
  const categoriaSeleccionada = filtros.categoria.value;
  const soloDisponibles = filtros.soloDisponibles.checked;
  let productosVisibles = productos
    .map((producto) => ({
      ...producto,
      stock: producto.stock - (carrito.get(producto.id) || 0)
    }))
    .filter((producto) => {
      const coincideConsulta = !consulta ||
        producto.name.toLocaleLowerCase("es").includes(consulta) ||
        producto.description.toLocaleLowerCase("es").includes(consulta);
      const coincideCategoria = !categoriaSeleccionada || producto.category === categoriaSeleccionada;
      const coincideDisponibilidad = !soloDisponibles || (producto.active && producto.stock > 0);
      return coincideConsulta && coincideCategoria && coincideDisponibilidad;
    });

  if (filtros.orden.value === "price-asc") {
    productosVisibles = [...productosVisibles].sort((primero, segundo) => primero.price - segundo.price || primero.id - segundo.id);
  } else if (filtros.orden.value === "price-desc") {
    productosVisibles = [...productosVisibles].sort((primero, segundo) => segundo.price - primero.price || primero.id - segundo.id);
  }

  cantidadResultados.textContent = `${productosVisibles.length} ${productosVisibles.length === 1 ? "producto" : "productos"}`;
  listaProductos.products = productosVisibles;
  if (productos.length === 0) {
    listaProductos.status = "empty";
  } else {
    listaProductos.status = productosVisibles.length === 0 ? "no-results" : "ready";
  }
}

function handleAdd(idProducto) {
  if (!catalogoListo) {
    setNotice("Espera a que el catálogo termine de cargar.", "error");
    return;
  }
  const resultado = addProduct(carrito, idProducto, productos);
  if (resultado.error) {
    setNotice(resultado.error, "error");
    return;
  }
  carrito = resultado.cart;
  applyFilters();
  renderCart();
  if (persistCart()) {
    const producto = productos.find((elemento) => elemento.id === idProducto);
    setNotice(`${producto.name} se agregó al carrito.`, "success");
  }
}

function handleCartChange(detalle) {
  if (!detalle || !Number.isInteger(detalle.productId)) {
    setNotice("No se pudo identificar el producto solicitado.", "error");
    return;
  }

  let resultado;
  if (detalle.action === "increment" || detalle.action === "decrement") {
    const cantidadActual = carrito.get(detalle.productId);
    if (!Number.isInteger(cantidadActual)) {
      setNotice("El producto no se encuentra en el carrito.", "error");
      return;
    }
    const cantidadNueva = cantidadActual + (detalle.action === "increment" ? 1 : -1);
    resultado = setProductQuantity(carrito, detalle.productId, cantidadNueva, productos);
  } else if (detalle.action === "remove") {
    resultado = removeProduct(carrito, detalle.productId);
  } else {
    setNotice("La operación solicitada no es válida.", "error");
    return;
  }

  if (resultado.error) {
    setNotice(resultado.error, "error");
    return;
  }
  carrito = resultado.cart;
  applyFilters();
  renderCart();
  if (persistCart()) {
    setNotice("El carrito se actualizó correctamente.", "success");
  }
}

function clearCart() {
  if (carrito.size === 0) {
    setNotice("El carrito ya está vacío.", "info");
    return;
  }
  carrito = new Map();
  applyFilters();
  renderCart();
  if (persistCart()) {
    setNotice("Se vació el carrito.", "success");
  }
}

function confirmOrder() {
  if (!catalogoListo) {
    setNotice("No se puede confirmar el pedido mientras el catálogo no esté disponible.", "error");
    return;
  }
  if (carrito.size === 0) {
    setNotice("Agrega al menos un producto antes de confirmar el pedido.", "error");
    return;
  }

  const validacion = validateCart(carrito, productos);
  if (validacion.error) {
    setNotice(`No se puede confirmar el pedido: ${validacion.error}`, "error");
    return;
  }

  const totales = calculateTotals(validacion.lines);
  const idPedido = createOrderId();
  renderOrderDetails(idPedido, validacion.lines, totales);
  try {
    dialogoPedido.showModal();
  } catch (excepcion) {
    setNotice("No fue posible mostrar la confirmación. El carrito se conservó; intenta nuevamente.", "error");
    return;
  }

  carrito = new Map();
  applyFilters();
  renderCart();
  if (persistCart()) {
    setNotice(`Pedido simulado ${idPedido} confirmado. No se realizó ningún pago.`, "success");
  } else {
    setNotice(`Pedido simulado ${idPedido} confirmado. El carrito se vació en esta sesión, pero no se pudo actualizar el almacenamiento local.`, "warning");
  }
}

function renderOrderDetails(idPedido, lineas, totales) {
  const contenido = document.createDocumentFragment();
  const identificador = document.createElement("p");
  identificador.className = "order-id";
  identificador.textContent = `Identificador: ${idPedido}`;
  contenido.append(identificador);

  const lista = document.createElement("ul");
  lista.className = "order-lines";
  for (const linea of lineas) {
    const elemento = document.createElement("li");
    const nombre = document.createElement("span");
    nombre.textContent = `${linea.product.name} × ${linea.quantity}`;
    const importe = document.createElement("strong");
    importe.textContent = formatCurrency(linea.product.price * linea.quantity);
    elemento.append(nombre, importe);
    lista.append(elemento);
  }
  contenido.append(lista);

  const filas = [
    ["Subtotal", totales.subtotal],
    ["Descuento", -totales.discount],
    ["Total", totales.total]
  ];
  for (const [etiqueta, importe] of filas) {
    const fila = document.createElement("div");
    fila.className = "amount-row";
    const elementoEtiqueta = document.createElement("span");
    elementoEtiqueta.textContent = etiqueta;
    const valor = document.createElement("strong");
    valor.textContent = formatCurrency(importe);
    fila.append(elementoEtiqueta, valor);
    contenido.append(fila);
  }
  detallePedido.replaceChildren(contenido);
}

function createOrderId() {
  secuenciaPedido += 1;
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return `TS-${globalThis.crypto.randomUUID()}`;
  }
  return `TS-${Date.now()}-${secuenciaPedido}`;
}

function renderCart() {
  const validacion = catalogoListo ? validateCart(carrito, productos) : { lines: [] };
  const lineas = validacion.lines;
  const totales = calculateTotals(lineas);
  unidadesEncabezado.textContent = String(totales.units);
  carritoCompras.data = { lines: lineas, totals: totales, ready: catalogoListo };
}

function persistCart() {
  const resultado = writeStoredCart(serializeCart(carrito));
  if (resultado.error) {
    setNotice(resultado.error, "warning");
    return false;
  }
  return true;
}

function setNotice(mensaje, tipo = "info") {
  aviso.textContent = mensaje;
  aviso.className = `app-notice notice-${tipo}`;
  aviso.hidden = false;
}

function clearNotice() {
  aviso.textContent = "";
  aviso.hidden = true;
}

function formatCurrency(importe) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(importe);
}
