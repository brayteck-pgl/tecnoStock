class ProductList extends HTMLElement {
  constructor() {
    super();
    this._products = [];
    this._status = "loading";
    this._message = "";
    this.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="retry"]')) {
        this.dispatchEvent(new CustomEvent("catalog-retry", { bubbles: true, composed: true }));
      }
    });
  }

  set products(value) {
    this._products = value;
    this.render();
  }

  set status(value) {
    this._status = value;
    this.render();
  }

  set message(value) {
    this._message = value;
    this.render();
  }

  render() {
    this.setAttribute("aria-busy", String(this._status === "loading"));

    if (this._status === "loading") {
      this.replaceChildren(this.createMessage("Cargando el catálogo…", "loading-state", true));
      return;
    }
    if (this._status === "error") {
      const state = this.createMessage(this._message || "No se pudo cargar el catálogo.", "error-state");
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button button-outline";
      retry.dataset.action = "retry";
      retry.textContent = "Intentar de nuevo";
      state.append(retry);
      this.replaceChildren(state);
      return;
    }
    if (this._status === "empty") {
      this.replaceChildren(this.createMessage("El catálogo está disponible, pero todavía no tiene productos.", "empty-state"));
      return;
    }
    if (this._products.length === 0) {
      this.replaceChildren(this.createMessage("No encontramos productos con esos filtros. Prueba cambiarlos o límpialos.", "empty-state"));
      return;
    }

    const grid = document.createElement("div");
    grid.className = "product-grid";
    for (const product of this._products) {
      const card = document.createElement("product-card");
      card.product = product;
      grid.append(card);
    }
    this.replaceChildren(grid);
  }

  createMessage(message, className, withSpinner = false) {
    const state = document.createElement("div");
    state.className = `catalog-message ${className}`;
    if (withSpinner) {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.setAttribute("aria-hidden", "true");
      state.append(spinner);
    }
    const text = document.createElement("p");
    text.textContent = message;
    state.append(text);
    return state;
  }
}

customElements.define("product-list", ProductList);
