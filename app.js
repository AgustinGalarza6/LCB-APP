// === IMPORTS DE FIREBASE ===
import { 
    obtenerCanciones, 
    agregarCancionFirestore, 
    actualizarCancionFirestore, 
    eliminarCancionFirestore,
    escucharCambiosCanciones,
    crearEvento,
    obtenerEventos,
    actualizarEvento,
    crearPlaylist,
    obtenerPlaylists,
    actualizarPlaylist
} from './firebase-db.js';

// === ESTADO DE LA APLICACIÓN ===
let canciones = [];
let cancionEditando = null;
let cancionActual = null;
let transposicion = 0;
let unsubscribeListener = null;
let eventoActual = null; // Para gestionar eventos masivos
let playlistActual = null; // Para gestionar cronogramas/playlists
let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
let modoOscuro = localStorage.getItem('modoOscuro') === 'true';

// === ELEMENTOS DEL DOM ===
const elementos = {
    listaCanciones: document.getElementById('listaCanciones'),
    mensajeVacio: document.getElementById('mensajeVacio'),
    inputBuscar: document.getElementById('inputBuscar'),
    searchType: document.getElementById('searchType'),
    
    // Modal Agregar/Editar
    modalCancion: document.getElementById('modalCancion'),
    modalTitulo: document.getElementById('modalTitulo'),
    formCancion: document.getElementById('formCancion'),
    btnAgregarCancion: document.getElementById('btnAgregarCancion'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
    btnCancelar: document.getElementById('btnCancelar'),
    
    // Campos del formulario
    inputTitulo: document.getElementById('titulo'),
    inputArtista: document.getElementById('artista'),
    inputTono: document.getElementById('tono'),
    inputBpm: document.getElementById('bpm'),
    inputAcordes: document.getElementById('acordes'),
    inputLetra: document.getElementById('letra'),
    inputTematica: document.getElementById('tematica'),

    // Panel lateral (eventos, playlists)
    btnCrearEvento: document.getElementById('btnCrearEvento'),
    listaEventos: document.getElementById('listaEventos'),
    btnCrearPlaylist: document.getElementById('btnCrearPlaylist'),
    listaPlaylists: document.getElementById('listaPlaylists'),

    // Toast y Loading
    toastContainer: document.getElementById('toastContainer'),
    loadingSpinner: document.getElementById('loadingSpinner'),

    // Panel lateral toggle
    btnTogglePanel: document.getElementById('btnTogglePanel'),
    panelSide: document.getElementById('panelSide'),
    panelOverlay: document.getElementById('panelOverlay'),
    btnCerrarPanel: document.getElementById('btnCerrarPanel'),

    // Modal Evento
    modalEvento: document.getElementById('modalEvento'),
    btnCerrarModalEvento: document.getElementById('btnCerrarModalEvento'),
    eventoNombre: document.getElementById('eventoNombre'),
    eventoFecha: document.getElementById('eventoFecha'),
    eventoDescripcion: document.getElementById('eventoDescripcion'),
    cuerpoTablaMusicos: document.getElementById('cuerpoTablaMusicos'),
    btnAgregarMusico: document.getElementById('btnAgregarMusico'),
    cancionesEvento: document.getElementById('cancionesEvento'),
    btnAgregarCancionEvento: document.getElementById('btnAgregarCancionEvento'),
    btnCancelarEvento: document.getElementById('btnCancelarEvento'),
    btnGuardarEvento: document.getElementById('btnGuardarEvento'),

    // Modal Playlist/Cronograma
    modalPlaylist: document.getElementById('modalPlaylist'),
    btnCerrarModalPlaylist: document.getElementById('btnCerrarModalPlaylist'),
    playlistNombre: document.getElementById('playlistNombre'),
    playlistFecha: document.getElementById('playlistFecha'),
    cuerpoTablaPlaylist: document.getElementById('cuerpoTablaPlaylist'),
    btnAgregarMusicoPlaylist: document.getElementById('btnAgregarMusicoPlaylist'),
    cancionesPlaylist: document.getElementById('cancionesPlaylist'),
    btnAgregarCancionPlaylist: document.getElementById('btnAgregarCancionPlaylist'),
    btnCancelarPlaylist: document.getElementById('btnCancelarPlaylist'),
    btnGuardarPlaylist: document.getElementById('btnGuardarPlaylist'),

    // Modal Selección Canciones
    modalSeleccionCanciones: document.getElementById('modalSeleccionCanciones'),
    btnCerrarModalSeleccion: document.getElementById('btnCerrarModalSeleccion'),
    buscarCancionModal: document.getElementById('buscarCancionModal'),
    listaCancionesSeleccion: document.getElementById('listaCancionesSeleccion'),
    
    // Modal Ver Canción
    modalVerCancion: document.getElementById('modalVerCancion'),
    btnCerrarModalVer: document.getElementById('btnCerrarModalVer'),
    verTitulo: document.getElementById('verTitulo'),
    verArtista: document.getElementById('verArtista'),
    verTono: document.getElementById('verTono'),
    verLetra: document.getElementById('verLetra'),
    verAcordes: document.getElementById('verAcordes'),
    btnEditarCancion: document.getElementById('btnEditarCancion'),
    btnEliminarCancion: document.getElementById('btnEliminarCancion'),
    btnFavorito: document.getElementById('btnFavorito'),
    btnCompartir: document.getElementById('btnCompartir'),
    
    // Transposición
    btnTransposeUp: document.getElementById('btnTransposeUp'),
    btnTransposeDown: document.getElementById('btnTransposeDown'),
    btnTransposeReset: document.getElementById('btnTransposeReset'),
    
    // Modo Oscuro
    btnModoOscuro: document.getElementById('btnModoOscuro'),
    
    // Favoritos
    btnVerFavoritos: document.getElementById('btnVerFavoritos'),
    favoritosBadge: document.getElementById('favoritosBadge'),
    searchSection: document.getElementById('searchSection'),
    searchTitleMain: document.getElementById('searchTitleMain'),
    
    // Compartir
    modalCompartir: document.getElementById('modalCompartir'),
    btnCerrarModalCompartir: document.getElementById('btnCerrarModalCompartir'),
    compartirTitulo: document.getElementById('compartirTitulo'),
    compartirArtista: document.getElementById('compartirArtista'),
    btnCompartirWhatsApp: document.getElementById('btnCompartirWhatsApp'),
    btnCompartirTelegram: document.getElementById('btnCompartirTelegram'),
    btnCopiarEnlace: document.getElementById('btnCopiarEnlace'),
    qrCanvas: document.getElementById('qrCanvas'),
    
    // Exportar/Importar
    btnExportar: document.getElementById('btnExportar'),
    modalExportar: document.getElementById('modalExportar'),
    btnCerrarModalExportar: document.getElementById('btnCerrarModalExportar'),
    btnExportarPDF: document.getElementById('btnExportarPDF'),
    btnExportarJSON: document.getElementById('btnExportarJSON'),
    btnImportar: document.getElementById('btnImportar'),
    inputImportar: document.getElementById('inputImportar')
};

// === FUNCIONES DE UTILIDAD ===

// Sistema de Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <strong>${message}</strong>
        </div>
        <button class="toast-close">×</button>
    `;
    
    elementos.toastContainer.appendChild(toast);
    
    // Cerrar al hacer click en X
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    });
    
    // Auto-cerrar después de duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// === SISTEMA DE FAVORITOS ===
let vistaFavoritosActiva = false;

function toggleFavorito(cancionId) {
    const index = favoritos.indexOf(cancionId);
    if (index > -1) {
        favoritos.splice(index, 1);
    } else {
        favoritos.push(cancionId);
    }
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    actualizarBotonFavorito(cancionId);
    actualizarBadgeFavoritos();
    renderizarCanciones();
}

function esFavorito(cancionId) {
    return favoritos.includes(cancionId);
}

function actualizarBotonFavorito(cancionId) {
    if (!cancionActual || cancionActual.id !== cancionId) return;
    
    const esFav = esFavorito(cancionId);
    elementos.btnFavorito.classList.toggle('active', esFav);
    elementos.btnFavorito.querySelector('i').className = esFav ? 'bi bi-star-fill' : 'bi bi-star';
    elementos.btnFavorito.title = esFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
}

function actualizarBadgeFavoritos() {
    const count = favoritos.length;
    elementos.favoritosBadge.textContent = count;
    elementos.favoritosBadge.style.display = count > 0 ? 'flex' : 'none';
}

function toggleVistaFavoritos() {
    vistaFavoritosActiva = !vistaFavoritosActiva;
    
    // Toggle clase en botón
    elementos.btnVerFavoritos.classList.toggle('active', vistaFavoritosActiva);
    
    // Toggle clase en search section
    elementos.searchSection.classList.toggle('favoritos-view', vistaFavoritosActiva);
    
    if (vistaFavoritosActiva) {
        // Cambiar título
        elementos.searchTitleMain.innerHTML = '<span class="favoritos-icon">⭐</span> Mis Canciones Favoritas';
        
        // Ocultar controles de búsqueda
        elementos.searchType.parentElement.style.display = 'none';
        
        // Limpiar input de búsqueda
        elementos.inputBuscar.value = '';
    } else {
        // Restaurar título
        elementos.searchTitleMain.textContent = 'Buscar Canciones';
        
        // Mostrar controles de búsqueda
        elementos.searchType.parentElement.style.display = 'flex';
        
        // Limpiar input de búsqueda
        elementos.inputBuscar.value = '';
    }
    
    // Re-renderizar canciones SIN filtro
    renderizarCanciones('');
}

// === MODO OSCURO ===
function toggleModoOscuro() {
    modoOscuro = !modoOscuro;
    document.body.classList.toggle('dark-mode', modoOscuro);
    localStorage.setItem('modoOscuro', modoOscuro);
    
    const icon = elementos.btnModoOscuro.querySelector('i');
    
    if (modoOscuro) {
        icon.className = 'bi bi-sun-fill';
        elementos.btnModoOscuro.title = 'Cambiar a modo claro';
    } else {
        icon.className = 'bi bi-moon-fill';
        elementos.btnModoOscuro.title = 'Cambiar a modo oscuro';
    }
}

function aplicarModoOscuro() {
    if (modoOscuro) {
        document.body.classList.add('dark-mode');
        const icon = elementos.btnModoOscuro.querySelector('i');
        icon.className = 'bi bi-sun-fill';
        elementos.btnModoOscuro.title = 'Cambiar a modo claro';
    }
}

// === COMPARTIR CANCIONES ===
function abrirModalCompartir() {
    if (!cancionActual) return;
    
    elementos.compartirTitulo.textContent = cancionActual.titulo;
    elementos.compartirArtista.textContent = cancionActual.artista;
    
    // Generar QR Code
    generarQRCode(window.location.href + `?cancion=${cancionActual.id}`);
    
    abrirModal(elementos.modalCompartir);
}

function compartirWhatsApp() {
    if (!cancionActual) return;
    const texto = `🎵 *${cancionActual.titulo}*\n👤 ${cancionActual.artista}\n🎸 Tono: ${cancionActual.tono || 'N/A'}\n\n${window.location.href}?cancion=${cancionActual.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

function compartirTelegram() {
    if (!cancionActual) return;
    const texto = `🎵 ${cancionActual.titulo}\n👤 ${cancionActual.artista}\n🎸 Tono: ${cancionActual.tono || 'N/A'}\n\n${window.location.href}?cancion=${cancionActual.id}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href + '?cancion=' + cancionActual.id)}&text=${encodeURIComponent(texto)}`, '_blank');
}

function copiarEnlace() {
    if (!cancionActual) return;
    const enlace = `${window.location.href}?cancion=${cancionActual.id}`;
    navigator.clipboard.writeText(enlace).then(() => {
        showToast('Enlace copiado al portapapeles', 'success');
    }).catch(() => {
        showToast('Error al copiar enlace', 'error');
    });
}

function generarQRCode(texto) {
    // Implementación simple de QR Code usando canvas
    const canvas = elementos.qrCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // Por ahora, mostrar un texto indicando que se necesita una librería externa
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 90);
    ctx.fillText('(Requiere librería', 100, 110);
    ctx.fillText('externa)', 100, 125);
}

