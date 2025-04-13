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