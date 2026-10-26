class ProductCard extends HTMLElement {
  constructor() {
    super();
    this._product = null;
    this.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="add"]');
      if (!button || !this._product) {
        return;
      }
      this.dispatchEvent(new CustomEvent("cart-add-request", {
        bubbles: true,
        composed: true,
        detail: { productId: this._product.id }
      }));
    });
  }

  set product(value) {
    this._product = value;
    this.render();
  }

  render() {
    if (!this._product) {
      return;
    }

    const product = this._product;
    const article = document.createElement("article");
    article.className = "product-card";

    const cardTop = document.createElement("div");
    cardTop.className = "product-card-top";
    const category = document.createElement("span");
    category.className = "product-category";
    category.textContent = product.category;
    cardTop.append(category);

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;
    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description;

    const footer = document.createElement("div");
    footer.className = "product-card-footer";
    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = formatCurrency(product.price);

    const stock = document.createElement("span");
    stock.className = "stock-label";
    const canBuy = product.active && product.stock > 0;
    stock.classList.add(canBuy ? "stock-available" : "stock-unavailable");
    stock.textContent = !product.active ? "No disponible" : product.stock > 0 ? `${product.stock} disponibles` : "Agotado";

    const addButton = document.createElement("button");
    addButton.className = "button button-primary add-button";
    addButton.type = "button";
    addButton.dataset.action = "add";
    addButton.disabled = !canBuy;
    addButton.textContent = canBuy ? "Agregar al carrito" : "No disponible";
    addButton.setAttribute("aria-label", `${canBuy ? "Agregar" : "No disponible"}: ${product.name}`);
    footer.append(price, stock, addButton);
    article.append(cardTop, name, description, footer);
    this.replaceChildren(article);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(amount);
}

customElements.define("product-card", ProductCard);
