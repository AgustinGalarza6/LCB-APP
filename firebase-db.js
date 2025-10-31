// firebase-db.js - Funciones para interactuar con Firestore
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Referencia a la colección de canciones
const cancionesRef = () => collection(window.firebaseDb, 'canciones');

// === FUNCIONES CRUD PARA FIRESTORE ===

/**
 * Obtener todas las canciones de Firestore
 * @returns {Promise<Array>} Array de canciones
 */
export async function obtenerCanciones() {
    try {
        const q = query(cancionesRef(), orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);
        const canciones = [];
        
        querySnapshot.forEach((doc) => {
            canciones.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return canciones;
    } catch (error) {
        console.error('Error al obtener canciones:', error);
        return [];
    }
}

/**
 * Consultar canciones por tono
 */
export async function obtenerCancionesPorTono(tono) {
    try {
        if (!tono) return await obtenerCanciones();
        const q = query(cancionesRef(), where('tono', '==', tono));
        const snapshot = await getDocs(q);
        const results = [];
        snapshot.forEach(d => results.push({ id: d.id, ...d.data() }));
        return results;
    } catch (err) {
        console.error('Error al consultar por tono', err);
        return [];
    }
}

/**
 * Consultar canciones por temática (coincidencia simple de string)
 */
export async function obtenerCancionesPorTematica(tema) {
    try {
        if (!tema) return await obtenerCanciones();
        // Firestore no soporta contains en strings fácilmente; hacemos consulta por campo tematicas (array) si existe
        const q = query(cancionesRef(), where('tematicas', 'array-contains', tema));
        const snapshot = await getDocs(q);
        const results = [];
        snapshot.forEach(d => results.push({ id: d.id, ...d.data() }));
        return results;
    } catch (err) {
        console.error('Error al consultar por tematica', err);
        return [];
    }
}

// --- Eventos y Playlists ---
const eventosRef = () => collection(window.firebaseDb, 'eventos');
const playlistsRef = () => collection(window.firebaseDb, 'playlists');

export async function crearEvento(evento) {
    try {
        const docRef = await addDoc(eventosRef(), { ...evento, fechaCreacion: new Date().toISOString() });
        return docRef.id;
    } catch (err) { console.error('crearEvento', err); throw err; }
}

export async function obtenerEventos() {
    try {
        const q = query(eventosRef(), orderBy('fecha', 'asc'));
        const snap = await getDocs(q);
        const out = [];
        snap.forEach(d => out.push({ id: d.id, ...d.data() }));
        return out;
    } catch (err) { console.error('obtenerEventos', err); return []; }
}

export async function crearPlaylist(playlist) {
    try {
        const docRef = await addDoc(playlistsRef(), { ...playlist, fechaCreacion: new Date().toISOString() });
        return docRef.id;
    } catch (err) { console.error('crearPlaylist', err); throw err; }
}

export async function obtenerPlaylists() {
    try {
        const q = query(playlistsRef(), orderBy('fechaCreacion', 'desc'));
        const snap = await getDocs(q);
        const out = [];
        snap.forEach(d => out.push({ id: d.id, ...d.data() }));
        return out;
    } catch (err) { console.error('obtenerPlaylists', err); return []; }
}

/**
 * Agregar una nueva canción a Firestore
 * @param {Object} cancion - Datos de la canción
 * @returns {Promise<string>} ID del documento creado
 */
export async function agregarCancionFirestore(cancion) {
    try {
        const docRef = await addDoc(cancionesRef(), {
            ...cancion,
            fechaCreacion: new Date().toISOString()
        });
        
        console.log('Canción agregada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar canción:', error);
        throw error;
    }
}

/**
 * Actualizar una canción existente en Firestore
 * @param {string} id - ID del documento
 * @param {Object} datos - Datos actualizados
 * @returns {Promise<void>}
 */
export async function actualizarCancionFirestore(id, datos) {
    try {
        const cancionDoc = doc(window.firebaseDb, 'canciones', id);
        await updateDoc(cancionDoc, datos);
        
        console.log('Canción actualizada:', id);
    } catch (error) {
        console.error('Error al actualizar canción:', error);
        throw error;
    }
}

/**
 * Eliminar una canción de Firestore
 * @param {string} id - ID del documento
 * @returns {Promise<void>}
 */
export async function eliminarCancionFirestore(id) {
    try {
        const cancionDoc = doc(window.firebaseDb, 'canciones', id);
        await deleteDoc(cancionDoc);
        
        console.log('Canción eliminada:', id);
    } catch (error) {
        console.error('Error al eliminar canción:', error);
        throw error;
    }
}

/**
 * Escuchar cambios en tiempo real en la colección de canciones
 * @param {Function} callback - Función que se ejecuta cuando hay cambios
 * @returns {Function} Función para cancelar la suscripción
 */
export function escucharCambiosCanciones(callback) {
    try {
        const q = query(cancionesRef(), orderBy('fechaCreacion', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const canciones = [];
            querySnapshot.forEach((doc) => {
                canciones.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            callback(canciones);
        }, (error) => {
            console.error('Error al escuchar cambios:', error);
        });
        
        return unsubscribe;
    } catch (error) {
        console.error('Error al configurar listener:', error);
        return () => {};
    }
}

/**
 * Migrar canciones del localStorage a Firestore
 * @returns {Promise<void>}
 */
export async function migrarLocalStorageAFirestore() {
    try {
        const cancionesLocal = localStorage.getItem('canciones');
        if (!cancionesLocal) {
            console.log('No hay canciones en localStorage para migrar');
            return;
        }
        
        const canciones = JSON.parse(cancionesLocal);
        console.log(`Migrando ${canciones.length} canciones a Firestore...`);
        
        for (const cancion of canciones) {
            // Eliminar el ID local antes de subir
            const { id, ...datosCancion } = cancion;
            await agregarCancionFirestore(datosCancion);
        }
        
        console.log('Migración completada');
        // Opcional: limpiar localStorage después de migrar
        // localStorage.removeItem('canciones');
    } catch (error) {
        console.error('Error al migrar canciones:', error);
    }
}
