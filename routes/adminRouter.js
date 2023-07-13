const express= require('express')
const router= express.Router()

const auth= require('../controllers/userController')

router.get('/', auth.auth, (req,res)=>{
    if(req.user.admin){
        res.send('Esse dado só deve ser visto pelo admin')
    }else{
        res.status(401).send('Acess Denied')
    }
})

module.exports= router