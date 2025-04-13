import express, { Request, Response } from 'express';
import { config, prisma, s3 } from '../config';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Update user information
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const { name, pfp, description } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    const updateData: any = {};
    
    if (name) {
      updateData.name = name;
    }
    
    if (description) {
      updateData.description = description;
    }
    
    if (pfp) {
      // Handle profile picture upload to S3
      const [header, encoded] = pfp.split(',', 2);
      const imageData = Buffer.from(encoded, 'base64');
      
      const key = `profile_pics/${userId}.jpg`;
      
      await s3.putObject({
        Bucket: config.s3Bucket,
        Key: key,
        Body: imageData,
        ContentType: 'image/jpeg'
      }).promise();
      
      const s3Url = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;
      updateData.pfp = s3Url;
    }
    
    // Update user
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    }
    
    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    return res.status(200).json({
      name: updatedUser?.name,
      email: updatedUser?.email,
      pfp: updatedUser?.pfp,
      description: updatedUser?.description
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
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

// Get user data
router.get('/data', authenticateToken, (req: Request, res: Response) => {
  return res.status(200).json({ userId: req.user?.userId });
});

// Get user badges
router.get('/badge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Find user
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
    const badges = user.badges.map(userBadge => userBadge.badge);
    
    return res.status(200).json({ badges });
  } catch (error) {
    console.error('Get badges error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// update user goals
router.post('/goals', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('Updating user goals...');
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    let { stepGoal, distanceGoal } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate input
    if (stepGoal < 0 || distanceGoal < 0) {
      console.log('Invalid goals provided:', stepGoal, distanceGoal);
      return res.status(400).json({ message: 'Goals must be non-negative' });
    }
    if (!stepGoal && !distanceGoal) {
      console.log('No goals provided');
      return res.status(400).json({ message: 'At least one goal must be provided' });
    }

    // if one goal is not provided, set it to the current value
    if (!stepGoal) {
      stepGoal = user.stepGoal;
    }
    if (!distanceGoal) {
      distanceGoal = user.distanceGoal;
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update goals
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stepGoal,
        distanceGoal
      }
    });
    
    return res.status(200).json({ message: 'Goals updated successfully' });
  } catch (error) {
    console.error('Update goals error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user metrics
router.get('/metrics', authenticateToken, async (req: Request, res: Response) => {
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

    // get all user's plogging sessions for the day
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const ploggingSessions = await prisma.ploggingSession.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    // Calculate total time, distance, and steps for the day by summing up the plogging sessions
    const totalTime = ploggingSessions.reduce((acc, session) => {
      if (session.endTime) {
        return acc + ((session.endTime.getTime() - session.startTime.getTime()) / 1000);
      }
      return acc;
    }, 0);
    const totalDistance = ploggingSessions.reduce((acc, session) => acc + (session.distancesTravelled ?? 0), 0);
    const totalSteps = ploggingSessions.reduce((acc, session) => acc + (session.steps ?? 0), 0);
    const totalLitters = ploggingSessions.reduce((acc, session) => {
    const litterCollected = session.litterCollected && typeof session.litterCollected === 'object' ? session.litterCollected : {};
      return acc + Object.keys(litterCollected).length;
    }, 0);
    const totalPoints = ploggingSessions.reduce((acc, session) => acc + (session.points ?? 0), 0);
    
    return res.status(200).json({
      time: totalTime,
      distance: totalDistance / 10000,
      steps: totalSteps,
      calories: totalSteps * 0.04,
      curr_streak: user.streak,
      points: totalPoints,
      litter: totalLitters,
      stepgoals: user.stepGoal,
      distancegoals: user.distanceGoal,
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 