function findProduct(products, productId) {
  return products.find((product) => product.id === productId);
}

function validateSellableProduct(product) {
  if (!product) {
    return "El producto ya no pertenece al catálogo.";
  }
  if (!product.active) {
    return "Este producto no está disponible para la venta.";
  }
  if (product.stock < 1) {
    return "Este producto está agotado.";
  }
  return null;
}

export function addProduct(cart, productId, products) {
  const product = findProduct(products, productId);
  const productError = validateSellableProduct(product);
  if (productError) {
    return { cart, error: productError };
  }

  const quantity = (cart.get(productId) || 0) + 1;
  if (quantity > product.stock) {
    return { cart, error: `Solo hay ${product.stock} unidad(es) disponibles de ${product.name}.` };
  }

  const nextCart = new Map(cart);
  nextCart.set(productId, quantity);
  return { cart: nextCart, error: null };
}

export function setProductQuantity(cart, productId, quantity, products) {
  const product = findProduct(products, productId);
  const productError = validateSellableProduct(product);
  if (productError) {
    return { cart, error: productError };
  }
  if (!cart.has(productId)) {
    return { cart, error: "El producto no se encuentra en el carrito." };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { cart, error: "La cantidad debe ser un número entero de al menos 1. Puedes eliminar la línea si ya no la necesitas." };
  }
  if (quantity > product.stock) {
    return { cart, error: `Solo hay ${product.stock} unidad(es) disponibles de ${product.name}.` };
  }

  const nextCart = new Map(cart);
  nextCart.set(productId, quantity);
  return { cart: nextCart, error: null };
}

export function removeProduct(cart, productId) {
  if (!cart.has(productId)) {
    return { cart, error: "El producto no se encuentra en el carrito." };
  }
  const nextCart = new Map(cart);
  nextCart.delete(productId);
  return { cart: nextCart, error: null };
}

export function validateCart(cart, products) {
  const lines = [];
  for (const [productId, quantity] of cart) {
    const product = findProduct(products, productId);
    const productError = validateSellableProduct(product);
    if (productError) {
      return { lines: [], error: productError };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
      return { lines: [], error: `La cantidad guardada para ${product.name} no es válida según el inventario actual.` };
    }
    lines.push({ product, quantity });
  }
  return { lines, error: null };
}

export function calculateTotals(lines) {
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const discount = subtotal >= 300000 ? Math.round(subtotal * 0.1) : 0;
  return { units, subtotal, discount, total: subtotal - discount };
}

export function restoreCart(rawValue, products) {
  const cart = new Map();
  if (rawValue === null) {
    return { cart, warning: null };
  }

  let saved;
  try {
    saved = JSON.parse(rawValue);
  } catch (error) {
    return { cart, warning: "El carrito guardado estaba dañado. Se inició un carrito vacío." };
  }

  if (
    saved === null ||
    typeof saved !== "object" ||
    Array.isArray(saved) ||
    saved.version !== 1 ||
    !Array.isArray(saved.items)
  ) {
    return { cart, warning: "El carrito guardado tenía una estructura inesperada. Se inició un carrito vacío." };
  }

  let skippedItems = false;
  for (const item of saved.items) {
    if (
      item === null ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      !Number.isInteger(item.id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      skippedItems = true;
      continue;
    }

    const product = findProduct(products, item.id);
    if (validateSellableProduct(product) || item.quantity > product.stock) {
      skippedItems = true;
      continue;
    }

    const combinedQuantity = (cart.get(item.id) || 0) + item.quantity;
    if (combinedQuantity > product.stock) {
      skippedItems = true;
      continue;
    }
    cart.set(item.id, combinedQuantity);
  }

  return {
    cart,
    warning: skippedItems ? "Se ignoraron líneas inválidas o cantidades superiores al inventario actual." : null
  };
}

export function serializeCart(cart) {
  return JSON.stringify({
    version: 1,
    items: Array.from(cart, ([id, quantity]) => ({ id, quantity }))
  });
}
