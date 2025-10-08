import { spawn } from 'child_process';

console.log('🚀 Iniciando Ngrok...');

const ngrok = spawn('ngrok', ['http', '3001'], {
  stdio: 'inherit'
});

ngrok.on('error', (error) => {
  console.error('❌ Error iniciando ngrok:', error);
  console.log('💡 Instala ngrok con: npm install -g ngrok');
});

// Para detener ngrok: Ctrl+C