// === EXPORTAR/IMPORTAR ===
function exportarJSON() {
    const backup = {
        version: '1.0',
        fecha: new Date().toISOString(),
        canciones: canciones,
        favoritos: favoritos
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lcb-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Backup exportado exitosamente', 'success');
}

async function importarJSON() {
    elementos.inputImportar.click();
}

function exportarPDF() {
    showToast('Exportar a PDF - Función en desarrollo', 'info');
    // Aquí se implementaría con una librería como jsPDF
}

// Mostrar/ocultar spinner de carga
function showLoading() {
    elementos.loadingSpinner.classList.add('active');
}

function hideLoading() {
    elementos.loadingSpinner.classList.remove('active');
}

// === FUNCIONES DE FIREBASE ===
async function cargarCanciones() {
    try {
        // Mostrar indicador de carga si quieres
        canciones = await obtenerCanciones();
        renderizarCanciones();
        
        // Iniciar listener de cambios en tiempo real
        if (unsubscribeListener) {
            unsubscribeListener(); // Cancelar listener anterior si existe
        }
        
        unsubscribeListener = escucharCambiosCanciones((cancionesActualizadas) => {
            canciones = cancionesActualizadas;
            renderizarCanciones();
            console.log('Canciones actualizadas en tiempo real');
        });
    } catch (error) {
        console.error('Error al cargar canciones:', error);
        alert('Error al cargar las canciones. Verifica tu conexión.');
    }
}

// === FUNCIONES DE RENDERIZADO ===
function renderizarCanciones(filtro = '') {
    elementos.listaCanciones.innerHTML = '';
    
    let cancionesFiltradas;
    
    // Si está activa la vista de favoritos, mostrar solo favoritos
    if (vistaFavoritosActiva) {
        cancionesFiltradas = canciones.filter(cancion => esFavorito(cancion.id));
        
        // Opcionalmente filtrar dentro de favoritos
        if (filtro) {
            const textoFiltro = filtro.toLowerCase();
            cancionesFiltradas = cancionesFiltradas.filter(cancion =>
                cancion.titulo.toLowerCase().includes(textoFiltro) ||
                cancion.artista.toLowerCase().includes(textoFiltro)
            );
        }
    } else {
        // Vista normal con filtro
        cancionesFiltradas = canciones.filter(cancion => {
            const textoFiltro = filtro.toLowerCase();
            return cancion.titulo.toLowerCase().includes(textoFiltro) ||
                    cancion.artista.toLowerCase().includes(textoFiltro);
        });
    }
    
    if (cancionesFiltradas.length === 0) {
        elementos.mensajeVacio.style.display = 'block';
        elementos.listaCanciones.style.display = 'none';
        
        // Mensaje personalizado para favoritos
        if (vistaFavoritosActiva && favoritos.length === 0) {
            elementos.mensajeVacio.innerHTML = '<p>⭐ No tienes canciones favoritas aún</p><small>Marca canciones como favoritas para verlas aquí</small>';
        } else if (vistaFavoritosActiva) {
            elementos.mensajeVacio.innerHTML = '<p>No se encontraron canciones favoritas con ese filtro</p>';
        } else {
            elementos.mensajeVacio.innerHTML = '<p>No se encontraron canciones</p><small>Intenta con otros filtros o agrega una nueva canción</small>';
        }
        return;
    }
    
    elementos.mensajeVacio.style.display = 'none';
    elementos.listaCanciones.style.display = 'grid';
    
    cancionesFiltradas.forEach(cancion => {
        const card = crearCardCancion(cancion);
        elementos.listaCanciones.appendChild(card);
    });
}

function crearCardCancion(cancion) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.onclick = () => mostrarCancion(cancion);
    
    // Agregar clase si es favorito
    if (esFavorito(cancion.id)) {
        card.classList.add('favorito');
    }
    
    const tonoHtml = cancion.tono ? `<span class="tono">Tono: ${escapeHtml(cancion.tono)}</span>` : '';
    const bpmHtml = cancion.bpm ? `<span class="bpm-badge">♩ ${cancion.bpm} BPM</span>` : '';
    
    card.innerHTML = `
        <h3>${escapeHtml(cancion.titulo)}</h3>
        <p class="artista">${escapeHtml(cancion.artista)}</p>
        <div>${tonoHtml}${bpmHtml}</div>
    `;
    
    return card;
}

