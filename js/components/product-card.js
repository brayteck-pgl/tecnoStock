class ProductCard extends HTMLElement {
  constructor() {
    super();
    this._producto = null;
    this.addEventListener("click", (evento) => {
      const boton = evento.target.closest('button[data-action="add"]');
      if (!boton || !this._producto) {
        return;
      }
      this.dispatchEvent(new CustomEvent("cart-add-request", {
        bubbles: true,
        composed: true,
        detail: { productId: this._producto.id }
      }));
    });
  }

  set product(producto) {
    this._producto = producto;
    this.render();
  }

  render() {
    if (!this._producto) {
      return;
    }

    const producto = this._producto;
    const articulo = document.createElement("article");
    articulo.className = "product-card";

    const encabezadoTarjeta = document.createElement("div");
    encabezadoTarjeta.className = "product-card-top";
    const categoria = document.createElement("span");
    categoria.className = "product-category";
    categoria.textContent = producto.category;
    encabezadoTarjeta.append(categoria);

    const nombre = document.createElement("h3");
    nombre.className = "product-name";
    nombre.textContent = producto.name;
    const descripcion = document.createElement("p");
    descripcion.className = "product-description";
    descripcion.textContent = producto.description;

    const pieTarjeta = document.createElement("div");
    pieTarjeta.className = "product-card-footer";
    const precio = document.createElement("strong");
    precio.className = "product-price";
    precio.textContent = formatCurrency(producto.price);

    const existencia = document.createElement("span");
    existencia.className = "stock-label";
    const puedeComprar = producto.active && producto.stock > 0;
    existencia.classList.add(puedeComprar ? "stock-available" : "stock-unavailable");
    existencia.textContent = !producto.active ? "No disponible" : producto.stock > 0 ? `${producto.stock} disponibles` : "Agotado";

    const botonAgregar = document.createElement("button");
    botonAgregar.className = "button button-primary add-button";
    botonAgregar.type = "button";
    botonAgregar.dataset.action = "add";
    botonAgregar.disabled = !puedeComprar;
    botonAgregar.textContent = puedeComprar ? "Agregar al carrito" : "No disponible";
    botonAgregar.setAttribute("aria-label", `${puedeComprar ? "Agregar" : "No disponible"}: ${producto.name}`);
    pieTarjeta.append(precio, existencia, botonAgregar);
    articulo.append(encabezadoTarjeta, nombre, descripcion, pieTarjeta);
    this.replaceChildren(articulo);
  }
}

function formatCurrency(importe) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(importe);
}

customElements.define("product-card", ProductCard);
