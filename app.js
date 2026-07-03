// Configuración de la API
const API_BASE_URL = 'http://localhost:3001/api/sufragio';

// Estado de la aplicación
let appState = {
    ciudadanoId: '',
    eleccionActiva: null,
    candidatos: [],
    candidatoSeleccionado: null,
    sesionId: null,
    pollingInterval: null
};

// DOM Elements
const domElements = {
    rutForm: document.getElementById('rutForm'),
    rutInput: document.getElementById('rutInput'),
    consultarBtn: document.getElementById('consultarBtn'),
    rutError: document.getElementById('rutError'),
    
    papeletaContainer: document.getElementById('papeletaContainer'),
    eleccionInfo: document.getElementById('eleccionInfo'),
    candidatosList: document.getElementById('candidatosList'),
    votoError: document.getElementById('votoError'),
    votarBtn: document.getElementById('votarBtn'),
    cancelarBtn: document.getElementById('cancelarBtn'),
    
    estadoContainer: document.getElementById('estadoContainer'),
    estadoTexto: document.getElementById('estadoTexto'),
    
    resultadoContainer: document.getElementById('resultadoContainer'),
    resultadoInfo: document.getElementById('resultadoInfo'),
    reiniciarBtn: document.getElementById('reiniciarBtn'),
    volverBtn: document.getElementById('volverBtn')
};

// Event Listeners
domElements.consultarBtn.addEventListener('click', consultarEleccion);
domElements.rutInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') consultarEleccion();
});
domElements.votarBtn.addEventListener('click', votar);
domElements.cancelarBtn.addEventListener('click', resetearApp);
domElements.volverBtn.addEventListener('click', resetearApp);
domElements.reiniciarBtn.addEventListener('click', resetearApp);

// Funciones principales

async function consultarEleccion() {
    const rut = domElements.rutInput.value.trim();
    
    // Validar RUT (formato básico)
    if (!validarRUT(rut)) {
        domElements.rutError.textContent = 'Por favor, ingresa un RUT válido (ej: 12345678-9)';
        return;
    }
    
    domElements.rutError.textContent = '';
    domElements.consultarBtn.disabled = true;
    domElements.consultarBtn.textContent = 'Cargando...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/eleccion-activa`);
        
        if (!response.ok) {
            throw new Error(`Error al consultar la elección: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.eleccion || !data.candidatos || data.candidatos.length === 0) {
            domElements.rutError.textContent = 'No hay una elección activa en este momento.';
            return;
        }
        
        // Guardar estado
        appState.ciudadanoId = rut;
        appState.eleccionActiva = data.eleccion;
        appState.candidatos = data.candidatos;
        appState.candidatoSeleccionado = null;
        
        // Mostrar papeleta
        mostrarPapeleta(data);
        
    } catch (error) {
        console.error('Error:', error);
        domElements.rutError.textContent = 'Error al conectar con el servidor. Por favor, intenta nuevamente.';
    } finally {
        domElements.consultarBtn.disabled = false;
        domElements.consultarBtn.textContent = 'Consultar Elección';
    }
}

function mostrarPapeleta(data) {
    // Ocultar formulario, mostrar papeleta
    domElements.rutForm.style.display = 'none';
    domElements.papeletaContainer.style.display = 'block';
    
    // Mostrar información de la elección
    const eleccion = data.eleccion;
    domElements.eleccionInfo.innerHTML = `
        <p><strong>${eleccion.nombre || 'Elección'}</strong></p>
        <p>${eleccion.descripcion || ''}</p>
        <p style="font-size: 14px; color: #718096;">
            ${eleccion.fechaInicio ? `Inicio: ${new Date(eleccion.fechaInicio).toLocaleDateString()}` : ''}
            ${eleccion.fechaFin ? ` - Fin: ${new Date(eleccion.fechaFin).toLocaleDateString()}` : ''}
        </p>
    `;
    
    // Mostrar candidatos
    domElements.candidatosList.innerHTML = '';
    data.candidatos.forEach(candidato => {
        const card = document.createElement('div');
        card.className = 'candidato-card';
        card.dataset.candidatoId = candidato.id;
        card.innerHTML = `
            <div class="candidato-nombre">${candidato.nombre || 'Sin nombre'}</div>
            <div class="candidato-partido">${candidato.partido || 'Sin partido'}</div>
            <div class="candidato-id">ID: ${candidato.id}</div>
        `;
        card.addEventListener('click', () => seleccionarCandidato(candidato.id));
        
        // Si ya estaba seleccionado, marcar
        if (appState.candidatoSeleccionado === candidato.id) {
            card.classList.add('selected');
        }
        
        domElements.candidatosList.appendChild(card);
    });
}

function seleccionarCandidato(candidatoId) {
    appState.candidatoSeleccionado = candidatoId;
    
    // Actualizar UI
    document.querySelectorAll('.candidato-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.candidatoId === candidatoId);
    });
    
    domElements.votoError.textContent = '';
}

async function votar() {
    if (!appState.candidatoSeleccionado) {
        domElements.votoError.textContent = 'Por favor, selecciona un candidato.';
        return;
    }
    
    domElements.votarBtn.disabled = true;
    domElements.votarBtn.textContent = 'Enviando voto...';
    
    try {
        const payload = {
            ciudadanoId: appState.ciudadanoId,
            candidatoId: appState.candidatoSeleccionado
        };
        
        const response = await fetch(`${API_BASE_URL}/votar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al votar');
        }
        
        const data = await response.json();
        appState.sesionId = data.sesionId;
        
        // Cambiar a vista de estado
        domElements.papeletaContainer.style.display = 'none';
        domElements.estadoContainer.style.display = 'block';
        domElements.estadoTexto.textContent = 'Voto enviado. Procesando...';
        
        // Iniciar polling
        iniciarPolling();
        
    } catch (error) {
        console.error('Error al votar:', error);
        domElements.votoError.textContent = error.message || 'Error al enviar el voto. Intenta nuevamente.';
        domElements.votarBtn.disabled = false;
        domElements.votarBtn.textContent = '✅ Votar';
    }
}

