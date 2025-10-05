document.addEventListener("DOMContentLoaded", () => {
  const usuarioActivo = localStorage.getItem("usuarioActivo");
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  
  // Seleccionar SOLO los avatars que deben ser editables
  const sidebarAvatar = document.querySelector(".user-avatar img"); // Avatar barra lateral
  const createPostAvatar = document.querySelector(".create-post .avatar"); // Avatar para crear post
  const currentUserAvatars = [sidebarAvatar, createPostAvatar]; // Solo estos son editables
  
  // Avatar que NO debe ser editable (usuario @mateolink)
  const otherUserAvatar = document.querySelector(".post .avatar");

  // Si no hay usuario logueado, volver al login
  if (!usuarioActivo) {
    window.location.href = "sesion.html";
    return;
  }

  // Buscar datos del usuario activo
  const userData = usuarios.find(u => u.usuario === usuarioActivo);
  if (!userData) {
    window.location.href = "sesion.html";
    return;
  }

  // Mostrar su foto actual SOLO en los avatars editables
  currentUserAvatars.forEach(img => {
    if (img) img.src = userData.foto || "img/perfil_default.png";
  });
  
  // El avatar de @mateolink mantiene su imagen fija
  if (otherUserAvatar) {
    otherUserAvatar.src = "img/perfil_ejemplo.png"; // Imagen fija
    otherUserAvatar.style.cursor = "default"; // Cursor normal, no pointer
  }

  // --- Permitir cambiar la foto SOLO desde avatars editables ---
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.accept = "image/*";
  uploadInput.style.display = "none";
  document.body.appendChild(uploadInput);

  // Solo los avatars editables pueden abrir el selector de archivos
  currentUserAvatars.forEach(img => {
    if (img) {
      img.style.cursor = "pointer";
      img.title = "Click para cambiar foto de perfil"; // Tooltip útil
      img.addEventListener("click", () => uploadInput.click());
    }
  });

  // Cuando el usuario elige una imagen
  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert("❌ Por favor, selecciona un archivo de imagen válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newPhoto = reader.result;

      // Actualizar foto SOLO en avatars editables
      currentUserAvatars.forEach(img => {
        if (img) img.src = newPhoto;
      });

      // Guardar en localStorage
      const usuariosActualizados = usuarios.map(u =>
        u.usuario === usuarioActivo ? { ...u, foto: newPhoto } : u
      );
      localStorage.setItem("usuarios", JSON.stringify(usuariosActualizados));

      alert("✅ Foto de perfil actualizada correctamente.");
    };
    reader.readAsDataURL(file);
  });
});