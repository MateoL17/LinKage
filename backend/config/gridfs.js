import mongoose from 'mongoose';

let gfs = null;
let gridFSInitialized = false;

export const initializeGridFS = () => {
  return new Promise((resolve, reject) => {
    if (gridFSInitialized && gfs) {
      console.log('✅ GridFS ya está inicializado');
      return resolve(gfs);
    }

    const conn = mongoose.connection;
    
    // Si ya está conectado
    if (conn.readyState === 1) {
      try {
        gfs = new mongoose.mongo.GridFSBucket(conn.db, {
          bucketName: 'avatars'
        });
        
        gridFSInitialized = true;
        console.log('✅ GridFS inicializado (conexión existente)');
        return resolve(gfs);
      } catch (error) {
        console.error('❌ Error inicializando GridFS:', error);
        return reject(error);
      }
    }

    // Esperar conexión si no está lista
    conn.once('open', () => {
      try {
        gfs = new mongoose.mongo.GridFSBucket(conn.db, {
          bucketName: 'avatars'
        });
        
        gridFSInitialized = true;
        console.log('✅ GridFS inicializado correctamente');
        resolve(gfs);
      } catch (error) {
        console.error('❌ Error inicializando GridFS:', error);
        reject(error);
      }
    });
  });
};

export { gfs };
