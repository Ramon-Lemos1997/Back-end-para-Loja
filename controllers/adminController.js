const jwt= require('jsonwebtoken');
const User= require('../models/User');
const Item= require('../models/Item');
const {newItemValidate}= require('./validate');

const adminController={   
  //verificar se o usuário é admin;
  auth: async function(req, res, next) {
    const token = req.headers.authorization; //dados do usuário;
    
    if (!token) {
      return res.status(401).send('Token não fornecido');
    }

    try {
      const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id;
      const selectUser = await User.findById(userId);

      if (!selectUser) {
        return res.status(403).send('Usuário não encontrado');
      }
      if (selectUser.admin !== true) {
        return res.status(403).send('Não possui permissão de administrador');
      }

      req.user = selectUser; 
      next(); //passo para o próximo middleware;

    } catch (error) {
      return res.status(401).send('Token inválido');
    }
  },
  //criei só para testar;
  success: async function (req, res) {
    if (req.user.admin) {
      res.status(200).send('Esse dado só deve ser visto pelo admin');
    } else {
      res.status(401).send('Acesso Negado');
    }
  },
  //cadastrar um item na loja;
  register: async function (req, res) {
    //vejo se é admin;
    if (req.user.admin) {
      const { error }= newItemValidate(req?.body);  
      //se não passar na validação cai aqui;
      if (error) {
        const errorMessage= error.message;
      
        switch (true) {
          case errorMessage.includes('"category" is not allowed to be empty'):
            return res.status(400).send('A categoria é obrigatório.');
      
          case errorMessage.includes('"category" length must be at least 3 characters long'):
            return res.status(400).send('A categoria deve ter no mínimo três caracteres.');
      
          case errorMessage.includes('"price" is not allowed to be empty'):
            return res.status(400).send('O preço é obrigatório.');
            
          case errorMessage.includes('"price" must be larger than or equal to 1'):
            return res.status(400).send('O preço deve ser igual ou maior que 1.');

          case errorMessage.includes('"price" must be a number'):
            return res.status(400).send('O preço deve ser um número.');

          case errorMessage.includes('"stockQuantity" is required'):
            return res.status(400).send('A quantidade é obrigatória.');

          case errorMessage.includes('"stockQuantity" must be larger than or equal to 1'):
            return res.status(400).send('A quantidade deve ser igual ou maior que 1.');

          case errorMessage.includes('"stockQuantity" must be a number'):
            return res.status(400).send('A quantidade deve ser um número.');
        
          case errorMessage.includes('"description" length must be at least 4 characters long'):
            return res.status(400).send('A descrição deve conter no mínimo 4 caracteres.');
      
          case errorMessage.includes('"description" is not allowed to be empty'):
            return res.status(400).send('A descrição é obrigatória.');
      
          default:
            return res.status(400).send(error.message);
        }
      }
      //verifico se recebi os dados e salvo;
      const item = new Item({
        category: req.body?.category,
        price: req.body?.price,
        stockQuantity: req.body?.stockQuantity,
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
  },
  //delatar um item da loja;
  deleteItem: async function (req, res) {
    //verificar se é admin
    if (req.user.admin) {
      const { _idItem } = req?.body;
      //procudar o item pelo id recebido e deletar;
      try {
        const itemDelete = await Item.findByIdAndDelete(_idItem);
    
        if (!itemDelete) {
          return res.status(404).send('Nenhum item encontrado.');
        }
        res.status(200).send('Item apagado');

      } catch (error) {
        return res.status(401).send('Token inválido.');
      }
    } else {
      return res.status(401).send('Acesso Negado');
    }
  },
  //editar um item da loja
  editItem: async function (req, res) {
    //verificar se é admin;
    if (req.user.admin) {
      const { error }= newItemValidate(req?.body);  
      if (error) {
        const errorMessage= error.message;
        //console.log(error)
      
        switch (true) {
          case errorMessage.includes('"category" is not allowed to be empty'):
            return res.status(400).send('A categoria é obrigatório.');
      
          case errorMessage.includes('"category" length must be at least 3 characters long'):
            return res.status(400).send('A categoria deve ter no mínimo três caracteres.');
      
          case errorMessage.includes('"price" is not allowed to be empty'):
            return res.status(400).send('O preço é obrigatório.');

          case errorMessage.includes('"price" must be larger than or equal to 1'):
          return res.status(400).send('O preço deve ser igual ou maior que 1.');

          case errorMessage.includes('"price" must be a number'):
            return res.status(400).send('O preço deve ser um número.');

          case errorMessage.includes('"stockQuantity" is required'):
            return res.status(400).send('A quantidade é obrigatória.');

          case errorMessage.includes('"stockQuantity" must be larger than or equal to 1'):
            return res.status(400).send('A quantidade deve ser igual ou maior que 1.');

          case errorMessage.includes('"stockQuantity" must be a number'):
            return res.status(400).send('A quantidade deve ser um número.');
        
          case errorMessage.includes('"description" length must be at least 4 characters long'):
            return res.status(400).send('A descrição deve conter no mínimo 4 caracteres.');
      
          case errorMessage.includes('"description" is not allowed to be empty'):
            return res.status(400).send('A descrição é obrigatória.');
      
          default:
            return res.status(400).send(error.message);
        }
      }
      const _idItem= req?.headers.id; 
      //encontrar o item pelo id;
      try {
        const item = await Item.findById(_idItem);
  
        if (!item) {
          return res.status(404).send('Item não encontrado.');
        }
        //editar o item e salvar a alteração;
        item.category = req.body?.category || item.category;
        item.price = req.body?.price || item.category;
        item.description = req.body?.description || item.description;
        await item.save();
  
        res.status(200).send("Item atualizado com sucesso.");
      } catch (error) {
        res.status(500).send("Erro ao atualizar o item.");
      }
    } else {
      return res.status(401).send('Acesso Negado');
    }
  }
    





};
module.exports = adminController;
  