import express from 'express';
import axios, { AxiosError } from 'axios';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config';

const router = express.Router();

// The URL of the Flask litter classification server
const LITTER_CLASSIFIER_URL = process.env.LITTER_CLASSIFIER_URL || 'http://localhost:5001';

interface LitterResponse {
  points: number;
  litters: Record<string, number>;
}

// Route to classify litter from an image and store results
router.post('/classify-litter', authenticateToken, async (req, res) => {
  try {
    console.log("classify-litter endpoint called");
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if the request contains the required image data
    if (!req.body.image) {
      return res.status(400).json({ message: 'Image data is required' });
    }
    
    // Forward the image to the Flask classification server
    const classifierResponse = await axios.post<LitterResponse>(`${LITTER_CLASSIFIER_URL}/classify`, {
      image: req.body.image,
      user_id: userId // Optional, can be used for logging/tracking
    });
    
    // Get classification results
    const { points, litters } = classifierResponse.data;
    
    // Check if the response structure is valid
    if (points === undefined || !litters) {
      return res.status(500).json({
        message: 'Invalid response from classification server',
      });
    }
    
    // Get session ID from request (if any)
    const sessionId = req.body.sessionId || null;
    
    // Get current user data including collected litters
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { collectedLitters: true }
    });
    
    // Parse current collectedLitters or create empty object if not exists
    const currentCollectedLitters = user?.collectedLitters ? 
      (typeof user.collectedLitters === 'string' ? 
        JSON.parse(user.collectedLitters as string) : 
        user.collectedLitters as Record<string, number>) : 
      {};
    
    // Add newly collected litters to existing counts
    const updatedCollectedLitters = { ...currentCollectedLitters };
    
    for (const [litterType, count] of Object.entries(litters)) {
      updatedCollectedLitters[litterType] = (updatedCollectedLitters[litterType] || 0) + count;
    }
    
    // Update user statistics in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: { increment: points },
        totalLitters: { increment: Object.values(litters).reduce((a, b) => a + b, 0) },
        collectedLitters: updatedCollectedLitters
      }
    });
    
    // If a session ID is provided, update the plogging session with the points
    console.log("sessionId", sessionId);
    if (sessionId) {
      await prisma.ploggingSession.update({
        where: { sessionId: sessionId },
        data: {
          points: points
        }
      });
    }
    
    // Return the classification results to the client
    return res.status(200).json({
      points,
      litters,
      collectedLitters: updatedCollectedLitters
    });
    
  } catch (error) {
    console.error('Litter classification error:', error);
    
    // Check if the error is from the classifier service
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.data) {
      return res.status(axiosError.response.status || 500).json({
        message: 'Classification service error',
        error: axiosError.response.data
      });
    }
    
    return res.status(500).json({
      message: 'Server error during litter classification',
      error: (error as Error).message
    });
  }
});

// Route for legacy API compatibility - but with different implementation
router.post('/store-litter', authenticateToken, async (req, res) => {
  try {
    console.log("store-litter endpoint called");
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Check if the request contains the required image data
    if (!req.body.image) {
      return res.status(400).json({ message: 'Image data is required' });
    }
    
    // Forward the image to the Flask classification server
    try {
      console.log(`Sending request to classifier service at ${LITTER_CLASSIFIER_URL}/classify`);
      const classifierResponse = await axios.post<LitterResponse>(`${LITTER_CLASSIFIER_URL}/classify`, {
        image: req.body.image,
        user_id: userId
      });
      
      // Get classification results
      const { points, litters } = classifierResponse.data;
      console.log('Classifier response:', { points, litters });
      
      // Ensure litters is an object even if the classifier returns null or undefined
      const litterData = litters || {};
      const pointsData = points || 0;
      
      // Check if user has an active plogging session
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          collectedLitters: true,
          sessionId: true 
        }
      });
      
      // Parse current collectedLitters or create empty object if not exists
      const currentCollectedLitters = user?.collectedLitters ? 
        (typeof user.collectedLitters === 'string' ? 
          JSON.parse(user.collectedLitters as string) : 
          user.collectedLitters as Record<string, number>) : 
        {};
      
      // Calculate total litter count
      const totalLitterCount = Object.values(litterData).reduce((a: number, b: number) => a + b, 0);
      
      if (totalLitterCount > 0) {
        // Only update if we actually found litter
        console.log(`Updating user stats with ${totalLitterCount} litter items and ${pointsData} points`);
        
        // Update session with litter data if user has an active session
        if (user?.sessionId) {
          // Get current session litter data
          const session = await prisma.ploggingSession.findUnique({
            where: { sessionId: user.sessionId },
            select: { litterCollected: true }
          });
          
          // Parse current session litter data
          const currentSessionLitter = session?.litterCollected ? 
            (typeof session.litterCollected === 'string' ? 
              JSON.parse(session.litterCollected as string) : 
              session.litterCollected as Record<string, number>) : 
            {};
          
          // Update session litter counts
          const updatedSessionLitter = { ...currentSessionLitter };
          for (const [litterType, count] of Object.entries(litterData)) {
            updatedSessionLitter[litterType] = (updatedSessionLitter[litterType] || 0) + count;
          }
          
          // Update the session with new litter data and points
          await prisma.ploggingSession.update({
            where: { sessionId: user.sessionId },
            data: {
              litterCollected: updatedSessionLitter,
              points: { increment: pointsData }
            }
          });
          
          console.log(`Updated session ${user.sessionId} with litter data`);
        } else {
          console.log('User has no active session, only updating user stats');
          
          // Add newly collected litters to existing user counts since there's no active session
          const updatedCollectedLitters = { ...currentCollectedLitters };
          for (const [litterType, count] of Object.entries(litterData)) {
            updatedCollectedLitters[litterType] = (updatedCollectedLitters[litterType] || 0) + count;
          }
          
          // Update user statistics in the database
          await prisma.user.update({
            where: { id: userId },
            data: {
              totalPoints: { increment: pointsData },
              totalLitters: { increment: totalLitterCount },
              collectedLitters: updatedCollectedLitters
            }
          });
        }
      } else {
        console.log('No litter detected in the image');
      }
      
      // Return the classification results to the client
      return res.status(200).json({
        points: pointsData,
        litters: litterData,
        sessionId: user?.sessionId || null
      });
    } catch (axiosError) {
      console.error('Error calling classifier service:', axiosError);
      return res.status(500).json({ 
        message: 'Error contacting litter classification service',
        error: (axiosError as Error).message
      });
    }
  } catch (error) {
    console.error('Litter classification error (store-litter endpoint):', error);
    return res.status(500).json({
      message: 'Server error during litter classification',
      error: (error as Error).message
    });
  }
});

export default router; 