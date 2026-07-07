const API_BASE_URL = '/api/sufragio'; // relativo, mismo dominio/puerto siempre

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.data?.message || json.message || `Error ${res.status}`);
  return json.data; // <-- desempaquetado centralizado
}

export const getEleccionActiva = () => request('/eleccion-activa');
export const votar = (ciudadanoId, candidatoId) =>
  request('/votar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciudadanoId, candidatoId }),
  });
export const consultarEstado = (sesionId) => request(`/estado/${sesionId}`);