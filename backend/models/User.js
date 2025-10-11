import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  foto: { type: String, default: '/img/perfil_default.png' },
  avatarFileId: { type: mongoose.Schema.Types.ObjectId },
  biografia: { type: String, default: 'Biografía del usuario...' }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
