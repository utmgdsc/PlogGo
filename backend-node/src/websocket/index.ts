import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config, prisma, sessions, SessionData } from '../config';
import { haversineDistance } from '../utils/helper';
import { Server as HttpServer } from 'http';
import { JwtPayload } from 'jsonwebtoken';

// Utility function to get or create a session
async function getOrCreateSession(userId: string): Promise<{sessionId: string, isNew: boolean}> {
  // Find user in database
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get existing session ID or generate a new one
  let sessionId = user.sessionId;
  let isNew = false;
  
  // If no session ID exists or we need a new one, generate it
  if (!sessionId) {
    // Generate new session ID
    sessionId = uuidv4();
    
    // Save session ID to user record
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionId }
    });
    isNew = true;
    console.log(`[${new Date().toISOString()}] Generated new session ID: ${sessionId}`);
  } else {
    console.log(`[${new Date().toISOString()}] Using existing session ID: ${sessionId}`);
  }
  
  // Initialize session data if it doesn't exist
  if (!sessions[sessionId]) {
    const now = new Date();
    sessions[sessionId] = {
      userId: user.id,
      route: [],
      startTime: now,
      endTime: null,
      totalDistance: 0,
      steps: 0,
      abandoned: false,
      lastActivity: now
    };
  } else {
    // Update lastActivity timestamp
    sessions[sessionId].lastActivity = new Date();
    
    // Clear the abandoned flag if it was set
    if (sessions[sessionId].abandoned) {
      console.log(`[${new Date().toISOString()}] Resuming previously abandoned session ${sessionId}`);
      sessions[sessionId].abandoned = false;
    }
  }
  
  return { sessionId, isNew };
}

// Socket.IO Authentication middleware
export const authMiddleware = async (socket: Socket, next: any) => {
  const token = socket.handshake.auth.token;
  
  console.log('Socket auth middleware received token:', !!token);
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    console.log('JWT decoded payload:', decoded);
    
    // Ensure userId is available from the token
    if (!decoded.userId) {
      return next(new Error('Invalid token format - missing userId'));
    }
    
    socket.data.userId = decoded.userId;
    console.log('Set socket.data.userId:', socket.data.userId);
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Invalid or expired token'));
  }
};

// Add a user connections tracking map to manage sockets by userId
const userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Add socket to user connections
const addUserConnection = (userId: string, socketId: string) => {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)?.add(socketId);
  console.log(`[${new Date().toISOString()}] Added socket ${socketId} to user ${userId}`);
  console.log(`[${new Date().toISOString()}] User ${userId} now has ${userConnections.get(userId)?.size} connections`);
};

// Remove socket from user connections
const removeUserConnection = (userId: string, socketId: string) => {
  if (userConnections.has(userId)) {
    userConnections.get(userId)?.delete(socketId);
    console.log(`[${new Date().toISOString()}] Removed socket ${socketId} from user ${userId}`);
    
    // Clean up if no more connections
    if (userConnections.get(userId)?.size === 0) {
      userConnections.delete(userId);
      console.log(`[${new Date().toISOString()}] Removed user ${userId} from connections map (no active connections)`);
    } else {
      console.log(`[${new Date().toISOString()}] User ${userId} still has ${userConnections.get(userId)?.size} connections`);
    }
  }
};

// Get all active socket IDs for a user
const getUserSocketIds = (userId: string): string[] => {
  return [...(userConnections.get(userId) || [])];
};

