const mongoose = require('mongoose');
// futura implementação onde o admin pode adicionar itens da loja no banco de dados, esse banco de dados será visto para o usuários logados e poderam efetuar a comprar do item
const itemSchema = mongoose.Schema({
    //name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stockQuantity: { type: Number, required: true, default:0},
    category: { type: String,  required: true },
    //availability: { type: Boolean, default: true }
    //imageURL: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports= mongoose.model('Item', itemSchema);
  