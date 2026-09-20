const db = new Promise((resolve,reject)=>{
 const request=indexedDB.open('aha-catcher',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('notes',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
export async function put(note){const d=await db;return new Promise((resolve,reject)=>{const tx=d.transaction('notes','readwrite');tx.objectStore('notes').put(note);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export async function all(){const d=await db;return new Promise((resolve,reject)=>{const r=d.transaction('notes').objectStore('notes').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
