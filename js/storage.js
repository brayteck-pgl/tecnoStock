const CLAVE_ALMACENAMIENTO_CARRITO = "tecnostock.cart.v1";

export function readStoredCart() {
  try {
    return { value: window.localStorage.getItem(CLAVE_ALMACENAMIENTO_CARRITO), error: null };
  } catch (excepcion) {
    return { value: null, error: "No se pudo leer el almacenamiento local. El carrito estará disponible solo durante esta sesión." };
  }
}

export function writeStoredCart(carritoSerializado) {
  try {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO_CARRITO, carritoSerializado);
    return { error: null };
  } catch (excepcion) {
    return { error: "No se pudo guardar el carrito en este navegador. Los cambios actuales se conservarán mientras esta página esté abierta." };
  }
}
