import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '../config/env';
import { useAuth } from './AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define interfaces for Socket.IO events
interface SessionIdEvent {
  sessionId: string;
}

interface ErrorEvent {
  message: string;
  code?: string;
}

interface TrackingCompletedEvent {
  message: string;
  duration: number;
  distance: number;
  steps: number;
  litters?: number;
  points?: number;
  session_id: string;
}

interface TrackingContextProps {
  isTracking: boolean;
  sessionId: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  isPaused: boolean;
  togglePause: () => void;
  sendLocationUpdate: (latitude: number, longitude: number, timestamp: number) => void;
  wsConnected: boolean;
  metrics: {
    distance: number;
    duration: number;
    steps: number;
    litters: number;
    points: number;
    litterDetails: Record<string, number>;
  };
  updateMetrics: (newMetrics: {litters?: number, points?: number, litterDetails?: Record<string, number>}) => void;
  ensureSocketConnection: () => Promise<boolean>;
}

const TrackingContext = createContext<TrackingContextProps | undefined>(undefined);

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};

interface TrackingProviderProps {
  children: ReactNode;
}

// Define RootStackParamList for navigation
type RootStackParamList = {
  MainTabs: undefined;
  Camera: undefined;
  SessionSummary: undefined;
  Tracking: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const TrackingProvider: React.FC<TrackingProviderProps> = ({ children }) => {
  const auth = useAuth();
  const { getToken } = auth;
  const authState = auth.authState || { token: null };
  
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({
    distance: 0,
    duration: 0,
    steps: 0,
    litters: 0,
    points: 0,
    litterDetails: {} as Record<string, number>
  });
  const [routeData, setRouteData] = useState<Array<{latitude: number; longitude: number; timestamp: Date}>>([]);
  
  // Socket.IO reference
  const socketRef = useRef<Socket | null>(null);

  // Add a ref to track if the user manually paused
  const wasManuallyPaused = useRef<boolean>(false);

  // Add a cleanup function for better socket disconnection
  const cleanupSocketConnection = () => {
    console.log('Cleaning up socket connection...');
    
    if (socketRef.current) {
      // Remove all listeners to prevent memory leaks
      if (socketRef.current.hasListeners('connect')) socketRef.current.off('connect');
      if (socketRef.current.hasListeners('disconnect')) socketRef.current.off('disconnect');
      if (socketRef.current.hasListeners('connect_error')) socketRef.current.off('connect_error');
      if (socketRef.current.hasListeners('session_id')) socketRef.current.off('session_id');
      if (socketRef.current.hasListeners('error')) socketRef.current.off('error');
      if (socketRef.current.hasListeners('tracking_completed')) socketRef.current.off('tracking_completed');
      
      // Force disconnect
      if (socketRef.current.connected) {
        console.log('Disconnecting active socket...');
        socketRef.current.disconnect();
      }
      
      // Clear the reference
      socketRef.current = null;
    }
    
    // Reset connection state
    setWsConnected(false);
  };
  
  // Define initSocket function outside of useEffect so it can be referenced elsewhere
  const initSocket = async () => {
    // Clean up any existing connection first
    cleanupSocketConnection();
    
    // Get JWT token first
    let token = null;
    if (getToken) {
      token = await getToken();
    }

    if (!token) {
      console.log('No authentication token available for socket connection');
      return;
    }

    // Initialize socket with auth token in handshake
    socketRef.current = io(WEBSOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: {
        token: token
      }
    });

    // Set up event listeners
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setWsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setWsConnected(false);
    });

    socket.on('connect_error', (error: Error) => {
      console.log('Socket.IO connection error:', error);
      setWsConnected(false);
    });

    socket.on('session_id', (data: SessionIdEvent) => {
      console.log('Received session ID:', data.sessionId);
      setSessionId(data.sessionId);
    });

    socket.on('error', (data: ErrorEvent) => {
      console.log('Socket.IO error:', data.message, data.code);
      
      // Handle special error codes
      if (data.code === 'STALE_SESSION' || data.code === 'INVALID_SESSION') {
        console.log('Received session error, resetting tracking state');
        setSessionId(null);
        setIsTracking(false);
        setIsPaused(false);
        setRouteData([]);
        // Note: Not resetting metrics so they remain visible
        
        // Alert the user
        // In a real app, you might want to use a toast or other UI notification
        alert(data.message);
      }
    });

    socket.on('tracking_completed', (data: TrackingCompletedEvent) => {
      console.log('Tracking completed:', data);
      
      // Update metrics with session data but preserve litter and points data

      // Make sure sessionId is cleared when tracking is completed
      console.log(`Resetting sessionId in tracking_completed handler`);
      setSessionId(null);

      // Reset route data after tracking is completed
      setRouteData([]);
      
      // Disconnect socket after a short delay to ensure the tracking_completed event is fully processed
      setTimeout(() => {
        console.log('Disconnecting socket after tracking completed');
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      }, 1000);
    });

    socket.connect();
    return socket;
  };

  // Update the useEffect to use the defined initSocket function
  useEffect(() => {
    initSocket();

    // Clean up when component unmounts or dependencies change
    return () => {
      cleanupSocketConnection();
    };
  }, [getToken, authState.token]);

  // Update the startTracking function to properly handle sessionId state
  const startTracking = async () => {
    if (!isTracking) {
      try {
        console.log('Starting tracking...');
        
        // Reset tracking state before starting
        setRouteData([]);
        
        // Reset metrics when starting a new session
        setMetrics({
          distance: 0,
          duration: 0,
          steps: 0,
          litters: 0,
          points: 0,
          litterDetails: {}
        });
        
        // Ensure we have a clean, connected socket
        const socket = socketRef.current;
        if (!socket) {
          console.error('No socket reference, attempting to create one');
          await initSocket();
          
          // Wait a moment for connection to establish
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!socketRef.current || !socketRef.current.connected) {
            console.error('Failed to establish socket connection');
            alert('Could not connect to the server. Please try again.');
            return;
          }
        } else if (!socket.connected) {
          console.log('Socket exists but not connected, reconnecting...');
          // Disconnect and reconnect to ensure a clean state
          socket.disconnect();
          socket.connect();
          
          // Wait for connection to establish
          const connected = await new Promise<boolean>(resolve => {
            const timeout = setTimeout(() => resolve(false), 5000);
            socket.once('connect', () => {
              clearTimeout(timeout);
              resolve(true);
            });
          });
          
          if (!connected) {
            console.error('Failed to connect socket');
            alert('Could not connect to the server. Please check your internet connection and try again.');
            return;
          }
        }
        
        // Mark as tracking right away to show UI feedback
        setIsTracking(true);
        setIsPaused(false);
        
        // Now we should have a connected socket
        console.log('Socket connected, emitting start_tracking event');
        if (socketRef.current) {
          socketRef.current.emit('start_tracking', {});
        } else {
          console.error('Socket reference is null, cannot start tracking');
          setIsTracking(false);
          alert('Could not connect to the server. Please try again.');
          return null;
        }
        
        // Wait for session ID with a single attempt but longer timeout
        console.log('Waiting for session_id event...');
        
        // Use a local variable to store the sessionId temporarily
        let receivedSessionId: string | null = null;
        
        try {
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.error('Timeout waiting for session_id event');
              reject(new Error('Session ID timeout'));
            }, 10000); // 10 second timeout
            
            socketRef.current?.once('session_id', (data: SessionIdEvent) => {
              console.log('Received session ID:', data.sessionId);
              // Store the ID locally first, then update state
              receivedSessionId = data.sessionId;
              setSessionId(data.sessionId);
              clearTimeout(timeoutId);
              resolve();
            });
          });
        } catch (error) {
          console.error('Error waiting for session ID:', error);
          setIsTracking(false);
          alert('Failed to start tracking. Please try again.');
          return;
        }
        
        if (!receivedSessionId) {
          console.error('Did not receive session ID after timeout');
          setIsTracking(false);
          alert('Could not start tracking. Please try again.');
          return;
        }
        
        // Wait for React state to update
        console.log('Session ID received, ensuring state is updated...');
        
        // Force a small delay to ensure state updates before proceeding
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check that the sessionId got set correctly and use the local value if not
        if (!sessionId) {
          console.warn('sessionId state not updated yet, using local value:', receivedSessionId);
          // We'll use the local receivedSessionId for any immediate operations
        }
        
        console.log('Tracking started successfully with sessionId:', sessionId || receivedSessionId);
        
        // Return the sessionId so it can be used immediately if needed
        return receivedSessionId;
      } catch (error) {
        console.error('Error starting tracking:', error);
        setIsTracking(false);
        alert('An error occurred while starting tracking. Please try again.');
        return null;
      }
    }
    return null;
  };

  // Update the stopTracking function for better cleanup
  const stopTracking = () => {
    if (isTracking) {
      try {
        const socket = socketRef.current;
        const currentSessionId = sessionId; // Store for later reference in case state changes
        
        // Reset UI states immediately to improve perceived responsiveness
        setIsTracking(false);
        setIsPaused(false);
        
        // Reset route data but keep the metrics values for displaying
        setRouteData([]);
        
        // We do NOT reset metrics here anymore, to keep them displayed
        // until the next tracking session starts
        
        // If we don't have a socket, just clean up our local state
        if (!socket) {
          console.log('No socket reference, just cleaning up local state');
          setSessionId(null);
          return;
        }

        // Send finish_tracking event with current metrics
        if (currentSessionId) {
          console.log('Sending finish_tracking with metrics:', metrics);
          
          // Reset the sessionId immediately to prevent stale references
          console.log(`Resetting sessionId ${currentSessionId} in stopTracking`);
          setSessionId(null);
          
          socket.emit('finish_tracking', {
            sessionId: currentSessionId,
            metrics: {
              litters: metrics.litters,
              points: metrics.points,
              litterDetails: metrics.litterDetails || {}
            }
          });
        } else {
          console.log('No sessionId available, skipping finish_tracking call');
          setSessionId(null); // Ensure sessionId is null anyway
        }
        
        // Disconnect the socket after a delay to ensure events are processed
        setTimeout(() => {
          if (socket && socket.connected) {
            console.log('Disconnecting socket after tracking complete');
            socket.disconnect();
          }
        }, 2000);
      } catch (error) {
        console.error('Error stopping tracking:', error);
        // Make sure UI state is reset even if there's an error
        setIsTracking(false);
        setIsPaused(false);
        setSessionId(null);
        // Don't reset metrics on error
      }
    }
  };

  const togglePause = () => {
    // Track if this was a manual pause
    wasManuallyPaused.current = !isPaused;
    setIsPaused(!isPaused);
  };

  // Add auto-reset when socket is disconnected for too long
  useEffect(() => {
    let disconnectionTimer: NodeJS.Timeout | null = null;
    
    // If socket disconnects during active tracking, start a timer
    if (isTracking && !wsConnected) {
      console.log('Starting disconnection timer...');
      disconnectionTimer = setTimeout(() => {
        console.log('Socket disconnected for too long, resetting tracking state');
        // Reset tracking state after 30 seconds of disconnection
        setIsTracking(false);
        setSessionId(null);
        setIsPaused(false);
        setRouteData([]);
        // Note: We're not resetting metrics here to keep the values
        alert('Lost connection to the server. Your session has been ended.');
      }, 30000); // 30 seconds timeout
    }
    
    // Clear timer if connection is restored or tracking stops
    return () => {
      if (disconnectionTimer) {
        console.log('Clearing disconnection timer');
        clearTimeout(disconnectionTimer);
      }
    };
  }, [isTracking, wsConnected]);

  // Update the sendLocationUpdate function to handle potential null sessionId
  const sendLocationUpdate = (latitude: number, longitude: number, timestamp: number) => {
    console.log('sendLocationUpdate called with:', { latitude, longitude, timestamp });
    
    // Get the current sessionId from state
    const currentSessionId = sessionId;
    console.log('Current state:', { isTracking, isPaused, sessionId: currentSessionId, socketConnected: socketRef.current?.connected });
    
    if (isTracking && !isPaused) {
      // Check if we have a valid sessionId
      if (!currentSessionId) {
        console.warn('No sessionId available for location update, trying to retrieve from user record');
        
        // Try to get the session ID from the server if we don't have it locally
        (async () => {
          try {
            // Emit a special event to get the current session ID
            socketRef.current?.emit('get_session_id');
            
            // Wait for a response
            const retrievedId = await new Promise<string | null>((resolve) => {
              const timeout = setTimeout(() => resolve(null), 3000);
              
              socketRef.current?.once('session_id', (data: SessionIdEvent) => {
                clearTimeout(timeout);
                console.log('Retrieved session ID:', data.sessionId);
                setSessionId(data.sessionId);
                resolve(data.sessionId);
              });
            });
            
            if (retrievedId) {
              // Now try to send the location update with the retrieved ID
              trySendLocationUpdate(retrievedId, latitude, longitude, timestamp);
            } else {
              console.error('Failed to retrieve session ID for location update');
            }
          } catch (error) {
            console.error('Error retrieving session ID:', error);
          }
        })();
        
        return;
      }
      
      // We have a sessionId, so try to send the update
      trySendLocationUpdate(currentSessionId, latitude, longitude, timestamp);
    } else {
      console.log('Not sending location update because:', {
        isTracking,
        isPaused,
        hasSessionId: !!currentSessionId
      });
    }
  };

  // Helper function to actually send the location update
  const trySendLocationUpdate = (sessionId: string, latitude: number, longitude: number, timestamp: number) => {
    try {
      const socket = socketRef.current;
      if (!socket) {
        console.error('No socket reference available, cannot send location update');
        return;
      }
      
      if (!socket.connected) {
        console.error('Socket not connected, cannot send location update');
        
        // Try to reconnect on next update attempt
        ensureSocketConnection().then(connected => {
          if (connected) {
            console.log('Socket reconnected, next location update will be sent');
          }
        }).catch(error => {
          console.error('Error reconnecting socket:', error);
        });
        
        return;
      }

      console.log('Emitting location_update event with data:', {
        sessionId,
        latitude,
        longitude,
        timestamp
      });
      
      // Save the route point locally for the summary
      setRouteData(prevRoute => [
        ...prevRoute, 
        { latitude, longitude, timestamp: new Date(timestamp) }
      ]);
      
      socket.emit('location_update', {
        sessionId: sessionId,
        latitude: latitude,
        longitude: longitude,
        timestamp: timestamp
      });
    } catch (error) {
      console.error('Error sending location update:', error);
    }
  };

  // Improved socket connection management
  const ensureSocketConnection = async () => {
    console.log('Ensuring socket connection...');
    const socket = socketRef.current;
    
    // If there's no socket reference at all, initialize a new one
    if (!socket) {
      console.log('No socket reference, initializing new socket...');
      let token = null;
      if (getToken) {
        try {
          token = await getToken();
        } catch (error) {
          console.error('Error getting token:', error);
          return false;
        }
      }

      if (!token) {
        console.error('No authentication token available for socket connection');
        return false;
      }

      // Initialize socket with auth token in handshake
      try {
        socketRef.current = io(WEBSOCKET_URL, {
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          timeout: 15000,
          auth: {
            token: token
          }
        });
        
        // Set up event listeners
        const newSocket = socketRef.current;
        
        newSocket.on('connect', () => {
          console.log('Socket.IO connected');
          setWsConnected(true);
        });

        newSocket.on('disconnect', () => {
          console.log('Socket.IO disconnected');
          setWsConnected(false);
        });
        
        // Connect the new socket
        newSocket.connect();
        
        // Wait for connection with a longer timeout
        return new Promise<boolean>((resolve) => {
          const connectHandler = () => {
            console.log('New socket connected successfully');
            resolve(true);
          };
          
          newSocket.once('connect', connectHandler);
          
          // Add timeout
          setTimeout(() => {
            newSocket.off('connect', connectHandler);
            if (!newSocket.connected) {
              console.error('New socket connection timeout');
              // Try one more time before giving up
              newSocket.connect();
              setTimeout(() => {
                if (newSocket.connected) {
                  console.log('Connected on second attempt');
                  resolve(true);
                } else {
                  console.error('Failed to connect after retry');
                  resolve(false);
                }
              }, 5000);
            }
          }, 8000);
        });
      } catch (error) {
        console.error('Error initializing socket:', error);
        return false;
      }
    }
    
    // If socket exists but is not connected, reconnect it
    if (!socket.connected) {
      console.log('Socket exists but not connected, refreshing token and reconnecting...');
      
      // Get a fresh token in case the old one expired
      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            // Update socket auth
            socket.auth = { token };
          } else {
            console.error('Failed to get token for reconnection');
            return false;
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          return false;
        }
      }
      
      try {
        // Disconnect first to clear any stale state
        if (socket.disconnected) {
          socket.disconnect();
        }
        
        // Reconnect the socket with better error handling
        socket.connect();
        
        // Wait for connection with better timeout handling
        return new Promise<boolean>((resolve) => {
          const connectHandler = () => {
            console.log('Socket reconnected successfully');
            resolve(true);
          };
          
          socket.once('connect', connectHandler);
          
          // Add timeout with retry
          setTimeout(() => {
            if (!socket.connected) {
              socket.off('connect', connectHandler);
              console.log('Socket reconnection timeout, retrying once more...');
              
              // Try one more time
              socket.connect();
              
              setTimeout(() => {
                socket.off('connect', connectHandler);
                if (socket.connected) {
                  console.log('Socket connected on second attempt');
                  resolve(true);
                } else {
                  console.error('Socket reconnection failed after retry');
                  resolve(false);
                }
              }, 5000);
            }
          }, 8000);
        });
      } catch (error) {
        console.error('Error reconnecting socket:', error);
        return false;
      }
    }
    
    // Socket is already connected
    console.log('Socket is already connected');
    return true;
  };

  const updateMetrics = (newMetrics: {litters?: number, points?: number, litterDetails?: Record<string, number>}) => {
    setMetrics(prevMetrics => {
      // Calculate total litters from litterDetails if provided
      const totalLitters = newMetrics.litterDetails ? 
        Object.values(newMetrics.litterDetails).reduce((sum, count) => sum + count, 0) : 
        newMetrics.litters || 0;

      // Merge existing litterDetails with new ones
      const mergedLitterDetails = {
        ...prevMetrics.litterDetails,
        ...(newMetrics.litterDetails || {})
      };

      return {
        ...prevMetrics,
        litters: prevMetrics.litters + totalLitters,
        points: prevMetrics.points + (newMetrics.points || 0),
        litterDetails: mergedLitterDetails
      };
    });
  };

  const value = {
    isTracking,
    sessionId,
    startTracking,
    stopTracking,
    isPaused,
    togglePause,
    sendLocationUpdate,
    wsConnected,
    metrics,
    updateMetrics,
    ensureSocketConnection
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

// Default export for the TrackingProvider
export default TrackingProvider; 