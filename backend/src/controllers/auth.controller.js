import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.config.js';

export const registerValidators = [
  body('facility_name').trim().notEmpty().withMessage('Facility name required').isLength({ min: 3 }),
  body('facility_type').notEmpty().withMessage('Select facility type').isIn(['pharmacy','lab','drug_shop','hospital','clinic','other']),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars').matches(/[A-Z]/).withMessage('1 uppercase').matches(/[0-9]/).withMessage('1 number')
];

export const loginValidators = [
  body('email').isEmail(),
  body('password').notEmpty()
];

export const register = async (req,res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors: errors.array()});
  const { facility_name, facility_type, email, password } = req.body;
  try{
    const exists = await pool.query('SELECT id FROM users WHERE email=$1',[email]);
    if(exists.rows.length>0) return res.status(400).json({error:'Email already registered'});
    const hash = await bcrypt.hash(password,10);
    const result = await pool.query('INSERT INTO users (facility_name, facility_type, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, facility_name, facility_type, email',[facility_name, facility_type, email, hash]);
    const user = result.rows[0];
    const token = jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET, {expiresIn:'7d'});
    res.status(201).json({token,user});
  }catch(e){console.error(e);res.status(500).json({error:'Server error'})}
};

export const login = async (req,res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({errors: errors.array()});
  const {email,password}=req.body;
  try{
    const result = await pool.query('SELECT * FROM users WHERE email=$1',[email]);
    if(result.rows.length===0) return res.status(400).json({error:'Invalid credentials'});
    const user=result.rows[0];
    const match=await bcrypt.compare(password,user.password_hash);
    if(!match) return res.status(400).json({error:'Invalid credentials'});
    const token=jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.json({token,user:{id:user.id,facility_name:user.facility_name,facility_type:user.facility_type,email:user.email}});
  }catch(e){console.error(e);res.status(500).json({error:'Server error'})}
};