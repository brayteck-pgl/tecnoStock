class ProductList extends HTMLElement {
  constructor() {
    super();
    this._productos = [];
    this._estado = "loading";
    this._mensaje = "";
    this.addEventListener("click", (evento) => {
      if (evento.target.closest('[data-action="retry"]')) {
        this.dispatchEvent(new CustomEvent("catalog-retry", { bubbles: true, composed: true }));
      }
    });
  }

  set products(productos) {
    this._productos = productos;
    this.render();
  }

  set status(estado) {
    this._estado = estado;
    this.render();
  }

  set message(mensaje) {
    this._mensaje = mensaje;
    this.render();
  }

  render() {
    this.setAttribute("aria-busy", String(this._estado === "loading"));

    if (this._estado === "loading") {
      this.replaceChildren(this.createMessage("Cargando el catálogo…", "loading-state", true));
      return;
    }
    if (this._estado === "error") {
      const estado = this.createMessage(this._mensaje || "No se pudo cargar el catálogo.", "error-state");
      const reintentar = document.createElement("button");
      reintentar.type = "button";
      reintentar.className = "button button-outline";
      reintentar.dataset.action = "retry";
      reintentar.textContent = "Intentar de nuevo";
      estado.append(reintentar);
      this.replaceChildren(estado);
      return;
    }
    if (this._estado === "empty") {
      this.replaceChildren(this.createMessage("El catálogo está disponible, pero todavía no tiene productos.", "empty-state"));
      return;
    }
    if (this._productos.length === 0) {
      this.replaceChildren(this.createMessage("No encontramos productos con esos filtros. Prueba cambiarlos o límpialos.", "empty-state"));
      return;
    }

    const cuadricula = document.createElement("div");
    cuadricula.className = "product-grid";
    for (const producto of this._productos) {
      const tarjeta = document.createElement("product-card");
      tarjeta.product = producto;
      cuadricula.append(tarjeta);
    }
    this.replaceChildren(cuadricula);
  }

  createMessage(mensaje, nombreClase, mostrarIndicador = false) {
    const estado = document.createElement("div");
    estado.className = `catalog-message ${nombreClase}`;
    if (mostrarIndicador) {
      const indicador = document.createElement("span");
      indicador.className = "spinner";
      indicador.setAttribute("aria-hidden", "true");
      estado.append(indicador);
    }
    const texto = document.createElement("p");
    texto.textContent = mensaje;
    estado.append(texto);
    return estado;
  }
}

customElements.define("product-list", ProductList);
