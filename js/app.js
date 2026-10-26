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

const productList = document.querySelector("#product-list");
const shoppingCart = document.querySelector("#shopping-cart");
const notice = document.querySelector("#app-notice");
const headerUnits = document.querySelector("#header-units");
const resultsCount = document.querySelector("#results-count");
const filters = {
  form: document.querySelector("#filters"),
  search: document.querySelector("#search"),
  category: document.querySelector("#category"),
  sort: document.querySelector("#sort"),
  availableOnly: document.querySelector("#available-only"),
  clear: document.querySelector("#clear-filters")
};
const orderDialog = document.querySelector("#order-dialog");
const orderDetails = document.querySelector("#order-details");
const closeOrder = document.querySelector("#close-order");

let products = [];
let cart = new Map();
let catalogReady = false;
let orderSequence = 0;

filters.form.addEventListener("submit", (event) => event.preventDefault());
filters.search.addEventListener("input", applyFilters);
filters.category.addEventListener("change", applyFilters);
filters.sort.addEventListener("change", applyFilters);
filters.availableOnly.addEventListener("change", applyFilters);
filters.clear.addEventListener("click", () => {
  filters.form.reset();
  applyFilters();
  setNotice("Se limpiaron los filtros.", "success");
});
closeOrder.addEventListener("click", () => orderDialog.close());
productList.addEventListener("cart-add-request", (event) => handleAdd(event.detail?.productId));
productList.addEventListener("catalog-retry", loadCatalog);
shoppingCart.addEventListener("cart-item-change", (event) => handleCartChange(event.detail));
shoppingCart.addEventListener("cart-clear-request", clearCart);
shoppingCart.addEventListener("checkout-request", confirmOrder);

renderCart();
loadCatalog();

async function loadCatalog() {
  catalogReady = false;
  productList.status = "loading";
  setFilterControlsDisabled(true);
  resultsCount.textContent = "";
  renderCart();
  try {
    products = await fetchCatalog();
    const stored = readStoredCart();
    const restored = stored.error
      ? { cart: new Map(), warning: stored.error }
      : restoreStoredCart(stored.value);
    cart = restored.cart;
    catalogReady = true;
    populateCategories();
    setFilterControlsDisabled(false);
    if (stored.error || restored.warning) {
      setNotice(restored.warning, "warning");
    } else {
      clearNotice();
    }
    applyFilters();
    renderCart();
  } catch (error) {
    catalogReady = false;
    productList.message = error instanceof Error ? error.message : "Ocurrió un error inesperado al cargar el catálogo.";
    productList.status = "error";
    resultsCount.textContent = "";
    renderCart();
  }
}

function restoreStoredCart(rawValue) {
  return restoreCart(rawValue, products);
}

function populateCategories() {
  const categories = [...new Set(products.map((product) => product.category))]
    .sort((first, second) => first.localeCompare(second, "es"));
  const placeholder = filters.category.options[0];
  filters.category.replaceChildren(placeholder);
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filters.category.append(option);
  }
}

function setFilterControlsDisabled(disabled) {
  filters.search.disabled = disabled;
  filters.category.disabled = disabled;
  filters.sort.disabled = disabled;
  filters.availableOnly.disabled = disabled;
  filters.clear.disabled = disabled;
}

function applyFilters() {
  if (!catalogReady) {
    return;
  }

  const query = filters.search.value.trim().toLocaleLowerCase("es");
  const category = filters.category.value;
  const availableOnly = filters.availableOnly.checked;
  let visible = products.filter((product) => {
    const matchesQuery = !query ||
      product.name.toLocaleLowerCase("es").includes(query) ||
      product.description.toLocaleLowerCase("es").includes(query);
    const matchesCategory = !category || product.category === category;
    const matchesAvailability = !availableOnly || (product.active && product.stock > 0);
    return matchesQuery && matchesCategory && matchesAvailability;
  });

  if (filters.sort.value === "price-asc") {
    visible = [...visible].sort((first, second) => first.price - second.price || first.id - second.id);
  } else if (filters.sort.value === "price-desc") {
    visible = [...visible].sort((first, second) => second.price - first.price || first.id - second.id);
  }

  resultsCount.textContent = `${visible.length} ${visible.length === 1 ? "producto" : "productos"}`;
  productList.products = visible;
  if (products.length === 0) {
    productList.status = "empty";
  } else {
    productList.status = visible.length === 0 ? "no-results" : "ready";
  }
}