function iniciarPolling() {
    // Limpiar intervalo anterior si existe
    if (appState.pollingInterval) {
        clearInterval(appState.pollingInterval);
    }
    
    let intentos = 0;
    const maxIntentos = 30; // 30 * 2s = 60 segundos máximo
    
    appState.pollingInterval = setInterval(async () => {
        intentos++;
        
        try {
            const response = await fetch(`${API_BASE_URL}/estado/${appState.sesionId}`);
            
            if (!response.ok) {
                throw new Error('Error al consultar estado');
            }
            
            const data = await response.json();
            
            if (data.estado === 'APROBADO' || data.estado === 'RECHAZADO') {
                // Voto procesado
                clearInterval(appState.pollingInterval);
                appState.pollingInterval = null;
                mostrarResultado(data.estado);
            } else if (data.estado === 'INICIADO') {
                // Seguir esperando
                domElements.estadoTexto.textContent = `Procesando tu voto... (${intentos})`;
            }
            
            // Timeout por si tarda demasiado
            if (intentos >= maxIntentos) {
                clearInterval(appState.pollingInterval);
                appState.pollingInterval = null;
                domElements.estadoTexto.textContent = 'El voto está tardando más de lo esperado. Por favor, espera o contacta al administrador.';
            }
            
        } catch (error) {
            console.error('Error en polling:', error);
            // Si hay error, seguimos intentando
        }
    }, 2000); // Cada 2 segundos
}

function mostrarResultado(estado) {
    domElements.estadoContainer.style.display = 'none';
    domElements.resultadoContainer.style.display = 'block';
    
    const isAprobado = estado === 'APROBADO';
    const icon = isAprobado ? '✅' : '❌';
    const texto = isAprobado ? '¡Voto Aprobado!' : 'Voto Rechazado';
    const clase = isAprobado ? 'aprobado' : 'rechazado';
    
    domElements.resultadoInfo.innerHTML = `
        <div class="resultado-icon">${icon}</div>
        <div class="resultado-texto ${clase}">${texto}</div>
        <div class="resultado-detalle">
            ${isAprobado ? 'Tu voto ha sido registrado exitosamente.' : 'Tu voto no fue aprobado. Por favor, intenta nuevamente.'}
        </div>
        <div class="resultado-detalle" style="margin-top: 10px; font-size: 12px;">
            Sesión ID: ${appState.sesionId}
        </div>
    `;
}

function resetearApp() {
    // Limpiar polling
    if (appState.pollingInterval) {
        clearInterval(appState.pollingInterval);
        appState.pollingInterval = null;
    }
    
    // Resetear estado
    appState = {
        ciudadanoId: '',
        eleccionActiva: null,
        candidatos: [],
        candidatoSeleccionado: null,
        sesionId: null,
        pollingInterval: null
    };
    
    // Resetear UI
    domElements.rutForm.style.display = 'block';
    domElements.papeletaContainer.style.display = 'none';
    domElements.estadoContainer.style.display = 'none';
    domElements.resultadoContainer.style.display = 'none';
    domElements.rutInput.value = '';
    domElements.rutError.textContent = '';
    domElements.votoError.textContent = '';
    domElements.consultarBtn.disabled = false;
    domElements.consultarBtn.textContent = 'Consultar Elección';
    domElements.votarBtn.disabled = false;
    domElements.votarBtn.textContent = '✅ Votar';
}

function validarRUT(rut) {
    // Validación básica de RUT chileno
    const rutRegex = /^[0-9]{7,8}-[0-9kK]$/;
    return rutRegex.test(rut);
}

// Inicializar app
resetearApp();