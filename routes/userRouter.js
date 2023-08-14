const express= require('express');
const router= express.Router();
const userController= require('../controllers/userController');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/recovery', userController.recovery);
router.post('/code', userController.validateCode);
router.post('/api', userController.valid);
router.post('/saveCart', userController.saveItemFromCart);


router.get('/getItem', userController.display);
router.get('/getCart', userController.getCart);
router.get('/getCartItems', userController.getCartItemByIds);


router.put('/resetCart', userController.resetCart);
router.put('/resetPass', userController.resetPassword);

router.delete('/deleteCart', userController.deleteItemFromCart);


module.exports= router;