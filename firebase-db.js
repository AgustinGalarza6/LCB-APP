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
    onSnapshot
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
