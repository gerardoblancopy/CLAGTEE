// URL de descarga directa para objetos en GCS.
//
// Se enlaza con un <a href> normal (sin fetch asíncrono previo): el endpoint
// responde 302 hacia la URL firmada. El patrón anterior era
// `await fetch(...)` y luego `window.open(...)`, pero al ejecutarse fuera del
// gesto del usuario el bloqueador de pop-ups lo cancelaba y la descarga
// fallaba en silencio.
export const buildDownloadUrl = (fileKey: string, fileName?: string): string => {
  const params = new URLSearchParams({ object: fileKey, redirect: '1' });
  if (fileName) params.set('filename', fileName);
  return `/api/gcs-sign?${params.toString()}`;
};
