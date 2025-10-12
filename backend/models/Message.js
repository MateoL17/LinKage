import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  emisor: {
    type: String,
    required: true
  },
  receptor: {
    type: String,
    required: true
  },
  contenido: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'El mensaje no puede estar vacío'
    }
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  leido: {
    type: Boolean,
    default: false
  }
});

messageSchema.index({ emisor: 1, receptor: 1 });
messageSchema.index({ fecha: -1 });

export default mongoose.model('Message', messageSchema);
