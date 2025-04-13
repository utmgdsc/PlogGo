import express, { Request, Response } from 'express';
import { prisma } from '../config';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user sessions
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ploggingSessions: {
          where: { endTime: null }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({ sessions: user.ploggingSessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Logout specific session
router.post('/logout/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
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
    
    // Find session
    const session = await prisma.ploggingSession.findFirst({
      where: {
        sessionId,
        userId: user.id
      }
    });
    
    if (!session) {
      return res.status(403).json({ message: 'Session not found or not authorized' });
    }
    
    // Update session
    const endTime = new Date();
    const elapsedTime = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
    
    await prisma.ploggingSession.update({
      where: { id: session.id },
      data: {
        endTime,
        elapsedTime
      }
    });
    
    return res.status(200).json({ message: 'Session logged out', sessionId });
  } catch (error) {
    console.error('Logout session error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Store plogging session
router.post('/end', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const { routes, distancesTravelled, steps, timeStart, timeEnd, elapsedTime, sessionid } = req.body;
    
    // Validate required fields
    const requiredFields = ['routes', 'distancesTravelled', 'steps', 'timeStart', 'timeEnd', 'elapsedTime', 'sessionid'];
    for (const field of requiredFields) {
      if (!(field in req.body)) {
        return res.status(400).json({ message: `Missing ${field} field` });
      }
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create session data
    const sessionData = {
      sessionId: sessionid,
      userId: user.id,
      startTime: new Date(timeStart),
      endTime: new Date(timeEnd),
      elapsedTime,
      routes,
      distancesTravelled,
      steps
    };
    
    // Save session
    await prisma.ploggingSession.create({
      data: sessionData
    });
    
    // Update user stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalSteps: { increment: steps },
        totalDistance: { increment: distancesTravelled },
        totalTime: { increment: elapsedTime }
      }
    });
    
    // Check for badges
    const newBadges = await prisma.badge.findMany({
      where: {
        stepsRequired: {
          lte: steps
        }
      }
    });
    
    // Award badges to user
    for (const badge of newBadges) {
      // Check if user already has this badge
      const existingBadge = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId: user.id,
            badgeId: badge.id
          }
        }
      });
      
      if (!existingBadge) {
        await prisma.userBadge.create({
          data: {
            userId: user.id,
            badgeId: badge.id
          }
        });
      }
    }
    
    return res.status(200).json({ message: 'Data stored successfully' });
  } catch (error) {
    console.error('Store session error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 