function mostrarCancion(cancion) {
    cancionActual = cancion;
    transposicion = 0;
    
    elementos.verTitulo.textContent = cancion.titulo;
    elementos.verArtista.textContent = `${cancion.artista}`;
    actualizarVistaCancion();
    
    // Actualizar estado del botón favorito
    actualizarBotonFavorito(cancion.id);
    
    // Guardar referencia para editar/eliminar
    elementos.btnEditarCancion.onclick = () => {
        cerrarModal(elementos.modalVerCancion);
        editarCancion(cancion);
    };
    
    elementos.btnEliminarCancion.onclick = () => {
        if (confirm(`¿Seguro que quieres eliminar "${cancion.titulo}"?`)) {
            eliminarCancion(cancion.id);
            cerrarModal(elementos.modalVerCancion);
        }
    };
    
    abrirModal(elementos.modalVerCancion);
}

function actualizarVistaCancion() {
    if (!cancionActual) return;
    
    const tonoOriginal = cancionActual.tono || '';
    const tonoTranspuesto = tonoOriginal ? transponerAcorde(tonoOriginal, transposicion) : '';
    
    let tonoTexto = '';
    if (tonoTranspuesto) {
        tonoTexto = transposicion === 0 
            ? `Tonalidad: ${tonoTranspuesto}` 
            : `Tonalidad: ${tonoTranspuesto} (Original: ${tonoOriginal})`;
        
        // Sugerencia de capo
        if (transposicion < 0) {
            const capoPos = Math.abs(transposicion);
            tonoTexto += ` <span class="capo-suggestion">💡 Capo en traste ${capoPos}</span>`;
        }
    }
    
    // Agregar BPM si existe
    if (cancionActual.bpm) {
        tonoTexto += ` <span class="bpm-badge">♩ ${cancionActual.bpm} BPM</span>`;
    }
    
    elementos.verTono.innerHTML = tonoTexto;
    
    // Para acordes: usar la letra con acordes transpuestos
    const acordesTranspuestos = transponerLetra(cancionActual.acordes || '', transposicion);
    elementos.verAcordes.innerHTML = formatearLetraConAcordes(acordesTranspuestos);
    
    // Para letra: usar solo la letra sin acordes (no transponer)
    const letraSola = cancionActual.letra || '';
    elementos.verLetra.innerHTML = letraSola.split('\n').map(l => l === '' ? '<div class="linea-vacia"></div>' : `<div class="linea-letra">${escapeHtml(l)}</div>`).join('');
}

// === GESTIÓN DE EVENTOS (eventos masivos) ===
async function crearEventoCompleto() {
    eventoActual = { canciones: [], musicos: [], descripcion: '' };
    elementos.eventoNombre.value = '';
    elementos.eventoFecha.value = '';
    elementos.eventoDescripcion.value = '';
    elementos.cuerpoTablaMusicos.innerHTML = '';
    elementos.cancionesEvento.innerHTML = '<small>No hay canciones agregadas</small>';
    abrirModal(elementos.modalEvento);
}

async function abrirEvento(evento) {
    eventoActual = evento;
    elementos.eventoNombre.value = evento.nombre || '';
    elementos.eventoFecha.value = evento.fecha || '';
    elementos.eventoDescripcion.value = evento.descripcion || '';
    
    // Renderizar músicos
    elementos.cuerpoTablaMusicos.innerHTML = '';
    (evento.musicos || []).forEach(m => agregarFilaMusicoEvento(m.rol, m.nombre));
    
    // Renderizar canciones
    renderizarCancionesEvento();
    
    abrirModal(elementos.modalEvento);
}

