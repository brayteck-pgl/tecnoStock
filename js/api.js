class CatalogError extends Error {
  constructor(message) {
    super(message);
    this.name = "CatalogError";
  }
}

function validateCatalog(datos) {
  if (!Array.isArray(datos)) {
    throw new CatalogError("El catálogo recibido no tiene el formato esperado.");
  }

  const identificadores = new Set();
  return datos.map((producto, indice) => {
    const numeroProducto = indice + 1;
    if (
      producto === null ||
      typeof producto !== "object" ||
      Array.isArray(producto) ||
      !Number.isInteger(producto.id) ||
      producto.id < 1 ||
      identificadores.has(producto.id) ||
      typeof producto.name !== "string" ||
      !producto.name.trim() ||
      typeof producto.category !== "string" ||
      !producto.category.trim() ||
      typeof producto.description !== "string" ||
      typeof producto.price !== "number" ||
      !Number.isFinite(producto.price) ||
      producto.price <= 0 ||
      !Number.isInteger(producto.stock) ||
      producto.stock < 0 ||
      typeof producto.active !== "boolean"
    ) {
      throw new CatalogError(`Los datos del producto ${numeroProducto} son inválidos o su identificador está repetido.`);
    }

    identificadores.add(producto.id);
    return {
      id: producto.id,
      name: producto.name.trim(),
      category: producto.category.trim(),
      price: producto.price,
      stock: producto.stock,
      description: producto.description.trim(),
      active: producto.active
    };
  });
}

export async function fetchCatalog() {
  let respuesta;
  try {
    respuesta = await fetch("./data/products.json", { cache: "no-store" });
  } catch (excepcion) {
    throw new CatalogError("No se pudo conectar con el catálogo. Verifica que la aplicación esté abierta desde un servidor local.");
  }

  if (!respuesta.ok) {
    throw new CatalogError(`No se pudo cargar el catálogo (error HTTP ${respuesta.status}). Intenta nuevamente.`);
  }

  let datosCatalogo;
  try {
    datosCatalogo = await respuesta.json();
  } catch (excepcion) {
    throw new CatalogError("El catálogo no contiene JSON válido. Revisa el archivo de productos.");
  }

  return validateCatalog(datosCatalogo);
}

export { CatalogError };
