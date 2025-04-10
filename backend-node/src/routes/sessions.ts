import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config';

const router = express.Router();

// Middleware
router.use(authenticateToken);

// Get latest session for a user
router.get('/latest', async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find the latest completed session for this user
    const latestSession = await prisma.ploggingSession.findFirst({
      where: {
        userId: userId,
        endTime: { not: null } // Make sure it's a completed session
      },
      orderBy: {
        endTime: 'desc' // Get the most recent one
      }
    });

    if (!latestSession) {
      return res.status(404).json({ error: 'No completed sessions found' });
    }

    return res.json(latestSession);
  } catch (error) {
    console.error('Error fetching latest session:', error);
    return res.status(500).json({ error: 'Server error fetching session data' });
  }
});

// Get specific session by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const sessionId = req.params.id;
    
    // Find the specific session
    const session = await prisma.ploggingSession.findFirst({
      where: {
        id: sessionId,
        userId: userId // Ensure the session belongs to this user
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Server error fetching session data' });
  }
});

// Get all sessions for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find all completed sessions for this user
    const sessions = await prisma.ploggingSession.findMany({
      where: {
        userId: userId,
        endTime: { not: null } // Only completed sessions
      },
      orderBy: {
        endTime: 'desc' // Most recent first
      }
    });

    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: 'Server error fetching sessions' });
  }
});

export default router; 