function agregarFilaMusicoEvento(rol = '', nombre = '') {
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td><input type="text" class="input-tabla" placeholder="Ej: Voz, Guitarra" value="${escapeHtml(rol)}"></td>
        <td><input type="text" class="input-tabla" placeholder="Nombre" value="${escapeHtml(nombre)}"></td>
        <td><button type="button" class="btn-eliminar-fila">✕</button></td>
    `;
    fila.querySelector('.btn-eliminar-fila').addEventListener('click', () => fila.remove());
    elementos.cuerpoTablaMusicos.appendChild(fila);
}

function renderizarCancionesEvento() {
    if (!eventoActual || !eventoActual.canciones || eventoActual.canciones.length === 0) {
        elementos.cancionesEvento.innerHTML = '<small>No hay canciones agregadas</small>';
        return;
    }
    
    elementos.cancionesEvento.innerHTML = '';
    eventoActual.canciones.forEach((cancionId, index) => {
        const cancion = canciones.find(c => c.id === cancionId);
        if (cancion) {
            const item = document.createElement('div');
            item.className = 'cancion-evento-item';
            item.innerHTML = `
                <span>${index + 1}. ${escapeHtml(cancion.titulo)} - ${escapeHtml(cancion.artista)}</span>
                <button class="btn-eliminar-mini" data-index="${index}">✕</button>
            `;
            
            // Click en la canción para verla
            item.addEventListener('click', (e) => {
                // Evitar abrir si se clickeó el botón eliminar
                if (!e.target.classList.contains('btn-eliminar-mini')) {
                    mostrarCancion(cancion);
                }
            });
            
            // Botón eliminar
            item.querySelector('.btn-eliminar-mini').addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se dispare el click del item
                const idx = parseInt(e.target.getAttribute('data-index'));
                eventoActual.canciones.splice(idx, 1);
                renderizarCancionesEvento();
            });
            
            elementos.cancionesEvento.appendChild(item);
        }
    });
}

async function guardarEvento() {
    const nombre = elementos.eventoNombre.value.trim();
    const fecha = elementos.eventoFecha.value;
    const descripcion = elementos.eventoDescripcion.value.trim();
    
    if (!nombre || !fecha) {
        alert('Por favor completa el nombre y fecha del evento');
        return;
    }
    
    // Recopilar músicos de la tabla
    const musicos = [];
    elementos.cuerpoTablaMusicos.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('.input-tabla');
        const rol = inputs[0].value.trim();
        const nombreMusico = inputs[1].value.trim();
        if (rol && nombreMusico) {
            musicos.push({ rol, nombre: nombreMusico });
        }
    });
    
    const datosEvento = {
        nombre,
        fecha,
        descripcion,
        musicos,
        canciones: eventoActual.canciones || []
    };
    
    try {
        if (eventoActual.id) {
            await actualizarEvento(eventoActual.id, datosEvento);
            alert('Evento actualizado');
        } else {
            await crearEvento(datosEvento);
            alert('Evento creado');
        }
        cerrarModal(elementos.modalEvento);
        await cargarYMostrarEventos();
    } catch (err) {
        console.error(err);
        alert('Error al guardar evento');
    }
}

// === GESTIÓN DE PLAYLISTS/CRONOGRAMAS ===
async function crearPlaylistCompleto() {
    playlistActual = { canciones: [], musicos: [] };
    elementos.playlistNombre.value = '';
    elementos.playlistFecha.value = '';
    elementos.cuerpoTablaPlaylist.innerHTML = '';
    elementos.cancionesPlaylist.innerHTML = '<small>No hay canciones agregadas</small>';
    abrirModal(elementos.modalPlaylist);
}

async function abrirPlaylist(playlist) {
    playlistActual = playlist;
    elementos.playlistNombre.value = playlist.nombre || '';
    elementos.playlistFecha.value = playlist.fecha || '';
    
    // Renderizar músicos
    elementos.cuerpoTablaPlaylist.innerHTML = '';
    (playlist.musicos || []).forEach(m => agregarFilaMusicoPlaylist(m.rol, m.nombre));
    
    // Renderizar canciones
    renderizarCancionesPlaylist();
    
    abrirModal(elementos.modalPlaylist);
}

function agregarFilaMusicoPlaylist(rol = '', nombre = '') {
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td><input type="text" class="input-tabla" placeholder="Ej: Voz, Guitarra" value="${escapeHtml(rol)}"></td>
        <td><input type="text" class="input-tabla" placeholder="Nombre" value="${escapeHtml(nombre)}"></td>
        <td><button type="button" class="btn-eliminar-fila">✕</button></td>
    `;
    fila.querySelector('.btn-eliminar-fila').addEventListener('click', () => fila.remove());
    elementos.cuerpoTablaPlaylist.appendChild(fila);
}

function renderizarCancionesPlaylist() {
    if (!playlistActual || !playlistActual.canciones || playlistActual.canciones.length === 0) {
        elementos.cancionesPlaylist.innerHTML = '<small>No hay canciones agregadas</small>';
        return;
    }
    
    elementos.cancionesPlaylist.innerHTML = '';
    playlistActual.canciones.forEach((cancionId, index) => {
        const cancion = canciones.find(c => c.id === cancionId);
        if (cancion) {
            const item = document.createElement('div');
            item.className = 'cancion-evento-item';
            item.innerHTML = `
                <span>${index + 1}. ${escapeHtml(cancion.titulo)} - ${escapeHtml(cancion.artista)}</span>
                <button class="btn-eliminar-mini" data-index="${index}">✕</button>
            `;
            
            // Click en la canción para verla
            item.addEventListener('click', (e) => {
                // Evitar abrir si se clickeó el botón eliminar
                if (!e.target.classList.contains('btn-eliminar-mini')) {
                    mostrarCancion(cancion);
                }
            });
            
            // Botón eliminar
            item.querySelector('.btn-eliminar-mini').addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se dispare el click del item
                const idx = parseInt(e.target.getAttribute('data-index'));
                playlistActual.canciones.splice(idx, 1);
                renderizarCancionesPlaylist();
            });
            
            elementos.cancionesPlaylist.appendChild(item);
        }
    });
}

