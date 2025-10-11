import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  emisor: { type: String, required: true },
  receptor: { type: String, required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  leido: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
