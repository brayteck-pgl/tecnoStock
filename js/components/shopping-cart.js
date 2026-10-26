class ShoppingCart extends HTMLElement {
  constructor() {
    super();
    this._lineas = [];
    this._totales = { units: 0, subtotal: 0, discount: 0, total: 0 };
    this._listo = false;
    this.addEventListener("click", (evento) => {
      const boton = evento.target.closest("button[data-action]");
      if (!boton) {
        return;
      }

      if (boton.dataset.action === "clear") {
        this.dispatchEvent(new CustomEvent("cart-clear-request", { bubbles: true, composed: true }));
      } else if (boton.dataset.action === "checkout") {
        this.dispatchEvent(new CustomEvent("checkout-request", { bubbles: true, composed: true }));
      } else {
        this.dispatchEvent(new CustomEvent("cart-item-change", {
          bubbles: true,
          composed: true,
          detail: {
            action: boton.dataset.action,
            productId: Number(boton.dataset.productId)
          }
        }));
      }
    });
  }

  set data(datos) {
    this._lineas = datos.lines;
    this._totales = datos.totals;
    this._listo = datos.ready;
    this.render();
  }

  render() {
    const distribucion = document.createElement("div");
    distribucion.className = "cart-layout";
    const panelLineas = document.createElement("div");
    panelLineas.className = "cart-lines-panel";

    const encabezadoLineas = document.createElement("div");
    encabezadoLineas.className = "cart-lines-heading";
    const tituloLineas = document.createElement("h3");
    tituloLineas.textContent = "Productos seleccionados";
    const unidades = document.createElement("span");
    unidades.className = "cart-units";
    unidades.textContent = `${this._totales.units} ${this._totales.units === 1 ? "unidad" : "unidades"}`;
    encabezadoLineas.append(tituloLineas, unidades);
    panelLineas.append(encabezadoLineas);

    if (!this._listo) {
      const mensaje = document.createElement("p");
      mensaje.className = "cart-empty-message";
      mensaje.textContent = "El carrito estará disponible cuando cargue el catálogo.";
      panelLineas.append(mensaje);
    } else if (this._lineas.length === 0) {
      const mensaje = document.createElement("p");
      mensaje.className = "cart-empty-message";
      mensaje.textContent = "Aún no has agregado productos. Explora el catálogo para empezar.";
      panelLineas.append(mensaje);
    } else {
      const lista = document.createElement("ul");
      lista.className = "cart-lines";
      for (const linea of this._lineas) {
        lista.append(this.createLine(linea));
      }
      panelLineas.append(lista);
    }

    const resumen = this.createSummary();
    distribucion.append(panelLineas, resumen);
    this.replaceChildren(distribucion);
  }

  createLine(linea) {
    const elemento = document.createElement("li");
    elemento.className = "cart-line";

    const detalles = document.createElement("div");
    detalles.className = "cart-line-details";
    const nombre = document.createElement("h4");
    nombre.textContent = linea.product.name;
    const precioUnitario = document.createElement("p");
    precioUnitario.textContent = `${formatCurrency(linea.product.price)} c/u`;
    detalles.append(nombre, precioUnitario);

    const controles = document.createElement("div");
    controles.className = "quantity-controls";
    controles.setAttribute("aria-label", `Cantidad de ${linea.product.name}`);
    const disminuir = this.createActionButton("decrement", "−", linea.product.id, `Disminuir cantidad de ${linea.product.name}`);
    disminuir.disabled = linea.quantity <= 1;
    const cantidad = document.createElement("span");
    cantidad.className = "quantity-value";
    cantidad.setAttribute("aria-live", "polite");
    cantidad.textContent = String(linea.quantity);
    const aumentar = this.createActionButton("increment", "+", linea.product.id, `Aumentar cantidad de ${linea.product.name}`);
    aumentar.disabled = linea.quantity >= linea.product.stock;
    controles.append(disminuir, cantidad, aumentar);

    const subtotalLinea = document.createElement("strong");
    subtotalLinea.className = "line-subtotal";
    subtotalLinea.textContent = formatCurrency(linea.product.price * linea.quantity);
    const eliminar = this.createActionButton("remove", "Eliminar", linea.product.id, `Eliminar ${linea.product.name}`);
    eliminar.className = "button button-quiet remove-button";
    elemento.append(detalles, controles, subtotalLinea, eliminar);
    return elemento;
  }

  createActionButton(accion, etiqueta, idProducto, nombreAccesible) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.dataset.action = accion;
    boton.dataset.productId = String(idProducto);
    boton.setAttribute("aria-label", nombreAccesible);
    boton.textContent = etiqueta;
    boton.className = accion === "increment" || accion === "decrement" ? "quantity-button" : "button";
    return boton;
  }

  createSummary() {
    const panel = document.createElement("aside");
    panel.className = "cart-summary";
    const encabezado = document.createElement("h3");
    encabezado.textContent = "Resumen del pedido";
    const filaSubtotal = this.createAmountRow("Subtotal", this._totales.subtotal);
    const filaDescuento = this.createAmountRow("Descuento (10 %)", -this._totales.discount, "discount-row");
    const separador = document.createElement("div");
    separador.className = "summary-separator";
    const filaTotal = this.createAmountRow("Total", this._totales.total, "total-row");

    const avisoPromocion = document.createElement("p");
    avisoPromocion.className = "promotion-note";
    avisoPromocion.textContent = this._totales.subtotal >= 300000
      ? "¡Se aplicó el descuento del 10 %!"
      : "Obtén 10 % de descuento en compras desde $300.000.";

    const vaciar = document.createElement("button");
    vaciar.type = "button";
    vaciar.className = "button button-quiet clear-cart";
    vaciar.dataset.action = "clear";
    vaciar.textContent = "Vaciar carrito";
    vaciar.disabled = this._lineas.length === 0 || !this._listo;

    const confirmar = document.createElement("button");
    confirmar.type = "button";
    confirmar.className = "button button-primary checkout-button";
    confirmar.dataset.action = "checkout";
    confirmar.textContent = "Confirmar pedido";
    confirmar.disabled = this._lineas.length === 0 || !this._listo;
    panel.append(encabezado, filaSubtotal, filaDescuento, separador, filaTotal, avisoPromocion, confirmar, vaciar);
    return panel;
  }

  createAmountRow(etiqueta, importe, nombreClase = "") {
    const fila = document.createElement("div");
    fila.className = `amount-row ${nombreClase}`.trim();
    const elementoEtiqueta = document.createElement("span");
    elementoEtiqueta.textContent = etiqueta;
    const valor = document.createElement("strong");
    valor.textContent = formatCurrency(importe);
    fila.append(elementoEtiqueta, valor);
    return fila;
  }
}

function formatCurrency(importe) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(importe);
}

customElements.define("shopping-cart", ShoppingCart);
