import Joi, { ObjectSchema } from 'joi';

const signupSchema: ObjectSchema = Joi.object().keys({
  username: Joi.string().required().min(4).max(15).messages({
    'string.base': 'Username must be of type string',
    'string.min': 'Username must be at least four characters long',
    'string.max': 'Username must be less than 15 characters long',
    'string.empty': 'Username is a required field'
  }),
  password: Joi.string().required().min(4).max(15).messages({
    'string.base': 'Password must be of type string',
    'string.min': 'Password must be at least four characters long',
    'string.max': 'Password must be less than 15 characters long',
    'string.empty': 'Password is a required field'
  }),
  email: Joi.string().required().email().messages({
    'string.base': 'Email must be of type string',
    'string.email': 'Email must be valid',
    'string.empty': 'Email is a required field'
  }),
  avatarColor: Joi.string().required().messages({
    'any.required': 'Avatar color is required'
  }),
  avatarImage: Joi.string().required().messages({
    'any.required': 'Avatar image is required'
  })
});

export { signupSchema };
