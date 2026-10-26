const CART_STORAGE_KEY = "tecnostock.cart.v1";

export function readStoredCart() {
  try {
    return { value: window.localStorage.getItem(CART_STORAGE_KEY), error: null };
  } catch (error) {
    return { value: null, error: "No se pudo leer el almacenamiento local. El carrito estará disponible solo durante esta sesión." };
  }
}

export function writeStoredCart(serializedCart) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializedCart);
    return { error: null };
  } catch (error) {
    return { error: "No se pudo guardar el carrito en este navegador. Los cambios actuales se conservarán mientras esta página esté abierta." };
  }
}
