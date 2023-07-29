const express= require('express');
const router= express.Router();
const userController= require('../controllers/userController');

router.post('/register',userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/recovery',userController.recovery);
router.post('/code',userController.validateCode);

router.get('/getItem',userController.display);

router.put('/resetPass',userController.resetPassword);


module.exports= router;