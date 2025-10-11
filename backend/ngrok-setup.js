import ngrok from 'ngrok';
import dotenv from 'dotenv';

dotenv.config();

async function setupNgrok() {
  try {
    console.log('🚀 Iniciando Ngrok...');
    
    // Configuración de ngrok
    const url = await ngrok.connect({
      addr: 3001,
      authtoken: process.env.NGROK_AUTHTOKEN || '', // Opcional: tu token de ngrok
      region: 'us', // o 'eu', 'ap', 'au', 'sa'
      onStatusChange: (status) => {
        console.log(`🔄 Estado de Ngrok: ${status}`);
      },
      onLogEvent: (data) => {
        console.log(`📝 Log Ngrok: ${data}`);
      }
    });
    
    console.log('='.repeat(50));
    console.log('✅ NGROK CONECTADO EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log(`🌐 URL Pública: ${url}`);
    console.log(`📍 URL Local: http://localhost:3001`);
    console.log('='.repeat(50));
    console.log('💡 Usa la URL pública para acceder desde cualquier dispositivo');
    console.log('='.repeat(50));
    
    return url;
  } catch (error) {
    console.error('❌ Error iniciando ngrok:', error.message);
    console.log('💡 Solución:');
    console.log('1. Ejecuta: npm install ngrok');
    console.log('2. O instala ngrok globalmente: npm install -g ngrok');
    
    // Intentar método alternativo
    await tryAlternativeMethod();
  }
}

async function tryAlternativeMethod() {
  try {
    console.log('🔄 Intentando método alternativo...');
    
    // Método alternativo sin authtoken
    const url = await ngrok.connect(3001);
    console.log(`✅ Ngrok conectado (método alternativo): ${url}`);
    return url;
  } catch (error) {
    console.error('❌ También falló el método alternativo:', error.message);
    console.log('📋 Posibles soluciones:');
    console.log('1. Instala ngrok: npm install ngrok');
    console.log('2. Descarga ngrok manualmente de https://ngrok.com/download');
    console.log('3. Agrega la ruta de ngrok al PATH de tu sistema');
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Deteniendo ngrok...');
  try {
    await ngrok.disconnect();
    await ngrok.kill();
    console.log('✅ Ngrok detenido correctamente');
  } catch (error) {
    console.log('⚠️ Ngrok ya estaba detenido');
  }
  process.exit(0);
});

export default setupNgrok;

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  setupNgrok();
}