async function guardarPlaylist() {
    const nombre = elementos.playlistNombre.value.trim();
    const fecha = elementos.playlistFecha.value;
    
    if (!nombre || !fecha) {
        alert('Por favor completa el nombre y fecha');
        return;
    }
    
    // Recopilar músicos de la tabla
    const musicos = [];
    elementos.cuerpoTablaPlaylist.querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('.input-tabla');
        const rol = inputs[0].value.trim();
        const nombreMusico = inputs[1].value.trim();
        if (rol && nombreMusico) {
            musicos.push({ rol, nombre: nombreMusico });
        }
    });
    
    const datosPlaylist = {
        nombre,
        fecha,
        musicos,
        canciones: playlistActual.canciones || []
    };
    
    try {
        if (playlistActual.id) {
            await actualizarPlaylist(playlistActual.id, datosPlaylist);
            alert('Cronograma actualizado');
        } else {
            await crearPlaylist(datosPlaylist);
            alert('Cronograma creado');
        }
        cerrarModal(elementos.modalPlaylist);
        await cargarYMostrarPlaylists();
    } catch (err) {
        console.error(err);
        alert('Error al guardar cronograma');
    }
}

// === MODAL SELECCIÓN DE CANCIONES (compartido) ===
let tipoSeleccion = 'evento'; // 'evento' o 'playlist'

function abrirModalSeleccionCanciones(tipo = 'evento') {
    tipoSeleccion = tipo;
    renderizarListaSeleccionCanciones();
    abrirModal(elementos.modalSeleccionCanciones);
}

function renderizarListaSeleccionCanciones(filtro = '') {
    elementos.listaCancionesSeleccion.innerHTML = '';
    
    const cancionesFiltradas = canciones.filter(c => {
        const texto = filtro.toLowerCase();
        return c.titulo.toLowerCase().includes(texto) || c.artista.toLowerCase().includes(texto);
    });
    
    cancionesFiltradas.forEach(cancion => {
        const item = document.createElement('div');
        item.className = 'cancion-seleccion-item';
        
        const target = tipoSeleccion === 'evento' ? eventoActual : playlistActual;
        const yaAgregada = target.canciones && target.canciones.includes(cancion.id);
        
        item.innerHTML = `
            <span>${escapeHtml(cancion.titulo)} - ${escapeHtml(cancion.artista)}</span>
            <button class="btn btn-small ${yaAgregada ? 'btn-secondary' : ''}" ${yaAgregada ? 'disabled' : ''}>
                ${yaAgregada ? 'Agregada' : 'Agregar'}
            </button>
        `;
        if (!yaAgregada) {
            item.querySelector('button').addEventListener('click', () => {
                if (!target.canciones) target.canciones = [];
                target.canciones.push(cancion.id);
                
                if (tipoSeleccion === 'evento') {
                    renderizarCancionesEvento();
                } else {
                    renderizarCancionesPlaylist();
                }
                
                renderizarListaSeleccionCanciones(elementos.buscarCancionModal.value);
            });
        }
        elementos.listaCancionesSeleccion.appendChild(item);
    });
}

async function cargarYMostrarEventos() {
    try {
        const eventos = await obtenerEventos();
        elementos.listaEventos.innerHTML = '';
        if (eventos.length === 0) {
            elementos.listaEventos.innerHTML = '<small>No hay eventos</small>';
            return;
        }
        eventos.forEach(ev => {
            const el = document.createElement('div');
            el.className = 'evento-item';
            const fechaFormateada = formatearFecha(ev.fecha);
            el.textContent = `${ev.nombre} - ${fechaFormateada}`;
            el.addEventListener('click', () => abrirEvento(ev));
            elementos.listaEventos.appendChild(el);
        });
    } catch (err) { console.error('cargarYMostrarEventos', err); }
}

// Playlists: crear y listar
async function cargarYMostrarPlaylists() {
    try {
        const pls = await obtenerPlaylists();
        elementos.listaPlaylists.innerHTML = '';
        if (pls.length === 0) {
            elementos.listaPlaylists.innerHTML = '<small>No hay playlists</small>';
            return;
        }
        pls.forEach(pl => {
            const el = document.createElement('div');
            el.className = 'playlist-item';
            const fechaFormateada = formatearFecha(pl.fecha);
            el.textContent = `${pl.nombre} - ${fechaFormateada}`;
            el.addEventListener('click', () => abrirPlaylist(pl));
            elementos.listaPlaylists.appendChild(el);
        });
    } catch (err) { console.error('cargarYMostrarPlaylists', err); }
}

function formatearLetraConAcordes(letra) {
    // Procesa la letra línea por línea para colocar acordes encima del texto
    const lineas = letra.split('\n');
    let html = '';
    let i = 0;
    
    while (i < lineas.length) {
        const linea = lineas[i];
        
        // Detectar si es una línea solo de acordes (sin corchetes)
        if (esLineaDeAcordes(linea)) {
            // Si la siguiente línea existe y tiene letra, mostrar acordes encima
            if (i + 1 < lineas.length && lineas[i + 1].trim() !== '' && !esLineaDeAcordes(lineas[i + 1])) {
                html += '<div class="linea-con-acordes">';
                html += `<div class="linea-acordes">${resaltarAcordes(linea)}</div>`;
                html += `<div class="linea-texto">${escapeHtml(lineas[i + 1])}</div>`;
                html += '</div>';
                // Saltar la siguiente línea porque ya la procesamos
                i += 2;
                continue;
            } else {
                // Línea de acordes sola
                html += `<div class="linea-acordes-sola">${resaltarAcordes(linea)}</div>`;
            }
        } else if (linea.includes('[')) {
            // Sistema original con corchetes
            const lineaConAcordes = procesarLineaConAcordes(linea);
            html += lineaConAcordes;
        } else {
            // Línea normal sin acordes
            if (linea.trim() === '') {
                html += '<div class="linea-vacia"></div>';
            } else {
                html += `<div class="linea-letra">${escapeHtml(linea)}</div>`;
            }
        }
        
        i++;
    }
    
    return html;
}

