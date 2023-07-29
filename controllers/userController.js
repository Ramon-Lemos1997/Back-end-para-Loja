const User= require('../models/User');
const bcrypt= require('bcryptjs'); //module criptografia
const jwt= require('jsonwebtoken');  //module para criação de token único servidor
const crypto=require('crypto');
const nodemailer=require('nodemailer');
const {loginValidate, registerValidate, newPasswordValidate}= require('./validate');
require('dotenv').config();
const config = require('../setups/setup');
const Item= require('../models/Item');



const maxAttempts = config.maxAttempts;
const timeBlock = config.timeBlock;

const userController={    
  register:async function(req,res){
    const {email}= req?.body;
    const selectUser= await User.findOne({email: email});
    if(selectUser) return res.status(400).send('Este e-mail já está sendo usado por outro usuário.');

    const { error }= registerValidate(req.body);  
    if (error) {
      const errorMessage=error.message;
    
      switch (true) {
        case errorMessage.includes('"name" is not allowed to be empty'):
          return res.status(400).send('O nome é obrigatório.');
    
        case errorMessage.includes('"name" length must be at least 3 characters long'):
          return res.status(400).send('O nome deve ter no mínimo três caracteres.');
    
        case errorMessage.includes('"email" is not allowed to be empty'):
          return res.status(400).send('O email é obrigatório.');
    
        case errorMessage.includes('"password" length must be at least 6 characters long'):
          return res.status(400).send('A senha deve conter no mínimo 6 caracteres.');
    
        case errorMessage.includes('"password" is not allowed to be empty'):
          return res.status(400).send('A senha é obrigatória.');
    
        default:
          return res.status(400).send(error.message);
      }
    }
    
    const user= new User({
        name: req.body?.name,
        email: req.body?.email,
        password: bcrypt.hashSync(req.body?.password)
    });
    try{
        await user.save();
        res.status(200).send("Registrado");
    }catch(error){
        res.status(400).send(error);
    }
  },  
      
  login: async function(req, res) {
    const { error }= loginValidate(req?.body);
    if (error) {
      return res.status(400).send(error.message);
    }
    const {email}= req?.body;
    const selectUser= await User.findOne({ email: email });
    if (!selectUser) {
      return res.status(400).send('Email ou senha incorretos');
    }
     
    if (selectUser.lockUntil > Date.now()) {
      return res.status(400).send('Você excedeu o limite de tentativas de login. Tente novamente mais tarde.');
    }
   
    const passwordAndUserMatch=bcrypt.compareSync(
      req?.body?.password,
      selectUser?.password
    );
  
    if (!passwordAndUserMatch) {
      selectUser.loginAttempts += 1;
      await selectUser.save();
  
      if (selectUser.loginAttempts >= maxAttempts) {
        selectUser.lockUntil=Date.now() + timeBlock;
        selectUser.loginAttempts= 0;
        await selectUser.save();
        return res.status(400).send('Você excedeu o limite de tentativas de login. Tente novamente mais tarde.');
      }
  
      return res.status(400).send('Email ou senha incorretos');
    }
  
    selectUser.loginAttempts= 0;
    selectUser.lockUntil= null;
    await selectUser.save();
  
    const token= jwt.sign({ _id: selectUser._id }, process.env.TOKEN_SECRET, { expiresIn: '1d' });
    res.status(200).send(token);
  },
  
  logout: async function(req, res) { 
    res.status(200).send('Logout successful');
  },
 
  recovery: async function (req, res) {
    const {email}= req?.body;

    if (!email) {
      return res.status(400).send('O email é obrigatório.');
    }

    try {
      const selectUser= await User.findOne({email: email });

      if (!selectUser) {
        return res.status(404).send('Usuário não encontrado.');
      }

      const recoveryCode= crypto.randomBytes(4).toString('hex');

      const expirationCodeRecovery=new Date();
      expirationCodeRecovery .setMinutes(expirationCodeRecovery .getMinutes() + 2); 

     

      const transporter= await nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure: true,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.SENHA_EMAIL,
        }
      });

      const mailOptions= {
        from: process.env.EMAIL,
        to: email,
        subject: 'Recuperação de Senha',
        text: `Seu código de recuperação é: ${recoveryCode}`
      };

      await transporter.sendMail(mailOptions, function (error, /*info*/) {
        if (error) {
          return res.status(500).send('Erro ao enviar e-mail de recuperação.');
        } else {
          selectUser.recoveryCode= recoveryCode;
          selectUser.expirationCodeRecovery= expirationCodeRecovery;
          selectUser.save();
          //console.log('E-mail de recuperação enviado: ' + info.response);
          res.status(200).send('E-mail de recuperação enviado.');
        }
      });
    } catch (error) {
      res.status(500).send("Erro inesperado.");
    
    }
  },

  validateCode: async function (req, res) {
    const { recoveryCode }= req?.body; 
    if (!recoveryCode) {
      return res.status(400).send('Código de recuperação é obrigatório.');
    }

    try {
      const selectUser=await User.findOne({recoveryCode: recoveryCode });

      if (!selectUser) {
        return res.status(404).send('Código de recuperação inválido.');
      }

      if (selectUser.expirationCodeRecovery  < new Date()) {
        return res.status(400).send('O código de recuperação expirou.');
      }
      const token=jwt.sign({ _id: selectUser._id }, process.env.TOKEN_SECRET, { expiresIn: '3m' });

      const tokenExpirationValidate= new Date();
      tokenExpirationValidate.setMinutes(tokenExpirationValidate.getMinutes() + 3); 
      
      selectUser.tokenExpirationValidate= tokenExpirationValidate; 
      selectUser.recoveryCode= null;
      selectUser.expirationCodeRecovery = null;
      
      await selectUser.save();
      return res.status(200).send(token);

    } catch (error) {
      res.status(500).send('Erro inesperado.');
      console.log(error);
    }
  },

  resetPassword: async function (req, res) {
    const token= req?.headers?.authorization;
    const { newPassword }= req?.body;
    
    const { error }= newPasswordValidate( req.body );
    if (error) {
      const errorMessage=error.message;
    
      switch (true) {
        case errorMessage.includes('"newPassword" is not allowed to be empty'):
          return res.status(400).send('A senha é obrigátoria.');
        case errorMessage.includes('"newPassword" length must be at least 6 characters long'):
          return res.status(400).send('A senha deve conter no mínimo 6 caracteres.');
        default:
          return res.status(400).send(error.message);
      }
    }
  
    if (!token ) {
      return res.status(401).send('Token não encontrado.');
    }
    
    try {
      const decodedToken=jwt.verify(token, process.env.TOKEN_SECRET);
      const userId=decodedToken._id;
      const selectUser=await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não encontrado.');
      }
      
      if (selectUser.tokenExpirationValidate < Date.now()) {
        return res.status(400).send('O token de recuperação expirou.');
      }
      console.log(userId)
      selectUser.password=bcrypt.hashSync(newPassword);
      selectUser.tokenExpirationValidate=null;
      await selectUser.save();
  
      return res.status(200).send('Senha alterada com sucesso.');
  
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },

  display: async function (req, res) {
    const token = req?.headers?.authorization;
    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
  
    try {
      const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id;
      const selectUser = await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não encontrado.');
      }

      const allItems = await Item.find();
      
      if (allItems.length === 0) {
        return res.status(404).send('Nenhum item encontrado.');
      }

      res.status(200).json(allItems);
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  }
  
  
  
}


module.exports=userController;
