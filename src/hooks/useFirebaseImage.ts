"use client";

import { useEffect, useState } from "react";

export interface FirebaseImageState {
  /** URL utilizable en `<img src>` — `null` mientras carga o si no hay path. */
  url: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Resuelve una `storagePath` a una URL pública.
 *
 * Hoy solo devuelve tal cual dos formatos ya utilizables:
 *   • URL absoluta (`https://...`, típico Storage ya firmado).
 *   • Path local de `/public/...`.
 *
 * Cuando exista el panel de admin y las portadas vivan en Firebase
 * Storage, este hook llamará a `getDownloadURL(ref(storage, storagePath))`
 * (con cache en memoria). El API del hook — `{ url, loading, error }` —
 * no cambia, así los componentes que ya lo consumen no se tocan.
 */
export function useFirebaseImage(
  storagePath: string | undefined | null
): FirebaseImageState {
  const [state, setState] = useState<FirebaseImageState>(() =>
    resolveSync(storagePath)
  );

  useEffect(() => {
    setState(resolveSync(storagePath));
    // TODO(fb-storage): si `storagePath` no es local ni absoluto,
    // resolverlo con `getDownloadURL(ref(storage, storagePath))` y setState
    // con la URL devuelta. Cachear por path para evitar re-fetches.
  }, [storagePath]);

  return state;
}

function resolveSync(path: string | undefined | null): FirebaseImageState {
  if (!path) return { url: null, loading: false, error: null };
  if (path.startsWith("http") || path.startsWith("/")) {
    return { url: path, loading: false, error: null };
  }
  // `storagePath` estilo Firebase Storage — pendiente de resolver.
  return { url: null, loading: false, error: null };
}