function esLineaDeAcordes(linea) {
    // Detecta si una línea contiene principalmente acordes
    const lineaTrim = linea.trim();
    
    // Si está vacía, no es línea de acordes
    if (lineaTrim === '') return false;
    
    // Si es una sección (entre paréntesis), no es línea de acordes
    if (lineaTrim.startsWith('(') && lineaTrim.endsWith(')')) return false;
    
    // Si es tablatura (contiene | o números con -)
    if (lineaTrim.includes('|-') || /^[EB][\|]/.test(lineaTrim)) return false;
    
    // Si tiene muchas letras seguidas, probablemente es letra
    if (/[a-záéíóúñ]{6,}/i.test(lineaTrim)) return false;
    
    // Patrones de acordes comunes: D, Am, C#m, F#5, etc.
    const patronAcorde = /\b[A-G](#|b)?(m|maj|dim|aug|sus|add)?[0-9]?\b/g;
    const acordesEncontrados = lineaTrim.match(patronAcorde);
    
    // Si tiene acordes y son más del 40% de la línea, es línea de acordes
    if (acordesEncontrados && acordesEncontrados.length > 0) {
        const textoAcordes = acordesEncontrados.join('').length;
        const textoTotal = lineaTrim.replace(/[\s\-\/]/g, '').length;
        return textoAcordes / textoTotal > 0.4;
    }
    
    return false;
}

function resaltarAcordes(linea) {
    // Resalta los acordes en una línea evitando duplicación de #
    let resultado = '';
    let i = 0;
    
    while (i < linea.length) {
        const resto = linea.substring(i);
        // Buscar acordes: nota + opcional(# o b) + opcional(sufijo)
        const match = resto.match(/^([A-G])(#|b)?(m|maj|dim|aug|sus|add)?([0-9]?)/);
        
        // Verificar que sea inicio de palabra (acorde)
        if (match && (i === 0 || /\s/.test(linea[i-1]))) {
            const acorde = match[0];
            resultado += `<span class="acorde">${escapeHtml(acorde)}</span>`;
            i += acorde.length;
        } else {
            resultado += escapeHtml(linea[i]);
            i++;
        }
    }
    
    return resultado;
}

function procesarLineaConAcordes(linea) {
    // Extraer acordes y sus posiciones (sistema con corchetes)
    const acordes = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = regex.exec(linea)) !== null) {
        acordes.push({
            acorde: match[1],
            posicion: match.index
        });
    }
    
    if (acordes.length === 0) {
        return `<div class="linea-letra">${escapeHtml(linea)}</div>`;
    }
    
    // Remover los corchetes de la letra
    let textoLimpio = linea.replace(/\[([^\]]+)\]/g, '');
    
    // Construir la línea de acordes con espaciado correcto
    let html = '<div class="linea-con-acordes">';
    html += '<div class="linea-acordes">';
    
    let posicionActual = 0;
    acordes.forEach((item, index) => {
        // Calcular cuántos caracteres de texto hay antes de este acorde
        const textoAntes = linea.substring(0, item.posicion).replace(/\[([^\]]+)\]/g, '');
        const espaciosNecesarios = textoAntes.length - posicionActual;
        
        // Agregar espacios
        if (espaciosNecesarios > 0) {
            html += '&nbsp;'.repeat(espaciosNecesarios);
        }
        
        // Agregar el acorde
        html += `<span class="acorde">${escapeHtml(item.acorde)}</span>`;
        posicionActual = textoAntes.length + item.acorde.length;
    });
    
    html += '</div>';
    
    // Solo agregar la línea de texto si no está vacía
    if (textoLimpio.trim()) {
        html += `<div class="linea-texto">${escapeHtml(textoLimpio)}</div>`;
    } else {
        html += '<div class="linea-texto">&nbsp;</div>';
    }
    
    html += '</div>';
    
    return html;
}

// === CRUD DE CANCIONES ===
async function agregarCancion(datos) {
    try {
        const tematicas = datos.tematicas || [];
        const nuevaCancion = {
            titulo: datos.titulo,
            artista: datos.artista,
            tono: datos.tono,
            bpm: datos.bpm ? parseInt(datos.bpm) : null,
            acordes: datos.acordes,
            letra: datos.letra,
            // Guardar tematicas como array para facilitar queries
            tematicas: tematicas,
            // Guardar versión en lowercase para búsqueda case-insensitive
            tematicasLower: tematicas.map(t => t.toLowerCase())
        };
        
        await agregarCancionFirestore(nuevaCancion);
        showToast('Canción agregada exitosamente', 'success');
        console.log('Canción agregada exitosamente');
    } catch (error) {
        console.error('Error al agregar canción:', error);
        showToast('Error al guardar la canción', 'error');
    }
}

async function actualizarCancion(id, datos) {
    try {
        const tematicas = datos.tematicas || [];
        const datosActualizados = {
            titulo: datos.titulo,
            artista: datos.artista,
            tono: datos.tono,
            bpm: datos.bpm ? parseInt(datos.bpm) : null,
            acordes: datos.acordes,
            letra: datos.letra,
            tematicas: tematicas,
            tematicasLower: tematicas.map(t => t.toLowerCase())
        };
        
        await actualizarCancionFirestore(id, datosActualizados);
        showToast('Canción actualizada exitosamente', 'success');
        console.log('Canción actualizada exitosamente');
    } catch (error) {
        console.error('Error al actualizar canción:', error);
        showToast('Error al actualizar la canción', 'error');
    }
}

async function eliminarCancion(id) {
    try {
        await eliminarCancionFirestore(id);
        showToast('Canción eliminada', 'success');
        console.log('Canción eliminada exitosamente');
    } catch (error) {
        console.error('Error al eliminar canción:', error);
        showToast('Error al eliminar la canción', 'error');
    }
}

function editarCancion(cancion) {
    cancionEditando = cancion;
    elementos.modalTitulo.textContent = 'Editar Canción';
    elementos.inputTitulo.value = cancion.titulo || '';
    elementos.inputArtista.value = cancion.artista || '';
    elementos.inputTono.value = cancion.tono || '';
    elementos.inputBpm.value = cancion.bpm || '';
    elementos.inputAcordes.value = cancion.acordes || '';
    elementos.inputLetra.value = cancion.letra || '';
    // Recuperar tematicas desde array si existe
    elementos.inputTematica.value = (cancion.tematicas || []).join(', ');
    abrirModal(elementos.modalCancion);
}

// === FUNCIONES DE MODAL ===
function abrirModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (modal === elementos.modalCancion) {
        elementos.formCancion.reset();
        cancionEditando = null;
        elementos.modalTitulo.textContent = 'Agregar Canción';
    }
}

// === EVENT LISTENERS ===
elementos.btnAgregarCancion.addEventListener('click', () => {
    abrirModal(elementos.modalCancion);
});

elementos.btnCerrarModal.addEventListener('click', () => {
    cerrarModal(elementos.modalCancion);
});

elementos.btnCancelar.addEventListener('click', () => {
    cerrarModal(elementos.modalCancion);
});

elementos.btnCerrarModalVer.addEventListener('click', () => {
    cerrarModal(elementos.modalVerCancion);
});

// Cerrar modal al hacer click fuera
elementos.modalCancion.addEventListener('click', (e) => {
    if (e.target === elementos.modalCancion) {
        cerrarModal(elementos.modalCancion);
    }
});

elementos.modalVerCancion.addEventListener('click', (e) => {
    if (e.target === elementos.modalVerCancion) {
        cerrarModal(elementos.modalVerCancion);
    }
});

