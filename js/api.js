class CatalogError extends Error {
  constructor(message) {
    super(message);
    this.name = "CatalogError";
  }
}

function validateCatalog(value) {
  if (!Array.isArray(value)) {
    throw new CatalogError("El catálogo recibido no tiene el formato esperado.");
  }

  const identifiers = new Set();
  return value.map((product, index) => {
    const productNumber = index + 1;
    if (
      product === null ||
      typeof product !== "object" ||
      Array.isArray(product) ||
      !Number.isInteger(product.id) ||
      product.id < 1 ||
      identifiers.has(product.id) ||
      typeof product.name !== "string" ||
      !product.name.trim() ||
      typeof product.category !== "string" ||
      !product.category.trim() ||
      typeof product.description !== "string" ||
      typeof product.price !== "number" ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      !Number.isInteger(product.stock) ||
      product.stock < 0 ||
      typeof product.active !== "boolean"
    ) {
      throw new CatalogError(`Los datos del producto ${productNumber} son inválidos o su identificador está repetido.`);
    }

    identifiers.add(product.id);
    return {
      id: product.id,
      name: product.name.trim(),
      category: product.category.trim(),
      price: product.price,
      stock: product.stock,
      description: product.description.trim(),
      active: product.active
    };
  });
}

export async function fetchCatalog() {
  let response;
  try {
    response = await fetch("./data/products.json", { cache: "no-store" });
  } catch (error) {
    throw new CatalogError("No se pudo conectar con el catálogo. Verifica que la aplicación esté abierta desde un servidor local.");
  }

  if (!response.ok) {
    throw new CatalogError(`No se pudo cargar el catálogo (error HTTP ${response.status}). Intenta nuevamente.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new CatalogError("El catálogo no contiene JSON válido. Revisa el archivo de productos.");
  }

  return validateCatalog(data);
}

export { CatalogError };