// Update the setupSocketHandlers function to track connections
export const setupSocketHandlers = (io: Server) => {
  console.log(`[${new Date().toISOString()}] Setting up WebSocket event handlers...`);
  
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    
    console.log(`[${new Date().toISOString()}] Client ${socket.id} connected from ${socket.handshake.address}`);
    console.log(`[${new Date().toISOString()}] Total connections: ${io.engine.clientsCount}`);
    
    // Track user connection
    if (userId) {
      addUserConnection(userId, socket.id);
    }
    
    // Handle disconnection and clean up resources
    socket.on('disconnect', (reason) => {
      console.log(`[${new Date().toISOString()}] Client ${socket.id} disconnected, reason: ${reason}`);
      
      // Clean up user connection tracking
      if (userId) {
        removeUserConnection(userId, socket.id);
        
        // Clean up any sessions if this was the last connection
        if (!getUserSocketIds(userId).length) {
          // Get active session for this user
          Object.entries(sessions).forEach(([sessionId, session]) => {
            if (session.userId === userId && !session.endTime) {
              console.log(`[${new Date().toISOString()}] User ${userId} disconnected with active session ${sessionId}, marking as abandoned`);
              
              // Mark session as abandoned but don't delete it yet
              session.abandoned = true;
            }
          });
        }
      }
      
      console.log(`[${new Date().toISOString()}] Total connections after disconnect: ${io.engine.clientsCount}`);
    });
    
    socket.on('start_tracking', async (data) => {
      try {
        console.log(`[${new Date().toISOString()}] Start tracking request from socket ${socket.id}`);
        const userId = socket.data.userId;
        
        if (!userId) {
          console.error(`[${new Date().toISOString()}] No userId found for socket ${socket.id}`);
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        console.log(`[${new Date().toISOString()}] Getting session for user ${userId}`);
        
        // Get or create a session
        const { sessionId, isNew } = await getOrCreateSession(userId);
        
        console.log(`[${new Date().toISOString()}] User ${userId} started tracking. Session: ${sessionId} (new: ${isNew})`);
        console.log(`[${new Date().toISOString()}] Active sessions: ${Object.keys(sessions).join(', ') || 'none'}`);
        
        // Create a new PloggingSession in the database when the session starts
        if (isNew) {
          console.log(`[${new Date().toISOString()}] Creating new PloggingSession record for sessionId: ${sessionId}`);
          try {
            // Create a new PloggingSession record with initial data
            await prisma.ploggingSession.create({
              data: {
                sessionId,
                userId,
                startTime: sessions[sessionId].startTime,
                endTime: null, // Will be updated when session ends
                elapsedTime: 0, // Will be updated when session ends
                routes: [], // Will be updated as the user moves
                distancesTravelled: 0, // Will be updated as the user moves
                steps: 0, // Will be updated as the user moves
                litterCollected: {}, // Will be updated as the user collects litter
                points: 0 // Will be updated when session ends
              }
            });
            console.log(`[${new Date().toISOString()}] Created new PloggingSession record for sessionId: ${sessionId}`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Error creating PloggingSession:`, error);
            // Continue anyway as we can update the session later
          }
        }
        
        // Send session ID back to client
        console.log(`[${new Date().toISOString()}] Emitting session_id event with sessionId: ${sessionId} to socket ${socket.id}`);
        socket.emit('session_id', { sessionId });
        
        // Verify the event was sent
        console.log(`[${new Date().toISOString()}] session_id event emitted, checking socket status: connected=${socket.connected}`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error starting tracking:`, error);
        socket.emit('error', { message: 'Failed to start tracking' });
      }
    });
    
    socket.on('location_update', async (data) => {
      console.log("-------------------------------------");
      console.log(`Location update received from socket ${socket.id}:`);
      console.log(`User ID: ${socket.data.userId}`);
      console.log("Data:", JSON.stringify(data, null, 2));
      console.log("Current active sessions:", Object.keys(sessions));
      
      const sessionId = data.sessionId;
      const latitude = data.latitude;
      const longitude = data.longitude;
      const timestamp = data.timestamp;
      
      if (!sessionId) {
        console.error('Location update missing sessionId');
        socket.emit('error', { message: 'Session ID is required' });
        return;
      }
      
      // Validate that the sessionId is valid (not a stale reference)
      if (sessionId && !sessions[sessionId]) {
        console.log(`Session ${sessionId} not found in memory`);
        
        // Check if this client has another active session
        const userId = socket.data.userId;
        if (!userId) {
          console.error('User not authenticated');
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        // Check for any active sessions for this user
        const userSessions = Object.entries(sessions).filter(([_, session]) => session.userId === userId);
        
        if (userSessions.length > 0) {
          // User has another active session, notify client to reset state
          const [activeSessionId, _] = userSessions[0];
          console.log(`User ${userId} has another active session ${activeSessionId}`);
          socket.emit('error', { 
            message: 'Stale session ID, please restart tracking',
            code: 'STALE_SESSION' 
          });
          return;
        }
      }
      
      try {
        // Handle missing session gracefully
        if (!sessions[sessionId]) {
          console.log(`Session ${sessionId} not found, attempting to recreate...`);
          
          // Try to get the user ID from socket data
          const userId = socket.data.userId;
          if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }
          
          // Check if the session belongs to this user in the database
          const user = await prisma.user.findUnique({
            where: { id: userId }
          });
          
          if (!user || user.sessionId !== sessionId) {
            console.log(`User ${userId} does not have session ${sessionId} in database`);
            socket.emit('error', { 
              message: 'Invalid session ID, please restart tracking',
              code: 'INVALID_SESSION'
            });
            return;
          }
          
          // Session exists in database but not in memory - recreate it
          const now = new Date();
          sessions[sessionId] = {
            userId: user.id,
            route: [],
            startTime: now,
            endTime: null,
            totalDistance: 0,
            steps: 0,
            abandoned: false,
            lastActivity: now
          };
          
          console.log(`Recreated session ${sessionId} for user ${userId}`);
        }
        
        if (latitude === undefined || longitude === undefined) {
          socket.emit('error', { message: 'Latitude and longitude are required' });
          return;
        }
        
        const session = sessions[sessionId];
        
        // Add location to route
        const locationPoint = {
          latitude,
          longitude,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        };
        
        session.route.push(locationPoint);
        
        // Update total distance
        if (session.route.length > 1) {
          const prevLocation = session.route[session.route.length - 2];
          const distance = haversineDistance(
            latitude, longitude,
            prevLocation.latitude, prevLocation.longitude
          );
          session.totalDistance += distance;
          
          // Estimate steps based on distance (approximately 0.8m per step)
          session.steps += Math.floor(distance / 0.8);
          
          console.log(`Location update for session ${sessionId}: ${latitude}, ${longitude}. Distance: +${distance.toFixed(2)}m, Total: ${session.totalDistance.toFixed(2)}m`);
        } else {
          console.log(`First location recorded for session ${sessionId}: ${latitude}, ${longitude}`);
        }
        
        // After processing the location update, update the lastActivity timestamp
        if (sessions[sessionId]) {
          sessions[sessionId].lastActivity = new Date();
        }
        
      } catch (error) {
        console.error('Error processing location update:', error);
        socket.emit('error', { message: `Failed to update location: ${error}` });
      }
    });
    
    socket.on('finish_tracking', async (data) => {
      const sessionId = data.sessionId;
      const clientMetrics = data.metrics || { litters: 0, points: 0 };
      
      console.log(`Finish tracking received for session ${sessionId}`, { clientMetrics });
      console.log(`Active sessions before finish: ${Object.keys(sessions)}`);
      
      if (!sessionId) {
        console.error('Session ID is required for finish_tracking');
        socket.emit('error', { message: 'Session ID is required' });
        return;
      }
      
      if (!sessions[sessionId]) {
        console.error(`Session ${sessionId} not found in memory for finish_tracking`);
        socket.emit('error', { message: 'Invalid session ID' });
        return;
      }
      
      try {
        // Set end time
        sessions[sessionId].endTime = new Date();
        
        const session = sessions[sessionId];
        
        // Ensure endTime is not null (for TypeScript)
        if (!session.endTime) {
          session.endTime = new Date();
        }
        
        // Save session to database
        const userId = session.userId;
        
        // Use the client-side metrics if provided
        const initialLitterData = clientMetrics.litters > 0 ? 
          { litters: clientMetrics.litters } : 
          {};
        
        // Calculate session duration
        const elapsedTime = Math.floor(((session.endTime || new Date()).getTime() - session.startTime.getTime()) / 1000);
          
        // Update the existing PloggingSession in the database instead of creating a new one
        const ploggingSession = await prisma.ploggingSession.update({
          where: {
            sessionId: sessionId,
          },
          data: {
            endTime: session.endTime || new Date(), // Use current date if endTime is null
            elapsedTime: elapsedTime,
            routes: session.route,
            distancesTravelled: session.totalDistance,
            steps: session.steps,
            litterCollected: initialLitterData, // Use client metrics
            points: clientMetrics.points || 0
          }
        });
        
        // Get user's current litter data
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { collectedLitters: true }
        });
        
        // Prepare data for user update
        const pointsToAdd = clientMetrics.points || 0;
        const littersToAdd = clientMetrics.litters || 0;
        
        let updatedLitterCollection = user?.collectedLitters ? 
          (typeof user.collectedLitters === 'string' ? 
            JSON.parse(user.collectedLitters as string) : 
            user.collectedLitters as Record<string, number>) : 
          {};
        
        // If we have detailed litter data, update the user's collection
        if (clientMetrics.litterDetails) {
          for (const [litterType, count] of Object.entries(clientMetrics.litterDetails)) {
            updatedLitterCollection[litterType] = (updatedLitterCollection[litterType] || 0) + (count as number);
          }
          console.log(`Using client-provided litter details: ${JSON.stringify(clientMetrics.litterDetails)}`);
        } else if (littersToAdd > 0) {
          // Just add a generic "litter" entry if we only have a count
          updatedLitterCollection.litter = (updatedLitterCollection.litter || 0) + littersToAdd;
        }
        
        console.log(`Transferring ${littersToAdd} litters and ${pointsToAdd} points from session to user totals`);
        
        // Update user metrics
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalSteps: { increment: session.steps },
            totalDistance: { increment: session.totalDistance },
            totalTime: { 
              increment: elapsedTime
            },
            totalPoints: { increment: pointsToAdd },
            totalLitters: { increment: littersToAdd },
            collectedLitters: updatedLitterCollection,
            sessionId: null  // Remove session ID
          }
        });
        
        // Calculate metrics
        const durationSeconds = elapsedTime;
        const distanceKm = session.totalDistance / 1000;
        const steps = session.steps;
        
        // Clean up session
        console.log(`Deleting session ${sessionId} from active sessions`);
        delete sessions[sessionId];
        
        console.log(`Session ${sessionId} completed and saved to database.`);
        console.log(`Active sessions after finish: ${Object.keys(sessions)}`);
        
        // Send completion response with metrics
        socket.emit('tracking_completed', {
          message: 'Tracking session completed successfully',
          duration: durationSeconds,
          distance: distanceKm,
          steps,
          litters: littersToAdd,
          points: pointsToAdd,
          session_id: ploggingSession.id
        });
        
      } catch (error) {
        console.error('Error finishing tracking:', error);
        
        // Even if there's an error processing the session, try to clear the user's sessionId
        try {
          if (sessions[sessionId] && sessions[sessionId].userId) {
            const userId = sessions[sessionId].userId;
            console.log(`Attempting to clear sessionId for user ${userId} despite error`);
            
            await prisma.user.update({
              where: { id: userId },
              data: { sessionId: null }
            });
            
            console.log(`Successfully cleared sessionId for user ${userId}`);
            
            // Also clean up the in-memory session
            console.log(`Deleting session ${sessionId} from active sessions despite error`);
            delete sessions[sessionId];
          }
        } catch (clearError) {
          console.error('Failed to clear sessionId after error:', clearError);
        }
        
        socket.emit('error', { message: 'Failed to complete tracking session' });
      }
    });
    
    // For backward compatibility
    socket.on('authenticate', (data) => {
      console.log('Received legacy authenticate event, redirecting to start_tracking');
      socket.emit('start_tracking', data);
    });
    
    socket.on('start_time', (data) => {
      const sessionId = data.sessionId;
      if (sessionId && sessions[sessionId]) {
        console.log(`Received legacy start_time event for session ${sessionId}`);
        socket.emit('time_started', { startTime: sessions[sessionId].startTime.getTime() });
      } else {
        socket.emit('error', { message: 'Session not found' });
      }
    });
    
    socket.on('end_time', (data) => {
      console.log('Received legacy end_time event, redirecting to finish_tracking');
      socket.emit('finish_tracking', data);
    });
    
    // Add a new socket handler for retrieving the current session ID
    socket.on('get_session_id', async () => {
      try {
        const userId = socket.data.userId;
        
        if (!userId) {
          console.error(`[${new Date().toISOString()}] No userId found for get_session_id request`);
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        console.log(`[${new Date().toISOString()}] Getting session ID for user ${userId}`);
        
        // Try to find the user's current session
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!user || !user.sessionId) {
          console.error(`[${new Date().toISOString()}] No active session found for user ${userId}`);
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const sessionId = user.sessionId;
        
        // Check if the session exists in memory
        if (!sessions[sessionId]) {
          console.log(`[${new Date().toISOString()}] Session ${sessionId} not in memory, recreating...`);
          
          // Create it in memory
          const now = new Date();
          sessions[sessionId] = {
            userId,
            route: [],
            startTime: now,
            endTime: null,
            totalDistance: 0,
            steps: 0,
            abandoned: false,
            lastActivity: now
          };
        }
        
        console.log(`[${new Date().toISOString()}] Sending session ID ${sessionId} to client ${socket.id}`);
        socket.emit('session_id', { sessionId });
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in get_session_id:`, error);
        socket.emit('error', { message: 'Failed to retrieve session ID' });
      }
    });
  });
  
  // Add a periodic cleanup for abandoned sessions
  setInterval(async () => {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of Object.entries(sessions)) {
      // If session is marked as abandoned or has been inactive for 30 minutes
      if (session.abandoned || 
          (!session.endTime && (now.getTime() - session.lastActivity.getTime()) > 30 * 60 * 1000)) {
        
        console.log(`[${new Date().toISOString()}] Cleaning up abandoned/inactive session ${sessionId} for user ${session.userId}`);
        
        // Set end time if not already set
        if (!session.endTime) {
          session.endTime = new Date();
          
          // Try to save to database if possible
          try {
            // Calculate session duration
            const elapsedTime = Math.floor(((session.endTime || new Date()).getTime() - session.startTime.getTime()) / 1000);
            
            // Find and update the existing PloggingSession record
            let ploggingSession;
            try {
              // Try to update the existing record
              ploggingSession = await prisma.ploggingSession.update({
                where: {
                  sessionId: sessionId,
                },
                data: {
                  endTime: session.endTime || new Date(),
                  elapsedTime: elapsedTime,
                  routes: session.route,
                  distancesTravelled: session.totalDistance,
                  steps: session.steps,
                  litterCollected: {} // Initialize with empty object
                }
              });
              
              console.log(`[${new Date().toISOString()}] Updated abandoned PloggingSession record ${sessionId}`);
            } catch (error) {
              // If update fails, the record might not exist yet, so create it
              console.log(`[${new Date().toISOString()}] Failed to update PloggingSession, creating new record`);
              ploggingSession = await prisma.ploggingSession.create({
                data: {
                  sessionId,
                  userId: session.userId,
                  startTime: session.startTime,
                  endTime: session.endTime || new Date(),
                  elapsedTime: elapsedTime,
                  routes: session.route,
                  distancesTravelled: session.totalDistance,
                  steps: session.steps,
                  litterCollected: {} // Initialize with empty object
                }
              });
              console.log(`[${new Date().toISOString()}] Created new PloggingSession record for abandoned session ${sessionId}`);
            }
            
            // Get any litter data collected during this session
            const sessionFromDB = await prisma.ploggingSession.findUnique({
              where: { sessionId },
              select: { litterCollected: true, points: true }
            });
            
            // Get user's current litter data
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { collectedLitters: true }
            });
            
            // Prepare data for user update
            const pointsToAdd = sessionFromDB?.points || 0;
            const littersToAdd = sessionFromDB?.litterCollected ? 
              Object.keys(sessionFromDB.litterCollected).length : 0;
            
            let updatedLitterCollection = user?.collectedLitters ? 
              (typeof user.collectedLitters === 'string' ? 
                JSON.parse(user.collectedLitters as string) : 
                user.collectedLitters as Record<string, number>) : 
              {};
            
            // Process litter data if available
            if (sessionFromDB?.litterCollected) {
              const sessionLitter = typeof sessionFromDB.litterCollected === 'string'
                ? JSON.parse(sessionFromDB.litterCollected as string)
                : sessionFromDB.litterCollected as Record<string, number>;
              
              // Add session litter to user's total
              for (const [litterType, count] of Object.entries(sessionLitter)) {
                updatedLitterCollection[litterType] = (updatedLitterCollection[litterType] || 0) + (count as number);
              }
            }
            
            console.log(`Transferring ${littersToAdd} litters and ${pointsToAdd} points from abandoned session to user totals`);
            
            // Update user record to clear session ID
            await prisma.user.update({
              where: { id: session.userId },
              data: {
                sessionId: null,
                totalPoints: { increment: pointsToAdd },
                totalLitters: { increment: littersToAdd },
                collectedLitters: updatedLitterCollection
              }
            });
            
            console.log(`[${new Date().toISOString()}] Saved abandoned session ${sessionId} to database`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Error saving abandoned session:`, error);
            
            // Even if there's an error processing the abandoned session, try to clear the user's sessionId
            try {
              console.log(`[${new Date().toISOString()}] Attempting to clear sessionId for user ${session.userId} despite error`);
              
              await prisma.user.update({
                where: { id: session.userId },
                data: { sessionId: null }
              });
              
              console.log(`[${new Date().toISOString()}] Successfully cleared sessionId for user ${session.userId}`);
            } catch (clearError) {
              console.error(`[${new Date().toISOString()}] Failed to clear sessionId after error:`, clearError);
            }
          }
        }
        
        // Remove from active sessions
        delete sessions[sessionId];
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[${new Date().toISOString()}] Cleaned up ${cleanedCount} abandoned/inactive sessions`);
      console.log(`[${new Date().toISOString()}] Remaining active sessions: ${Object.keys(sessions).length}`);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
  
  console.log(`[${new Date().toISOString()}] WebSocket event handlers setup complete`);
};

// Export the initWebSocketServer function that should be called from server.ts
export const initWebSocketServer = (server: HttpServer) => {
  console.log(`[${new Date().toISOString()}] Initializing WebSocket server...`);
  
  // Create Socket.IO server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    connectTimeout: 10000,
  });

  console.log(`[${new Date().toISOString()}] Socket.IO server created`);

  // Apply authentication middleware
  io.use(authMiddleware);
  console.log(`[${new Date().toISOString()}] Authentication middleware applied`);
  
  // Set up socket handlers
  setupSocketHandlers(io);
  console.log(`[${new Date().toISOString()}] WebSocket server initialization complete`);
  
  return io;
};
