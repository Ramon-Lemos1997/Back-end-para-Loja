const User= require('../models/User');
const bcrypt= require('bcryptjs'); //module criptografia;
const jwt= require('jsonwebtoken');  //module para criação de token único servidor;
const crypto=require('crypto'); // geração de hashes, cifras, assinaturas etc;
const nodemailer=require('nodemailer'); // para enviar email ;
const {loginValidate, registerValidate, newPasswordValidate}= require('./validate'); //validação de dados;
require('dotenv').config();
const config = require('../setups/setup');
const Item= require('../models/Item');
const lodash = require('lodash'); // usei para agrupamento de array's;


const maxAttempts = config.maxAttempts; //número que aceito de tentativas falhas;
const timeBlock = config.timeBlock; //tempo que bloqueio novas tentativas após chegar no maxAttempts;

const userController={    
  //fazer o registro;
  register:async function(req,res){
    const {email}= req?.body; //verificar se recebi um email;
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
    //uso operacional chaining para previnir null ou undefined;
    const user= new User({
        name: req.body?.name,
        email: req.body?.email,
        password: bcrypt.hashSync(req.body?.password) // criptografo a senha para salvar no banco de dados;
    });
    try{
        await user.save();
        res.status(200).send("Registrado");
    }catch(error){
        res.status(400).send(error);
    }
  },  
  //para efetuar o login; 
  login: async function(req, res) {
    const { error }= loginValidate(req?.body); //verifico se passou na validação;
    if (error) {
      return res.status(400).send(error.message);
    }
    const {email}= req?.body;
    const selectUser= await User.findOne({ email: email });
    if (!selectUser) {
      return res.status(400).send('Email ou senha incorretos');
    }
     //aqui verifico se já passou o tempo que estabeleci após o usuário errar três tentativas;
    if (selectUser.lockUntil > Date.now()) {  
      return res.status(400).send('Você excedeu o limite de tentativas de login. Tente novamente mais tarde.');
    }
   //comparo a senha recebida com a do banco de dados;
    const passwordAndUserMatch=bcrypt.compareSync(
      req?.body?.password,
      selectUser?.password
    );
      //se errar a senha aqui conto a tentativa e salvo;
    if (!passwordAndUserMatch) {
      selectUser.loginAttempts += 1;
      await selectUser.save();
      //quando chega a três tentativas falhas salvo o tempo que estabeleci no database;
      if (selectUser.loginAttempts >= maxAttempts) {
        selectUser.lockUntil= Date.now() + timeBlock;
        selectUser.loginAttempts= 0;
        await selectUser.save();
        return res.status(400).send('Você excedeu o limite de tentativas de login. Tente novamente mais tarde.');
      }
  
    return res.status(400).send('Email ou senha incorretos');
    }
    //se o login for bem sucedido zero a contagem e o tempo e envio o token;
    selectUser.loginAttempts= 0;
    selectUser.lockUntil= null;
    await selectUser.save();
  
    const token= jwt.sign({ _id: selectUser._id }, process.env.TOKEN_SECRET, { expiresIn: '1d' });
    res.status(200).send(token);
  },
  //faço merda nenhuma, se o usuário quiser sair, que se foda;
  logout: async function(req, res) { 
    res.status(200).send('Logout successful');
  },
 //recuperar a senha;
  recovery: async function (req, res) {
    const {email}= req?.body; //verificar se recebir um email;

    if (!email) {
      return res.status(400).send('O email é obrigatório.');
    }

    try {
      const selectUser= await User.findOne({email: email });

      if (!selectUser) {
        return res.status(404).send('Usuário não encontrado.');
      }
      //crio um código de recuperação;
      const recoveryCode= crypto.randomBytes(4).toString('hex');
      //crio o tempo de  expiração para o código
      const expirationCodeRecovery= new Date();
      expirationCodeRecovery .setMinutes(expirationCodeRecovery .getMinutes() + 2); 

     
      //aqui preencho de qual email irei enviar o código
      const transporter= await nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        secure: true,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.SENHA_EMAIL,
        }
      });
      //opção de email e dados para enviar o email;
      const mailOptions= {
        from: process.env.EMAIL,
        to: email,
        subject: 'Recuperação de Senha',
        text: `Seu código de recuperação é: ${recoveryCode}`
      };
      //aqui envio o email com o código e coloco em vigor o tempo de expiração ;
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
 //validar o código;
  validateCode: async function (req, res) {
    const { recoveryCode }= req?.body; //verificar se recebi o código;
    if (!recoveryCode) {
      return res.status(400).send('Código de recuperação é obrigatório.');
    }

    try {
      const selectUser= await User.findOne({recoveryCode: recoveryCode });
      //verificar se o código bate com qual enviei;
      if (!selectUser) {
        return res.status(404).send('Código de recuperação inválido.');
      }
      //verificar se expirou o tempo
      if (selectUser.expirationCodeRecovery  < new Date()) {
        return res.status(400).send('O código de recuperação expirou.');
      }
      //aqui após as verificações crio o token que irei validar para permitir a troca de senha;
      const token= jwt.sign({ _id: selectUser._id }, process.env.TOKEN_SECRET, { expiresIn: '3m' });
      //crio um tempo de validade para este token 
      const tokenExpirationValidate= new Date();
      tokenExpirationValidate.setMinutes(tokenExpirationValidate.getMinutes() + 3); 
      //aqui zero o código e o tempo de expiração dele e salvo o tempo de expiração do token que criei;
      selectUser.tokenExpirationValidate= tokenExpirationValidate; 
      selectUser.recoveryCode= null;
      selectUser.expirationCodeRecovery= null;
      
      await selectUser.save();
      return res.status(200).send(token);

    } catch (error) {
      res.status(500).send('Erro inesperado.');
      
    }
  },
  //trocar a senha;
  resetPassword: async function (req, res) {
    const token= req?.headers?.authorization; //dados do usuário;
    const { newPassword }= req?.body; //novo password;
    
    if (!token ) {
      return res.status(401).send('Token nulo.');
    }

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
    //decifro o código para obter os dados;
    try {
      const decodedToken= await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId= decodedToken._id;
      const selectUser= await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não encontrado.');
      }
      //verifico se já não expirou o tempo que dei para trocar a senha;
      if (selectUser.tokenExpirationValidate < Date.now()) {
        return res.status(400).send('O token de recuperação expirou.');
      }
      //criptografo a nova senha, zero o tempo de expiração do token e salvo;
      selectUser.password= await bcrypt.hashSync(newPassword);
      selectUser.tokenExpirationValidate= null;
      await selectUser.save();
  
      return res.status(200).send('Senha alterada com sucesso.');
  
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },
  //mostrar os items a venha;
  display: async function (req, res) {
    const token= req?.headers?.authorization; //dados do usuário;
    
    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
    //obter os dados
    try {
      const decodedToken= await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId= decodedToken._id;
      const selectUser= await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não sem permissão.');
      }
      //pega os items e enviar;
      const allItems= await Item.find();
      
      if (allItems.length === 0) {
        return res.status(404).send('Nenhum item encontrado.');
      }
      res.status(200).json(allItems);
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },
    //pegar um item pelo id;
  /*getItemById: async function (req, res) {
    const itemId = req.body?.productId; 
    const token = req?.headers?.authorization;
   
    if (!token) {
      return res.status(401).send('Token não encontrado.' );
    }
    //obter dados
    try {
      const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = await decodedToken._id;
      const selectUser = await User.findById(userId);
    
      if (!selectUser) {
        return res.status(403).send( 'Usuário não tem permissão para acessar este conteúdo.' );
      }
      //buscar pelo item;
      const item = await Item.findById(itemId);
        
      if (!item) {
        return res.status(404).send(  'Item não encontrado.' );
      }
      
      //detalhar o item;
      const itemToSend = {
        category: item.category,
        price: item.price,
        description: item.description,
      };
      //enviar o item detalhado;
      await res.status(200).send(itemToSend);
    } catch (error) {
      return res.status(401).send('Token inválido.' );
    }
  },*/
  //salvar item no carrinho de compras do usuário;
  saveItemFromCart: async function (req, res) {
    const itemId= req.body?.productId; //dados do item a ser salvo;
    const token= req?.headers?.authorization; //dados do usuário;
    
    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
    
    if (!itemId) {
      return res.status(404).send('Erro ao salvar o item no carrinho.');
    }
    //obter dados
    try {
      const decodedToken= await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId=  decodedToken._id;
      const selectUser= await User.findById(userId);
    
      if (!selectUser) {
        return res.status(403).send( 'Usuário não tem permissão para acessar este conteúdo.' );
      }
      //adicionar o item no carrinho e salvar;
      selectUser.cartItems.push(itemId);
      await selectUser.save();
      
      res.status(200).send('Item adicionado com sucesso!');
    } catch (error) {
      return res.status(401).send('Token inválido.' );
    }
  },
  //deletar item do carrinho de compras;
  deleteItemFromCart: async function (req, res) {
    const itemId= req.body?.productId;  //dados do item a ser removido;
    const token= req?.headers?.authorization;//dados do usuário;

    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
    
    if (!itemId) {
      return res.status(400).send('Dados inválidos.');
    }
    //obter dados;
    try {
      const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id;
      const selectUser = await User.findById(userId);
    
      if (!selectUser) {
        return res.status(403).send('Usuário não tem permissão para acessar este conteúdo.');
      }
  
      // verificar se o item está no carrinho do usuário;
      const itemIndex = selectUser.cartItems.indexOf(itemId);
      if (itemIndex === -1) {
        return res.status(404).send('Item não encontrado no carrinho.');
      }

      // remover o primeiro item correspondente do carrinho do usuário e salvar;
      selectUser.cartItems.splice(itemIndex, 1);
      await selectUser.save();
      
      return res.status(200).send('Item removido do carrinho com sucesso.');
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },
  //pegar o carrinho de compras do usuário;
  getCart: async function(req, res) {
    const token = req.headers?.authorization; //dados do usuário;
    
    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
    //obter o dados;
    try {
      const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id;
      const selectUser = await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não encontrado.');
      }
      //pegar o carrinho de compra do usuário;
      const cartItems = selectUser.cartItems; 
      return res.status(200).send(cartItems);

    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },
  //envia os item resumido e organizado para ser exibido no carrinho;
  getCartItemByIds: async function (req, res) {
    const itemId = req.query?.productId; //aqui recebo um array com o id's dos item do carrinho de compras do usuário;
    const token = req.headers?.authorization; //dados do usuário;
   
    if (!token) {
      return res.status(401).send('Token não encontrado.');
    }
    //obter dados
    try {
      const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id;
      const selectUser = await User.findById(userId);
  
      if (!selectUser) {
        return res.status(403).send('Usuário não tem permissão para acessar este conteúdo.');
      }
      
      // verifico qual items que recebi ainda estão disponíveis no database Item;
      const validItemIds = (await Item.find({ _id: { $in: itemId } }).distinct('_id')).map(id => id.toString()); //distinct cria um array com os objetos únicos e após uso o map para transformar em string;
      
      //filtro os itens disponíveis criando um array somente com eles;
      const filteredIds = itemId.filter(id => validItemIds.includes(id));
      //console.log(filteredIds);
      //uso o promise para aguardar a resolução de todas promises geradas pelo map, na função eu uso o map para criar um array com todos o detalhe de cada item presente;
      const availableItemDetails = await Promise.all(filteredIds.map(async id => {
        const item = await Item.findById(id);
        if (item) {
          return {
            _id: item._id,
            category: item.category,
            price: item.price,
            description: item.description,
          };
        }
        return null; // vai retornar bosta nenhuma se não existir dados;
      }));
      
      //pego o array do availableItemDetails e faço um resumo separando em grupos;
      const groupedItems = lodash.groupBy(availableItemDetails, item => `${item.category}-${item.price}-${item.description}`);
      

      //crio um array com os grupos e desmenbro com map e crio um model e adiciono o tamanho;
      const itemSummary = Object.values(groupedItems).map(group => ({
        ...group[0], 
        count: group.length 
      }));
      //envio o item resumido;
      return res.status(200).send({itemSummary: itemSummary, filteredIds: filteredIds});
  
    } catch (error) {
      return res.status(401).send('Token inválido.');
    }
  },
  //validar no checkout se o item existe e tem no estoque;
  valid: async function(req, res) {
    const items = req.body?.productId; //recebo o array com o dados;
    const token = req?.headers?.authorization; //dados do usuário;
    //console.log(items)
   
    if (!token) {
      return res.status(401).send('Token não encontrado.' );
    }
    //obter dados;
    try {
      const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
      const userId = decodedToken._id; 
      const selectUser = await User.findById(userId);
    
      if (!selectUser) {
        return res.status(403).send('Usuário não tem permissão para acessar este conteúdo.');
      } 
    } catch (error) {
      return res.status(500).send('Erro interno do servidor');
    }
    //verifico se recebi um array ou o items;
    if (!items || !Array.isArray(items)) {
      return res.status(400).send('Dados inválidos');
    }
    
    const existAndAvailable = [];
    const unavailableItems = [];
    
    try {
      for (const item of items) {
        const databaseItem = await Item.findOne({ _id: item._id }); 
        
       
        if (databaseItem && databaseItem.stockQuantity >= item.count) {
            existAndAvailable.push( item);
        } else{
          unavailableItems.push(item.description);
        }
       
      }
      //verificar se o array filtado tem o mesmo tamanho com recebio;
      if (existAndAvailable.length === items.length) {
        return res.status(200).send('Todos os items estão disponível em estoque, pode prosseguir');
      } else { 
        const message = `Os seguintes itens não estão mais disponíveis: ${unavailableItems.join(", ")} , remova estes items do seu carrinho e tente novamente.`;
        return res.status(400).send(message);
      }
    } catch (error) {
      return res.status(500).send('Erro interno do servidor');
    }
  },
  /*zerar carrinho de compra do usuário;   /*aqui a pessoa pode também implementar aonde irá salvar a compra, ou enviar para algum email, para fazer o procesamento da venda, isto é para 
                                            uma futura implementação, paro meu projeto com esta aba aberta*/
  resetCart: async function (req, res) {     
    try {
      const checkoutItems = req.body?.checkoutItems; // Recebe um array com os itens do carrinho contendo objetos que irá conter token contendo identificação de quem efetuou a compra, id do item da compra e count que é quantidade que foi comprada;
      //console.log(checkoutItems);
      if (!checkoutItems) {
        throw new Error('Nenhum objeto recebido.');
      }
     
      const idAndCounts = checkoutItems.map(obj => ({ _id: obj._idItem, count: obj.count })); // aqui crio um array com o id e count de cada objeto;
      //aqui me inteiro sobre cada obejto, pego o id do objeto e procuro ele no banco de dados, achando-o em tiro o count da quantidade total do item no estoque;
      await Promise.all(idAndCounts.map(async obj => {
        const itemId = obj._id; 
        const itemCountToRemove = obj.count; 
        //console.log(itemId)
        //console.log(itemCountToRemove)
       
        const item = await Item.findById(itemId); 
        if (item) {
          item.stockQuantity -= itemCountToRemove;
          await item.save();
          console.log(`Quantidade do item ${itemId} atualizada para ${item.stockQuantity}`);
        } else {
          //console.log(`Item ${itemId} não encontrado no banco de dados.`);
        }
      }));

      const _idUser = checkoutItems.map(obj => ({idUser: obj._idUser})); // aqui crio um array somente com os ids;
      //console.log(_idUser)
      //aqui me inteiro sobre cada id, zero seu carrinho de compras;
      await Promise.all(_idUser.map(async id => {
        const user = await User.findById(id.idUser); 
        //console.log(user)
        if (user && user.cartItems.length > 0) {
          user.cartItems = []; 
          await user.save(); 
          console.log(`Carrinho de compra do usuário ${user.email} zerado com sucesso.`);
        } else {
          console.log(`Usuário não encontrado ou carrinho vazio para o id ${user_id}. Ação não permitida.`);
        }
      }));
       
     
      return res.status(200).send('Estoque atualizado.');
    } catch (error) {
      //console.error(`Erro geral: ${error}`);
      return res.status(500).send('Erro ao processar os itens.');
    }
  }
  


  
  
  
  
}
module.exports= userController;
