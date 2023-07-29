const jwt= require('jsonwebtoken');
const User= require('../models/User');
const Item= require('../models/Item');
const {newItemValidate}= require('./validate');

const adminController={    
    auth: async function(req, res, next) {
      const token = req.headers.authorization; 
      
      if (!token) {
        return res.status(401).send('Token não fornecido');
      }
  
      try {
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        const userId = decodedToken._id;
        const selectUser = await User.findById(userId);
  
        if (!selectUser || selectUser.admin !== true) {
          return res.status(403).send('Usuário não encontrado ou sem permissão de administrador');
        }
  
        req.user = selectUser; 
        next(); 
  
      } catch (error) {
        return res.status(401).send('Token inválido');
      }
    },

    success: async function (req, res) {
      if (req.user.admin) {
        res.status(200).send('Esse dado só deve ser visto pelo admin');
      } else {
        res.status(401).send('Acesso Negado');
      }
    },
  
    register: async function (req, res) {
      if (req.user.admin) {
        const { error }= newItemValidate(req?.body);  
        if (error) {
          const errorMessage= error.message;
          console.log(error)
        
          switch (true) {
            case errorMessage.includes('"category" is not allowed to be empty'):
              return res.status(400).send('A categoria é obrigatório.');
        
            case errorMessage.includes('"category" length must be at least 3 characters long'):
              return res.status(400).send('A categoria deve ter no mínimo três caracteres.');
        
            case errorMessage.includes('"price" is not allowed to be empty'):
              return res.status(400).send('O preço é obrigatório.');

            case errorMessage.includes('"price" must be a number'):
              return res.status(400).send('O preço deve ser um número.');
          
            case errorMessage.includes('"description" length must be at least 4 characters long'):
              return res.status(400).send('A descrição deve conter no mínimo 4 caracteres.');
        
            case errorMessage.includes('"description" is not allowed to be empty'):
              return res.status(400).send('A descrição é obrigatória.');
        
            default:
              return res.status(400).send(error.message);
          }
        }
        const item = new Item({
          category: req.body?.category,
          price: req.body?.price,
          description:req.body?.description
        });
    
        try {
          await item.save();
          res.status(200).send("Registrado");
        } catch (error) {
          res.status(400).send(error);
        }
      } else {
      return res.status(401).send('Acesso Negado');
      }
    } 
    
  };

module.exports = adminController;
  