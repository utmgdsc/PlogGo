import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config, prisma } from '../config';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create JWT token
    const jti = uuidv4();
    const accessToken = jwt.sign(
      { userId: user.id, jti },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({ user_id: user.id, access_token: accessToken });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Registration route
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user with PostgreSQL-generated UUID
    const user = await prisma.user.create({
      data: {
        name: 'New User',
        email,
        password: hashedPassword,
        pfp: 'https://example.com/default_profile_pic.jpg',
        description: '',
        totalSteps: 0,
        totalDistance: 0,
        totalTime: 0,
        totalPoints: 0,
        totalLitters: 0,
        streak: 0,
        highestStreak: 0
      }
    });
    
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Decode token to get jti
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const jti = decoded.jti || uuidv4(); // Provide a default value if jti is undefined
    
    // Add token to blacklist
    await prisma.tokenBlacklist.create({
      data: { jti }
    });
    
    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Protected route for testing
router.get('/protected', authenticateToken, (req: Request, res: Response) => {
  return res.status(200).json({
    message: 'Access granted',
    userId: req.user?.userId
  });
});

export default router; 