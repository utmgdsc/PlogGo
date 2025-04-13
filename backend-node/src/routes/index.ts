import express from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import sessionRoutes from './session';
import sessionsRoutes from './sessions';
import miscRoutes from './misc';
import litterClassificationRoutes from './litterClassification';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config';

const router = express.Router();

// Auth routes
router.use('/', authRoutes);

// User routes
router.use('/user', userRoutes);

// Session routes (for active sessions)
router.use('/sessions', sessionRoutes);

// Sessions routes (for completed sessions history)
router.use('/sessions-history', sessionsRoutes);

// Misc routes (leaderboard, daily challenge, etc.)
router.use('/', miscRoutes);

// Litter classification routes
router.use('/', litterClassificationRoutes);

// Legacy API compatibility routes to match Flask API
// These duplicate endpoints are directly at the root level

// Get user profile - directly at root level for frontend compatibility
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Find user with badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: {
            badge: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format badges
    const badges = user.badges.map(userBadge => ({
      title: userBadge.badge.name,
      icon: '♻️'  // Default icon, can be customized later
    }));
    
    return res.status(200).json({
      name: user.name || "",
      email: user.email,
      pfp: user.pfp || "",
      description: user.description || "",
      streak: user.streak,
      badges
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user metrics - directly at root level for frontend compatibility
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({
      time: user.totalTime,
      distance: user.totalDistance,
      steps: user.totalSteps,
      calories: user.totalSteps * 0.04,
      curr_streak: user.streak,
      points: user.totalPoints,
      litter: user.totalLitters
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 