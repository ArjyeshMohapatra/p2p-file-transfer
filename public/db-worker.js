let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open('fileStorageDB', 1);
        request.onupgradeneeded = function (event) {
            let database = event.target.result;
            if (!database.objectStoreNames.contains('fileChunks')) database.createObjectStore('fileChunks', { autoIncrement: true });
        };
        request.onsuccess = function (event) {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = function (event) {
            console.error('Worker Database error', event.target.error);
            reject(event.target.error);
        };
    });
}

function saveChunk(chunk) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await openDatabase();
            const transaction = database.transaction(['fileChunks'], 'readwrite');
            const store = transaction.objectStore('fileChunks');
            const request = store.add(chunk);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    });
}

// listen to messages from main page
self.onmessage = async function (event) {
    const chunk = event.data;
    try {
        await saveChunk(chunk);
        // sends message back to main page confirming the save was successful
        self.postMessage({ success: true, fileName: chunk.fileName, index: chunk.index });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};