// Manejo del formulario
elementos.formCancion.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const datos = {
        titulo: elementos.inputTitulo.value.trim(),
        artista: elementos.inputArtista.value.trim(),
        tono: elementos.inputTono.value.trim(),
        bpm: elementos.inputBpm.value.trim(),
        acordes: elementos.inputAcordes.value.trim(),
        letra: elementos.inputLetra.value.trim(),
        tematicas: elementos.inputTematica.value.split(',').map(s => s.trim()).filter(Boolean)
    };
    
    if (cancionEditando) {
        actualizarCancion(cancionEditando.id, datos);
    } else {
        agregarCancion(datos);
    }
    
    cerrarModal(elementos.modalCancion);
});

// Cambio de tipo de búsqueda (actualiza placeholder)
elementos.searchType.addEventListener('change', (e) => {
    const placeholders = {
        'titulo': 'Buscar por título o artista...',
        'tono': 'Buscar por tonalidad (Ej: Am, G, C)',
        'tematica': 'Buscar por temática (Ej: adoración)'
    };
    elementos.inputBuscar.placeholder = placeholders[e.target.value];
    elementos.inputBuscar.value = '';
    renderizarCanciones();
});

// Buscador en tiempo real unificado
elementos.inputBuscar.addEventListener('input', (e) => {
    const searchValue = e.target.value.trim();
    const searchType = elementos.searchType.value;
    
    // Si estamos en vista favoritos, usar búsqueda simple dentro de favoritos
    if (vistaFavoritosActiva) {
        renderizarCanciones(searchValue);
        return;
    }
    
    // Vista normal - si no hay búsqueda, mostrar todas
    if (!searchValue) {
        renderizarCanciones('');
        return;
    }
    
    // Aplicar búsqueda según tipo
    let filtradas = canciones;
    
    switch(searchType) {
        case 'titulo':
            filtradas = canciones.filter(c => 
                c.titulo.toLowerCase().includes(searchValue.toLowerCase()) ||
                c.artista.toLowerCase().includes(searchValue.toLowerCase())
            );
            break;
        case 'tono':
            filtradas = canciones.filter(c => 
                c.tono && c.tono.toLowerCase().includes(searchValue.toLowerCase())
            );
            break;
        case 'tematica':
            filtradas = canciones.filter(c => {
                // Buscar en el array de tematicas
                if (c.tematicas && Array.isArray(c.tematicas)) {
                    return c.tematicas.some(t => 
                        t.toLowerCase().includes(searchValue.toLowerCase())
                    );
                }
                // Fallback para formato antiguo (string)
                if (c.tematica && typeof c.tematica === 'string') {
                    return c.tematica.toLowerCase().includes(searchValue.toLowerCase());
                }
                return false;
            });
            break;
    }
    
    // Renderizar con las canciones filtradas manualmente
    elementos.listaCanciones.innerHTML = '';
    
    if (filtradas.length === 0) {
        elementos.mensajeVacio.style.display = 'block';
        elementos.listaCanciones.style.display = 'none';
    } else {
        elementos.mensajeVacio.style.display = 'none';
        elementos.listaCanciones.style.display = 'grid';
        
        filtradas.forEach(cancion => {
            const card = crearCardCancion(cancion);
            elementos.listaCanciones.appendChild(card);
        });
    }
});

// Botones de transposición
elementos.btnTransposeUp.addEventListener('click', () => {
    transposicion++;
    actualizarVistaCancion();
});

elementos.btnTransposeDown.addEventListener('click', () => {
    transposicion--;
    actualizarVistaCancion();
});

elementos.btnTransposeReset.addEventListener('click', () => {
    transposicion = 0;
    actualizarVistaCancion();
});

// === FUNCIONES DE TRANSPOSICIÓN ===
const notasCromaticas = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notasAlternativas = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Do': 'C', 'Re': 'D', 'Mi': 'E', 'Fa': 'F', 'Sol': 'G', 'La': 'A', 'Si': 'B'
};

