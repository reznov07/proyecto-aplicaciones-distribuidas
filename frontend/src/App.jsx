import './App.css'


import { useState, useRef } from 'react';
import { getEleccionActiva, votar as votarApi, consultarEstado } from './api';

const validarRUT = (rut) => /^[0-9]{7,8}-[0-9kK]$/.test(rut);

export default function App() {
  const [vista, setVista] = useState('form'); // form | papeleta | estado | resultado
  const [rut, setRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [eleccion, setEleccion] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [votoError, setVotoError] = useState('');
  const [estadoTexto, setEstadoTexto] = useState('');
  const [resultado, setResultado] = useState(null);
  const sesionIdRef = useRef(null);
  const pollingRef = useRef(null);

  async function consultarEleccion() {
    if (!validarRUT(rut)) return setRutError('RUT inválido (ej: 12345678-9)');
    setRutError(''); setCargando(true);
    try {
      const data = await getEleccionActiva();
      if (!data.eleccion || !data.candidatos?.length) {
        setRutError('No hay una elección activa en este momento.');
        return;
      }
      setEleccion(data.eleccion);
      setCandidatos(data.candidatos);
      setVista('papeleta');
    } catch {
      setRutError('Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  async function handleVotar() {
    if (!seleccionado) return setVotoError('Selecciona un candidato.');
    setVotoError('');
    try {
      const data = await votarApi(rut, seleccionado);
      sesionIdRef.current = data.sesionId;
      setVista('estado');
      setEstadoTexto('Voto enviado. Procesando...');
      iniciarPolling();
    } catch (e) {
      setVotoError(e.message);
    }
  }

  function iniciarPolling() {
    let intentos = 0;
    pollingRef.current = setInterval(async () => {
      intentos++;
      try {
        const data = await consultarEstado(sesionIdRef.current);
        if (data.estado === 'APROBADO' || data.estado === 'RECHAZADO') {
          clearInterval(pollingRef.current);
          setResultado(data.estado);
          setVista('resultado');
        } else {
          setEstadoTexto(`Procesando tu voto... (${intentos})`);
        }
        if (intentos >= 30) {
          clearInterval(pollingRef.current);
          setEstadoTexto('Está tardando más de lo esperado.');
        }
      } catch { /* seguir intentando */ }
    }, 2000);
  }

  function resetear() {
    clearInterval(pollingRef.current);
    setVista('form'); setRut(''); setRutError(''); setEleccion(null);
    setCandidatos([]); setSeleccionado(null); setVotoError('');
    setResultado(null); sesionIdRef.current = null;
  }

  return (
    <div className="container">
      <header><h1>Sistema de Votación</h1></header>

      {vista === 'form' && (
        <div className="card">
          <h2>Ingresa tu RUT para votar</h2>
          <div className="form-group">
            <input value={rut} onChange={(e) => setRut(e.target.value)}
              placeholder="Ej: 12345678-9" maxLength={12}
              onKeyPress={(e) => e.key === 'Enter' && consultarEleccion()} />
            <button className="btn-primary" disabled={cargando} onClick={consultarEleccion}>
              {cargando ? 'Cargando...' : 'Consultar Elección'}
            </button>
          </div>
          <div className="error-message">{rutError}</div>
        </div>
      )}

      {vista === 'papeleta' && (
        <div className="card">
          <h2>Selecciona tu candidato</h2>
          <div className="eleccion-info">
            <p><strong>{eleccion.nombre || 'Elección'}</strong></p>
          </div>
          <div className="candidatos-grid">
            {candidatos.map((c) => (
              <div key={c.id} className={`candidato-card ${seleccionado === c.id ? 'selected' : ''}`}
                onClick={() => setSeleccionado(c.id)}>
                <div className="candidato-nombre">{c.nombre}</div>
                <div className="candidato-partido">{c.partido}</div>
              </div>
            ))}
          </div>
          <div className="error-message">{votoError}</div>
          <div className="button-group">
            <button className="btn-success" onClick={handleVotar}>✅ Votar</button>
            <button className="btn-secondary" onClick={resetear}>Cancelar</button>
          </div>
        </div>
      )}

      {vista === 'estado' && (
        <div className="card">
          <h2>Estado de tu voto</h2>
          <div className="spinner" />
          <p>{estadoTexto}</p>
          <button className="btn-secondary" onClick={resetear}>Volver al inicio</button>
        </div>
      )}

      {vista === 'resultado' && (
        <div className="card">
          <h2>Resultado de tu voto</h2>
          <div className={`resultado-texto ${resultado === 'APROBADO' ? 'aprobado' : 'rechazado'}`}>
            {resultado === 'APROBADO' ? '✅ ¡Voto Aprobado!' : '❌ Voto Rechazado'}
          </div>
          <button className="btn-primary" onClick={resetear}>Votar nuevamente</button>
        </div>
      )}
    </div>
  );
}