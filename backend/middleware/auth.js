import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal', (err, user) => {
    if (err) {
      console.error('❌ Error verificando token:', err);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    console.log('✅ Usuario autenticado:', user.usuario);
    next();
  });
};

export default authenticateToken;