function handleAdd(productId) {
  if (!catalogReady) {
    setNotice("Espera a que el catálogo termine de cargar.", "error");
    return;
  }
  const result = addProduct(cart, productId, products);
  if (result.error) {
    setNotice(result.error, "error");
    return;
  }
  cart = result.cart;
  renderCart();
  if (persistCart()) {
    const product = products.find((item) => item.id === productId);
    setNotice(`${product.name} se agregó al carrito.`, "success");
  }
}

function handleCartChange(detail) {
  if (!detail || !Number.isInteger(detail.productId)) {
    setNotice("No se pudo identificar el producto solicitado.", "error");
    return;
  }

  let result;
  if (detail.action === "increment" || detail.action === "decrement") {
    const currentQuantity = cart.get(detail.productId);
    if (!Number.isInteger(currentQuantity)) {
      setNotice("El producto no se encuentra en el carrito.", "error");
      return;
    }
    const nextQuantity = currentQuantity + (detail.action === "increment" ? 1 : -1);
    result = setProductQuantity(cart, detail.productId, nextQuantity, products);
  } else if (detail.action === "remove") {
    result = removeProduct(cart, detail.productId);
  } else {
    setNotice("La operación solicitada no es válida.", "error");
    return;
  }

  if (result.error) {
    setNotice(result.error, "error");
    return;
  }
  cart = result.cart;
  renderCart();
  if (persistCart()) {
    setNotice("El carrito se actualizó correctamente.", "success");
  }
}

function clearCart() {
  if (cart.size === 0) {
    setNotice("El carrito ya está vacío.", "info");
    return;
  }
  cart = new Map();
  renderCart();
  if (persistCart()) {
    setNotice("Se vació el carrito.", "success");
  }
}

function confirmOrder() {
  if (!catalogReady) {
    setNotice("No se puede confirmar el pedido mientras el catálogo no esté disponible.", "error");
    return;
  }
  if (cart.size === 0) {
    setNotice("Agrega al menos un producto antes de confirmar el pedido.", "error");
    return;
  }

  const validation = validateCart(cart, products);
  if (validation.error) {
    setNotice(`No se puede confirmar el pedido: ${validation.error}`, "error");
    return;
  }

  const totals = calculateTotals(validation.lines);
  const orderId = createOrderId();
  renderOrderDetails(orderId, validation.lines, totals);
  try {
    orderDialog.showModal();
  } catch (error) {
    setNotice("No fue posible mostrar la confirmación. El carrito se conservó; intenta nuevamente.", "error");
    return;
  }

  cart = new Map();
  renderCart();
  if (persistCart()) {
    setNotice(`Pedido simulado ${orderId} confirmado. No se realizó ningún pago.`, "success");
  } else {
    setNotice(`Pedido simulado ${orderId} confirmado. El carrito se vació en esta sesión, pero no se pudo actualizar el almacenamiento local.`, "warning");
  }
}

function renderOrderDetails(orderId, lines, totals) {
  const content = document.createDocumentFragment();
  const identifier = document.createElement("p");
  identifier.className = "order-id";
  identifier.textContent = `Identificador: ${orderId}`;
  content.append(identifier);

  const list = document.createElement("ul");
  list.className = "order-lines";
  for (const line of lines) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = `${line.product.name} × ${line.quantity}`;
    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(line.product.price * line.quantity);
    item.append(name, amount);
    list.append(item);
  }
  content.append(list);

  const rows = [
    ["Subtotal", totals.subtotal],
    ["Descuento", -totals.discount],
    ["Total", totals.total]
  ];
  for (const [label, amount] of rows) {
    const row = document.createElement("div");
    row.className = "amount-row";
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const value = document.createElement("strong");
    value.textContent = formatCurrency(amount);
    row.append(labelElement, value);
    content.append(row);
  }
  orderDetails.replaceChildren(content);
}

function createOrderId() {
  orderSequence += 1;
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return `TS-${globalThis.crypto.randomUUID()}`;
  }
  return `TS-${Date.now()}-${orderSequence}`;
}

function renderCart() {
  const validation = catalogReady ? validateCart(cart, products) : { lines: [] };
  const lines = validation.lines;
  const totals = calculateTotals(lines);
  headerUnits.textContent = String(totals.units);
  shoppingCart.data = { lines, totals, ready: catalogReady };
}

function persistCart() {
  const result = writeStoredCart(serializeCart(cart));
  if (result.error) {
    setNotice(result.error, "warning");
    return false;
  }
  return true;
}

function setNotice(message, kind = "info") {
  notice.textContent = message;
  notice.className = `app-notice notice-${kind}`;
  notice.hidden = false;
}

function clearNotice() {
  notice.textContent = "";
  notice.hidden = true;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(amount);
}
