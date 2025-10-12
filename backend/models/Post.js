import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  usuario: {
    type: String,
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  usuarioFoto: {
    type: String,
    default: 'img/perfil_default.png'
  },
  // NUEVOS CAMPOS PARA LIKES Y DISLIKES
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  usuariosQueDieronLike: [{
    type: String // nombres de usuario que dieron like
  }],
  usuariosQueDieronDislike: [{
    type: String // nombres de usuario que dieron dislike
  }]
});

export default mongoose.model('Post', postSchema);
