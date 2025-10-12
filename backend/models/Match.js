import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  usuario1: {
    type: String,
    required: true,
    trim: true
  },
  usuario2: {
    type: String,
    required: true,
    trim: true
  },
  fechaMatch: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  // Podemos agregar más campos si es necesario
  usuario1Acepto: {
    type: Boolean,
    default: false
  },
  usuario2Acepto: {
    type: Boolean,
    default: false
  }
});

// Índice compuesto para evitar matches duplicados
matchSchema.index({ usuario1: 1, usuario2: 1 }, { unique: true });

// Método estático para verificar si existe un match
matchSchema.statics.existeMatch = function(usuario1, usuario2) {
  return this.findOne({
    $or: [
      { usuario1: usuario1, usuario2: usuario2 },
      { usuario1: usuario2, usuario2: usuario1 }
    ],
    activo: true
  });
};

// Método estático para crear un nuevo match
matchSchema.statics.crearMatch = function(usuario1, usuario2) {
  return this.create({
    usuario1: usuario1,
    usuario2: usuario2,
    usuario1Acepto: true,
    usuario2Acepto: false // El otro usuario aún no ha dado like
  });
};

// Método para verificar si es un match recíproco
matchSchema.methods.esMatchReciproco = function() {
  return this.usuario1Acepto && this.usuario2Acepto;
};

// Método estático para obtener likes unidireccionales
matchSchema.statics.obtenerLikesUnidireccionales = function(usuario) {
  return this.find({
    $or: [
      { 
        usuario2: usuario, 
        usuario1Acepto: false,
        usuario2Acepto: true
      },
      { 
        usuario1: usuario, 
        usuario1Acepto: true,
        usuario2Acepto: false
      }
    ],
    activo: true
  });
};

const Match = mongoose.model('Match', matchSchema);

export default Match;
