import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  usuarioFoto: { type: String, default: 'img/perfil_default.png' }
});

const Post = mongoose.model('Post', postSchema);

export default Post;