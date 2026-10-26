class ShoppingCart extends HTMLElement {
  constructor() {
    super();
    this._lines = [];
    this._totals = { units: 0, subtotal: 0, discount: 0, total: 0 };
    this._ready = false;
    this.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      if (button.dataset.action === "clear") {
        this.dispatchEvent(new CustomEvent("cart-clear-request", { bubbles: true, composed: true }));
      } else if (button.dataset.action === "checkout") {
        this.dispatchEvent(new CustomEvent("checkout-request", { bubbles: true, composed: true }));
      } else {
        this.dispatchEvent(new CustomEvent("cart-item-change", {
          bubbles: true,
          composed: true,
          detail: {
            action: button.dataset.action,
            productId: Number(button.dataset.productId)
          }
        }));
      }
    });
  }

  set data(value) {
    this._lines = value.lines;
    this._totals = value.totals;
    this._ready = value.ready;
    this.render();
  }

  render() {
    const layout = document.createElement("div");
    layout.className = "cart-layout";
    const linesPanel = document.createElement("div");
    linesPanel.className = "cart-lines-panel";

    const linesHeading = document.createElement("div");
    linesHeading.className = "cart-lines-heading";
    const linesTitle = document.createElement("h3");
    linesTitle.textContent = "Productos seleccionados";
    const units = document.createElement("span");
    units.className = "cart-units";
    units.textContent = `${this._totals.units} ${this._totals.units === 1 ? "unidad" : "unidades"}`;
    linesHeading.append(linesTitle, units);
    linesPanel.append(linesHeading);

    if (!this._ready) {
      const message = document.createElement("p");
      message.className = "cart-empty-message";
      message.textContent = "El carrito estará disponible cuando cargue el catálogo.";
      linesPanel.append(message);
    } else if (this._lines.length === 0) {
      const message = document.createElement("p");
      message.className = "cart-empty-message";
      message.textContent = "Aún no has agregado productos. Explora el catálogo para empezar.";
      linesPanel.append(message);
    } else {
      const list = document.createElement("ul");
      list.className = "cart-lines";
      for (const line of this._lines) {
        list.append(this.createLine(line));
      }
      linesPanel.append(list);
    }

    const summary = this.createSummary();
    layout.append(linesPanel, summary);
    this.replaceChildren(layout);
  }

  createLine(line) {
    const item = document.createElement("li");
    item.className = "cart-line";

    const details = document.createElement("div");
    details.className = "cart-line-details";
    const name = document.createElement("h4");
    name.textContent = line.product.name;
    const unitPrice = document.createElement("p");
    unitPrice.textContent = `${formatCurrency(line.product.price)} c/u`;
    details.append(name, unitPrice);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    controls.setAttribute("aria-label", `Cantidad de ${line.product.name}`);
    const decrement = this.createActionButton("decrement", "−", line.product.id, `Disminuir cantidad de ${line.product.name}`);
    decrement.disabled = line.quantity <= 1;
    const quantity = document.createElement("span");
    quantity.className = "quantity-value";
    quantity.setAttribute("aria-live", "polite");
    quantity.textContent = String(line.quantity);
    const increment = this.createActionButton("increment", "+", line.product.id, `Aumentar cantidad de ${line.product.name}`);
    increment.disabled = line.quantity >= line.product.stock;
    controls.append(decrement, quantity, increment);

    const subtotal = document.createElement("strong");
    subtotal.className = "line-subtotal";
    subtotal.textContent = formatCurrency(line.product.price * line.quantity);
    const remove = this.createActionButton("remove", "Eliminar", line.product.id, `Eliminar ${line.product.name}`);
    remove.className = "button button-quiet remove-button";
    item.append(details, controls, subtotal, remove);
    return item;
  }

  createActionButton(action, label, productId, accessibleName) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.productId = String(productId);
    button.setAttribute("aria-label", accessibleName);
    button.textContent = label;
    button.className = action === "increment" || action === "decrement" ? "quantity-button" : "button";
    return button;
  }

  createSummary() {
    const panel = document.createElement("aside");
    panel.className = "cart-summary";
    const heading = document.createElement("h3");
    heading.textContent = "Resumen del pedido";
    const subtotalRow = this.createAmountRow("Subtotal", this._totals.subtotal);
    const discountRow = this.createAmountRow("Descuento (10 %)", -this._totals.discount, "discount-row");
    const separator = document.createElement("div");
    separator.className = "summary-separator";
    const totalRow = this.createAmountRow("Total", this._totals.total, "total-row");

    const promotion = document.createElement("p");
    promotion.className = "promotion-note";
    promotion.textContent = this._totals.subtotal >= 300000
      ? "¡Se aplicó el descuento del 10 %!"
      : "Obtén 10 % de descuento en compras desde $300.000.";

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button button-quiet clear-cart";
    clear.dataset.action = "clear";
    clear.textContent = "Vaciar carrito";
    clear.disabled = this._lines.length === 0 || !this._ready;

    const checkout = document.createElement("button");
    checkout.type = "button";
    checkout.className = "button button-primary checkout-button";
    checkout.dataset.action = "checkout";
    checkout.textContent = "Confirmar pedido";
    checkout.disabled = this._lines.length === 0 || !this._ready;
    panel.append(heading, subtotalRow, discountRow, separator, totalRow, promotion, checkout, clear);
    return panel;
  }

  createAmountRow(label, amount, className = "") {
    const row = document.createElement("div");
    row.className = `amount-row ${className}`.trim();
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const value = document.createElement("strong");
    value.textContent = formatCurrency(amount);
    row.append(labelElement, value);
    return row;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(amount);
}

customElements.define("shopping-cart", ShoppingCart);
