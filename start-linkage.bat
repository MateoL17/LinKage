@echo off
echo 🚀 Iniciando Linkage...
echo.

cd backend
echo 📦 Iniciando servidor...
start cmd /k "npm run dev"

timeout /t 5 /nobreak > nul

echo 🔌 Iniciando ngrok...
start cmd /k "npx ngrok http 3001"

echo.
echo ✅ Proceso iniciado!
echo 💡 Espera 10-15 segundos y revisa la ventana de ngrok para obtener la URL
echo 🎯 Luego usa esa URL en tu navegador
pause