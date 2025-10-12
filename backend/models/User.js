import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({ 
  usuario: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 3, 
    maxlength: 20 
  }, 
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  }, 
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  }, 
  foto: { 
    type: String, 
    default: '/img/perfil_default.png' 
  }, 
  biografia: { 
    type: String, 
    default: '', 
    maxlength: 150 
  }, 
  avatarFileId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  } 
}, { 
  timestamps: true 
}); 

// Middleware para hashear la contraseña antes de guardar 
userSchema.pre('save', async function(next) { 
  if (!this.isModified('password')) return next(); 

  try { 
    const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt); 
     next(); 
    } catch (error) { 
      next(error); 
    } 
}); 

// Método para comparar contraseñas 
userSchema.methods.comparePassword = async function(candidatePassword) { 
  return await bcrypt.compare(candidatePassword, this.password); 
}; 

export default mongoose.model('User', userSchema);
