const Joi = require('@hapi/joi');

const registerValidate = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(50),
    email: Joi.string().required().min(3).max(50),
    password: Joi.string().required().min(6).max(100),
  });

 
  return schema.validate(data);
};


const loginValidate= (data)=>{
    const schema= Joi.object({
        email:Joi.string().required().min(3).max(50),
        password:Joi.string().required().min(6).max(100)
    })
    const { error, value } = schema.validate(data);
  
    if (error && error.details && error.details.length > 0) {
      const errorField = error.details[0].path[0];
  
      if (errorField === "password") {
        return {
          error: {
            message: "A senha deve conter no mínimo seis caracteres",
            field: errorField,
          },
        }
      }
    }
  
    return { value };
};


const newPasswordValidate = (data) => {
  const schema = Joi.object({
    newPassword: Joi.string().required().min(6).max(100),
  });

 
  return schema.validate(data);
};


const newItemValidate = (data) => {
  data.price = parseFloat(data.price); 
  data.category = String(data.category);
  data.stockQuantity = parseInt(data.stockQuantity); 
  const schema = Joi.object({
    category: Joi.string().required().min(3).max(50),
    price: Joi.number().required().min(1).max(500000000),
    stockQuantity: Joi.number().required().min(1).max(500000000),
    description: Joi.string().required().min(4).max(100)
  });

 
  return schema.validate(data);
};

module.exports.newPasswordValidate= newPasswordValidate;
module.exports.loginValidate= loginValidate;
module.exports.registerValidate= registerValidate;
module.exports.newItemValidate= newItemValidate;