import express, { Request, Response } from 'express';
import { prisma } from '../config';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const metric = req.query.metric?.toString() || 'totalPoints';
    const count = parseInt(req.query.count?.toString() || '10');
    
    if (isNaN(count)) {
      return res.status(400).json({ message: 'Invalid count parameter' });
    }
    
    // Get users ordered by the specified metric
    const users = await prisma.user.findMany({
      orderBy: {
        [metric]: 'desc'
      },
      take: count,
      select: {
        id: true,
        name: true,
        email: true,
        totalPoints: true,
        totalDistance: true,
        totalTime: true,
        pfp: true
      }
    });
    
    // Transform data to match frontend expected format
    const leaderboard = users.map(user => ({
      user_id: user.id,
      name: user.name || '2lazy2setaname',
      email: user.email,
      username: user.email.split('@')[0], // Generate a username from email
      total_points: user.totalPoints,
      total_distance: user.totalDistance,
      total_time: user.totalTime,
      profile_picture: user.pfp
    }));
    
    return res.status(200).json({ metric, leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get daily challenge
router.get('/daily-challenge', async (req: Request, res: Response) => {
  try {
    // Get a random challenge
    const challenge = await prisma.challenge.findFirst({
      orderBy: {
        id: 'asc'  // Replace with a more random ordering if needed
      }
    });
    
    return res.status(200).json({ challenge });
  } catch (error) {
    console.error('Get daily challenge error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 