const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: { type: String, required: true, minlength: 3, maxlength: 50 },
  email: { type: String, required: true, minlength: 3, maxlength: 100 },
  password: { type: String, required: true, minlength: 6, maxlength: 200 },
  admin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  recoveryCode: { type: String, default: null },
  expirationCodeRecovery: { type: Date, default: null },
  tokenExpirationValidate: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  cartItems: [{ type: mongoose.Schema.Types.ObjectId, default: [] }]
});

module.exports = mongoose.model('User', userSchema);
