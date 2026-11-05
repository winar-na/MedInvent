import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token, authorization denied' });
  
  const token = header.split(' ')[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ error: 'No token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid or expired' });
  }
};