function findProduct(productos, idProducto) {
  return productos.find((producto) => producto.id === idProducto);
}

function validateSellableProduct(producto) {
  if (!producto) {
    return "El producto ya no pertenece al catálogo.";
  }
  if (!producto.active) {
    return "Este producto no está disponible para la venta.";
  }
  if (producto.stock < 1) {
    return "Este producto está agotado.";
  }
  return null;
}

export function addProduct(carrito, idProducto, productos) {
  const producto = findProduct(productos, idProducto);
  const errorProducto = validateSellableProduct(producto);
  if (errorProducto) {
    return { cart: carrito, error: errorProducto };
  }

  const cantidad = (carrito.get(idProducto) || 0) + 1;
  if (cantidad > producto.stock) {
    return { cart: carrito, error: `Solo hay ${producto.stock} unidad(es) disponibles de ${producto.name}.` };
  }

  const nuevoCarrito = new Map(carrito);
  nuevoCarrito.set(idProducto, cantidad);
  return { cart: nuevoCarrito, error: null };
}

export function setProductQuantity(carrito, idProducto, cantidad, productos) {
  const producto = findProduct(productos, idProducto);
  const errorProducto = validateSellableProduct(producto);
  if (errorProducto) {
    return { cart: carrito, error: errorProducto };
  }
  if (!carrito.has(idProducto)) {
    return { cart: carrito, error: "El producto no se encuentra en el carrito." };
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { cart: carrito, error: "La cantidad debe ser un número entero de al menos 1. Puedes eliminar la línea si ya no la necesitas." };
  }
  if (cantidad > producto.stock) {
    return { cart: carrito, error: `Solo hay ${producto.stock} unidad(es) disponibles de ${producto.name}.` };
  }

  const nuevoCarrito = new Map(carrito);
  nuevoCarrito.set(idProducto, cantidad);
  return { cart: nuevoCarrito, error: null };
}

export function removeProduct(carrito, idProducto) {
  if (!carrito.has(idProducto)) {
    return { cart: carrito, error: "El producto no se encuentra en el carrito." };
  }
  const nuevoCarrito = new Map(carrito);
  nuevoCarrito.delete(idProducto);
  return { cart: nuevoCarrito, error: null };
}

export function validateCart(carrito, productos) {
  const lineas = [];
  for (const [idProducto, cantidad] of carrito) {
    const producto = findProduct(productos, idProducto);
    const errorProducto = validateSellableProduct(producto);
    if (errorProducto) {
      return { lines: [], error: errorProducto };
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > producto.stock) {
      return { lines: [], error: `La cantidad guardada para ${producto.name} no es válida según el inventario actual.` };
    }
    lineas.push({ product: producto, quantity: cantidad });
  }
  return { lines: lineas, error: null };
}

export function calculateTotals(lineas) {
  const unidades = lineas.reduce((suma, linea) => suma + linea.quantity, 0);
  const subtotal = lineas.reduce((suma, linea) => suma + linea.product.price * linea.quantity, 0);
  const descuento = subtotal >= 300000 ? Math.round(subtotal * 0.1) : 0;
  return { units: unidades, subtotal, discount: descuento, total: subtotal - descuento };
}

export function restoreCart(valorGuardado, productos) {
  const carrito = new Map();
  if (valorGuardado === null) {
    return { cart: carrito, warning: null };
  }

  let datosGuardados;
  try {
    datosGuardados = JSON.parse(valorGuardado);
  } catch (excepcion) {
    return { cart: carrito, warning: "El carrito guardado estaba dañado. Se inició un carrito vacío." };
  }

  if (
    datosGuardados === null ||
    typeof datosGuardados !== "object" ||
    Array.isArray(datosGuardados) ||
    datosGuardados.version !== 1 ||
    !Array.isArray(datosGuardados.items)
  ) {
    return { cart: carrito, warning: "El carrito guardado tenía una estructura inesperada. Se inició un carrito vacío." };
  }

  let seOmitieronElementos = false;
  for (const elemento of datosGuardados.items) {
    if (
      elemento === null ||
      typeof elemento !== "object" ||
      Array.isArray(elemento) ||
      !Number.isInteger(elemento.id) ||
      !Number.isInteger(elemento.quantity) ||
      elemento.quantity < 1
    ) {
      seOmitieronElementos = true;
      continue;
    }

    const producto = findProduct(productos, elemento.id);
    if (validateSellableProduct(producto) || elemento.quantity > producto.stock) {
      seOmitieronElementos = true;
      continue;
    }

    const cantidadCombinada = (carrito.get(elemento.id) || 0) + elemento.quantity;
    if (cantidadCombinada > producto.stock) {
      seOmitieronElementos = true;
      continue;
    }
    carrito.set(elemento.id, cantidadCombinada);
  }

  return {
    cart: carrito,
    warning: seOmitieronElementos ? "Se ignoraron líneas inválidas o cantidades superiores al inventario actual." : null
  };
}

export function serializeCart(carrito) {
  return JSON.stringify({
    version: 1,
    items: Array.from(carrito, ([idProducto, cantidad]) => ({ id: idProducto, quantity: cantidad }))
  });
}
