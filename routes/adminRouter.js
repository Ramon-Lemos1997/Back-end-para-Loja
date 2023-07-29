const express= require('express');
const router= express.Router();


const admin= require('../controllers/adminController');

router.get('/auth', admin.auth, admin.success);

router.post('/newItem', admin.auth, admin.register);

module.exports= router;