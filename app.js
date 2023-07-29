require('dotenv').config();
const express = require('express');
const app = express();
const userRouter = require('./routes/userRouter');
const adminRouter= require('./routes/adminRouter');
const mongoose = require('mongoose');
const cors= require('cors');
//const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const Item= require('./models/Item');
const http = require('http');

//está afetando o front, depois vejo outra solução
/*const limiter = rateLimit({
  windowMs: 3000, 
  max: 1, 
  message: 'Aguarde alguns segundos antes de fazer uma nova solicitação.',
});
app.use(limiter);*/

app.use(cors({ origin: '*' }));
app.use(express.json());

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_CONNECTION_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
};



app.use('/user', userRouter,);
app.use('/admin', adminRouter);

connectToDatabase();

const server = http.createServer(app);
const io= socketIO(server, {cors:{origin:'*'}});
server.listen(process.env.PORT, () => {
  console.log('Server running');
});
      

io.on('connection', (socket) => {
  socket.on('getItems', async () => {
    try {
      const allItems = await Item.find();
      io.emit('allItems', allItems); 
    } catch (error) {
      console.error('Erro ao obter itens:', error.message);
    }
  });
});
 