function transponerAcorde(acorde, semitonos) {
    if (!acorde || semitonos === 0) return acorde;
    
    // Extraer la nota base y el resto del acorde (m, 7, sus4, etc.)
    // Patrón mejorado: captura nota + un solo # o b (no múltiples)
    const match = acorde.match(/^([A-G])(#|b)?(.*)/);
    if (!match) return acorde;
    
    let [, nota, alteracion, sufijo] = match;
    let notaBase = nota + (alteracion || '');
    
    // Convertir notaciones alternativas
    if (notasAlternativas[notaBase]) {
        notaBase = notasAlternativas[notaBase];
    }
    
    // Encontrar índice de la nota
    let indice = notasCromaticas.indexOf(notaBase);
    if (indice === -1) return acorde;
    
    // Transponer
    indice = (indice + semitonos) % 12;
    if (indice < 0) indice += 12;
    
    return notasCromaticas[indice] + sufijo;
}

function transponerLetra(letra, semitonos) {
    if (semitonos === 0) return letra;
    
    // Transponer acordes en formato [Acorde]
    let letraTranspuesta = letra.replace(/\[([^\]]+)\]/g, (match, acorde) => {
        return `[${transponerAcorde(acorde, semitonos)}]`;
    });
    
    // Transponer acordes sueltos en líneas (detectados por la función esLineaDeAcordes)
    const lineas = letraTranspuesta.split('\n');
    letraTranspuesta = lineas.map(linea => {
        // Solo transponer si no tiene corchetes (ya fueron procesados arriba)
        if (esLineaDeAcordes(linea) && !linea.includes('[')) {
            // Transponer cada acorde en la línea
            // Verificar que no se dupliquen los #
            let resultado = '';
            let i = 0;
            
            while (i < linea.length) {
                // Buscar acordes desde la posición actual
                const resto = linea.substring(i);
                const match = resto.match(/^([A-G])(#|b)?(m|maj|dim|aug|sus|add)?([0-9]?)/);
                
                if (match && /\b/.test(resto[0])) {
                    const acordeOriginal = match[0];
                    const acordeTranspuesto = transponerAcorde(acordeOriginal, semitonos);
                    resultado += acordeTranspuesto;
                    i += acordeOriginal.length;
                } else {
                    resultado += linea[i];
                    i++;
                }
            }
            
            return resultado;
        }
        return linea;
    }).join('\n');
    
    return letraTranspuesta;
}

// === UTILIDADES ===
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY
 */
function formatearFecha(fechaISO) {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return fechaISO;
    const [year, month, day] = partes;
    return `${parseInt(day)}/${parseInt(month)}/${year}`;
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que Firebase esté listo
    const esperarFirebase = setInterval(() => {
        if (window.firebaseDb) {
            clearInterval(esperarFirebase);
            inicializarApp();
        }
    }, 100);
});

async function inicializarApp() {
    console.log('Firebase conectado. Iniciando app...');
    
    // Aplicar modo oscuro si está activado
    aplicarModoOscuro();
    
    // Opcional: Migrar canciones del localStorage a Firestore (solo la primera vez)
    // Descomenta estas líneas si quieres migrar canciones existentes:
    // if (localStorage.getItem('canciones')) {
    //     await migrarLocalStorageAFirestore();
    // }
    
    // Cargar canciones desde Firebase
    await cargarCanciones();

    // Toggle panel lateral (mobile)
    elementos.btnTogglePanel.addEventListener('click', () => {
        elementos.panelSide.classList.toggle('active');
        elementos.panelOverlay.classList.toggle('active');
    });
    
    elementos.btnCerrarPanel.addEventListener('click', () => {
        elementos.panelSide.classList.remove('active');
        elementos.panelOverlay.classList.remove('active');
    });
    
    // Cerrar panel al hacer click en el overlay
    elementos.panelOverlay.addEventListener('click', () => {
        elementos.panelSide.classList.remove('active');
        elementos.panelOverlay.classList.remove('active');
    });

    elementos.btnCrearEvento.addEventListener('click', crearEventoCompleto);
    elementos.btnCrearPlaylist.addEventListener('click', crearPlaylistCompleto);

    // Gestión de eventos
    elementos.btnCerrarModalEvento.addEventListener('click', () => cerrarModal(elementos.modalEvento));
    elementos.btnCancelarEvento.addEventListener('click', () => cerrarModal(elementos.modalEvento));
    elementos.btnGuardarEvento.addEventListener('click', guardarEvento);
    elementos.btnAgregarMusico.addEventListener('click', () => agregarFilaMusicoEvento());
    elementos.btnAgregarCancionEvento.addEventListener('click', () => abrirModalSeleccionCanciones('evento'));
    
    // Gestión de playlists
    elementos.btnCerrarModalPlaylist.addEventListener('click', () => cerrarModal(elementos.modalPlaylist));
    elementos.btnCancelarPlaylist.addEventListener('click', () => cerrarModal(elementos.modalPlaylist));
    elementos.btnGuardarPlaylist.addEventListener('click', guardarPlaylist);
    elementos.btnAgregarMusicoPlaylist.addEventListener('click', () => agregarFilaMusicoPlaylist());
    elementos.btnAgregarCancionPlaylist.addEventListener('click', () => abrirModalSeleccionCanciones('playlist'));
    
    // Modal selección canciones
    elementos.btnCerrarModalSeleccion.addEventListener('click', () => cerrarModal(elementos.modalSeleccionCanciones));
    elementos.buscarCancionModal.addEventListener('input', (e) => renderizarListaSeleccionCanciones(e.target.value));
    elementos.modalSeleccionCanciones.addEventListener('click', (e) => {
        if (e.target === elementos.modalSeleccionCanciones) cerrarModal(elementos.modalSeleccionCanciones);
    });

    // Cargar listas iniciales
    await cargarYMostrarEventos();
    await cargarYMostrarPlaylists();

    // Manejo simple de tabs en la vista de canción
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            if (tab === 'acordes') document.getElementById('verAcordes').classList.add('active');
            if (tab === 'letra') document.getElementById('verLetra').classList.add('active');
        });
    });
    
    // === EVENT LISTENERS DE NUEVAS FUNCIONALIDADES ===
    
    // Sistema de Favoritos
    elementos.btnFavorito.addEventListener('click', () => {
        if (cancionActual) {
            toggleFavorito(cancionActual.id);
            actualizarBotonFavorito(cancionActual.id);
            renderizarCanciones(); // Actualizar cards con estrella
        }
    });
    
    // Botón Ver Favoritos en Header
    elementos.btnVerFavoritos.addEventListener('click', toggleVistaFavoritos);
    
    // Actualizar badge de favoritos al inicio
    actualizarBadgeFavoritos();
    
    // Modo Oscuro
    elementos.btnModoOscuro.addEventListener('click', toggleModoOscuro);
    
    // Sistema de Compartir
    elementos.btnCompartir.addEventListener('click', () => {
        if (cancionActual) {
            abrirModalCompartir();
        }
    });
    
    elementos.btnCompartirWhatsApp.addEventListener('click', compartirWhatsApp);
    elementos.btnCompartirTelegram.addEventListener('click', compartirTelegram);
    elementos.btnCopiarEnlace.addEventListener('click', copiarEnlace);
    
    elementos.btnCerrarModalCompartir.addEventListener('click', () => {
        cerrarModal(elementos.modalCompartir);
    });
    
    elementos.modalCompartir.addEventListener('click', (e) => {
        if (e.target === elementos.modalCompartir) {
            cerrarModal(elementos.modalCompartir);
        }
    });
    
    // Sistema de Exportar/Importar
    elementos.btnExportar.addEventListener('click', () => {
        abrirModal(elementos.modalExportar);
    });
    
    elementos.btnExportarJSON.addEventListener('click', exportarJSON);
    
    elementos.btnExportarPDF.addEventListener('click', () => {
        exportarPDF();
        mostrarToast('Exportación a PDF próximamente disponible', 'info');
    });
    
    elementos.btnImportar.addEventListener('click', () => {
        elementos.inputImportar.click();
    });
    
    elementos.inputImportar.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            mostrarToast('Por favor, selecciona un archivo JSON', 'error');
            return;
        }
        
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            if (!backup.canciones || !Array.isArray(backup.canciones)) {
                mostrarToast('Formato de backup inválido', 'error');
                return;
            }
            
            let importadas = 0;
            for (const cancion of backup.canciones) {
                try {
                    await agregarCancionFirestore(cancion);
                    importadas++;
                } catch (error) {
                    console.error('Error al importar canción:', error);
                }
            }
            
            mostrarToast(`✅ ${importadas} canciones importadas exitosamente`, 'success');
            cerrarModal(elementos.modalExportar);
            
        } catch (error) {
            console.error('Error al importar:', error);
            mostrarToast('Error al leer el archivo', 'error');
        } finally {
            e.target.value = '';
        }
    });
    
    elementos.btnCerrarModalExportar.addEventListener('click', () => {
        cerrarModal(elementos.modalExportar);
    });
    
    elementos.modalExportar.addEventListener('click', (e) => {
        if (e.target === elementos.modalExportar) {
            cerrarModal(elementos.modalExportar);
        }
    });
}

// Cleanup al cerrar/recargar la página para prevenir memory leaks
window.addEventListener('beforeunload', () => {
    if (unsubscribeListener) {
        unsubscribeListener();
        console.log('Listener de Firebase desconectado');
    }
});
