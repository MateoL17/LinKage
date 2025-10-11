import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando Linkage con Ngrok...');
console.log('📁 Directorio:', __dirname);

// Función para esperar un tiempo
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startNgrok() {
    return new Promise((resolve, reject) => {
        console.log('🔌 Iniciando ngrok...');
        
        const ngrok = spawn('npx', ['ngrok', 'http', '3001'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let ngrokUrl = null;
        let outputData = '';

        // Capturar salida de ngrok
        ngrok.stdout.on('data', (data) => {
            const output = data.toString();
            outputData += output;
            console.log('📡 Ngrok:', output.trim());

            // Buscar la URL en la salida
            const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app/);
            if (urlMatch && !ngrokUrl) {
                ngrokUrl = urlMatch[0];
                console.log('='.repeat(60));
                console.log('✅ NGROK CONECTADO EXITOSAMENTE!');
                console.log('='.repeat(60));
                console.log(`🌐 URL Pública: ${ngrokUrl}`);
                console.log(`📍 URL Local: http://localhost:3001`);
                console.log('='.repeat(60));
                console.log('💡 Usa esta URL para acceder desde cualquier dispositivo');
                console.log('='.repeat(60));
                
                resolve(ngrokUrl);
            }
        });

        ngrok.stderr.on('data', (data) => {
            console.error('❌ Error ngrok:', data.toString());
        });

        ngrok.on('close', (code) => {
            if (code !== 0) {
                console.log(`❌ Ngrok terminó con código: ${code}`);
                reject(new Error(`Ngrok exit with code ${code}`));
            }
        });

        // Timeout después de 30 segundos
        setTimeout(() => {
            if (!ngrokUrl) {
                console.log('⏰ Timeout: Ngrok no pudo iniciarse en 30 segundos');
                console.log('📋 Salida completa:', outputData);
                ngrok.kill();
                reject(new Error('Ngrok timeout'));
            }
        }, 30000);
    });
}

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando aplicación...');
    process.exit(0);
});

// Ejecutar
startNgrok().catch(console.error);
