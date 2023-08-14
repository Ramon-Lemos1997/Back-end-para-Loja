const express= require('express');
const router= express.Router();

//nas rotas uso o middleware admin.auth para verificar se estar autenticado;
const admin= require('../controllers/adminController');

router.get('/auth', admin.auth, admin.success);

router.post('/newItem', admin.auth, admin.register);

router.put('/editItem', admin.auth, admin.editItem);

router.delete('/deleteItem', admin.auth, admin.deleteItem);

module.exports= router;