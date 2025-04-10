import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import haversine from 'haversine';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTracking } from '../context/TrackingContext';

// Define the navigation type
type RootStackParamList = {
  Home: undefined;
  Tracking: undefined;
  Camera: undefined;
  SessionSummary: {
    sessionId?: string;
    duration: number;
    distance: number;
    steps: number;
  };
};

type TrackingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Tracking'>;

// Define interfaces for location data
interface LocationData {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export default function Tracking() {
  const navigation = useNavigation<TrackingScreenNavigationProp>();
  const { 
    isTracking, 
    isPaused, 
    startTracking, 
    stopTracking, 
    togglePause, 
    sendLocationUpdate,
    wsConnected 
  } = useTracking();
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Timer for updating elapsed time
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get location permissions and initial location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }

      // Get initial location
      try {
        const location = await Location.getCurrentPositionAsync({});
        const initialLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setLocation(initialLocation);
        setMapRegion({
          ...mapRegion,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude
        });
      } catch (error) {
        console.log("Error getting initial location:", error);
      }
    })();

    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Clear location subscription
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Update current time when tracking
  useEffect(() => {
    if (isTracking && !isPaused && startTime) {
      timerRef.current = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTracking, isPaused, startTime]);

  // Effect to handle location tracking
  useEffect(() => {
    const startLocationTracking = async () => {
      if (isTracking) {
        // Set start time
        const now = Date.now();
        setStartTime(now);
        setCurrentTime(now);
        setEndTime(null);
        
        // Reset tracking data if not paused
        if (!isPaused) {
          setTotalSteps(0);
          setTotalDistance(0);
        }

        // Get current location and start tracking
        const currentLocation = await Location.getCurrentPositionAsync({});
        const locationData = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        };
        
        setLocation(locationData);
        
        // Center map on current location
        setMapRegion({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Start watching location
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // Update every second
            distanceInterval: 1, // Update every 1 meter
          },
          (newLocation) => {
            const coords = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              timestamp: newLocation.timestamp
            };
            
            setLocation(coords);

            // Calculate distance from previous location
            if (location && !isPaused) {
              const distance = calculateDistance(
                { lat: location.latitude, lon: location.longitude },
                { lat: coords.latitude, lon: coords.longitude }
              );
              
              if (distance > 0.1) { // Filter out tiny movements (likely GPS noise)
                setTotalDistance(prevDistance => prevDistance + distance);
                // Assuming 1 step is approximately 0.8 meters
                const newSteps = Math.floor(distance / 0.8);
                setTotalSteps(prevSteps => prevSteps + newSteps);
              }
            }

            // Send location to WebSocket server (now through context)
            if (!isPaused) {
              sendLocationUpdate(
                coords.latitude,
                coords.longitude,
                coords.timestamp || Date.now()
              );
            }
          }
        );

        setLocationSubscription(subscription);
      } else {
        // Stop tracking
        if (locationSubscription) {
          locationSubscription.remove();
          setLocationSubscription(null);
        }
        
        if (endTime === null) {
          setEndTime(Date.now());
        }
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isTracking]);

  // Effect to handle screen focus/unfocus without stopping tracking
  useFocusEffect(
    React.useCallback(() => {
      console.log("Tracking screen is focused");
      return () => {
        console.log("Tracking screen is unfocused");
        // We don't stop tracking when navigating away
      };
    }, [])
  );

  const toggleTracking = async () => {
    if (isTracking) {
      // Calculate total session duration before stopping
      const sessionDuration = currentTime && startTime ? Math.floor((currentTime - startTime) / 1000) : 0;
      
      // Stop tracking - this will trigger the tracking_completed event
      // which will navigate to the summary screen via TrackingContext
      stopTracking();
      // Reset local state
      setEndTime(Date.now());
      console.log('Navigating to SessionSummary');
      //navigation.navigate('SessionSummary');
    } else {
      startTracking();
    }
  };

  const navigateToCamera = () => {
    // Make sure we're only navigating to Camera when tracking is active
    navigation.navigate('Camera');
  };

  const calculateDistance = (start: { lat: number; lon: number }, end: { lat: number; lon: number }): number => {
    return haversine(start, end, { unit: 'meter' });
  };

  const formatTime = (startTimeMs: number | null, currentTimeMs: number | null): string => {
    if (!startTimeMs || !currentTimeMs) return "00:00:00";
    
    const elapsedMs = currentTimeMs - startTimeMs;
    const seconds = Math.floor((elapsedMs / 1000) % 60);
    const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Add a connection status banner component
  const ConnectionStatusBanner = () => {
    if (!isTracking) return null;
    
    if (wsConnected) {
      return (
        <View style={[
          styles.connectionIndicator, 
          { backgroundColor: '#4CAF50' }
        ]}>
          <Text style={styles.connectionText}>Connected</Text>
        </View>
      );
    } else {
      return (
        <View style={[
          styles.connectionIndicator, 
          { backgroundColor: '#F44336' }
        ]}>
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      );
    }
  };

  // Add a reconnection banner when tracking is paused due to connection loss
  const ReconnectionBanner = () => {
    if (isTracking && isPaused && !wsConnected) {
      return (
        <View style={styles.reconnectionBanner}>
          <Ionicons name="wifi-outline" size={20} color="#FFF" />
          <Text style={styles.reconnectionText}>
            Connection lost. Tracking paused. Reconnecting...
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
      >
        {location && <Marker coordinate={location} title="You" />}
      </MapView>
      
      {/* Connection Status Indicator */}
      <ConnectionStatusBanner />
      
      {/* Reconnection Banner */}
      <ReconnectionBanner />
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>
            {formatTime(startTime, currentTime)}
          </Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>
            {(totalDistance / 1000).toFixed(2)} km
          </Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Steps</Text>
          <Text style={styles.statValue}>{totalSteps}</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        {isTracking ? (
          <>
            <TouchableOpacity 
              style={[
                styles.button, 
                isPaused ? styles.resumeButton : styles.pauseButton,
                !wsConnected && styles.disabledButton
              ]} 
              onPress={togglePause}
              disabled={!wsConnected && isPaused} // Disable resume button when disconnected
            >
              <Text style={styles.buttonText}>
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.finishButton]} 
              onPress={toggleTracking}
            >
              <Text style={styles.buttonText}>Finish</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.cameraButton,
                (!isTracking || !wsConnected) && styles.disabledButton
              ]} 
              onPress={navigateToCamera}
              disabled={!isTracking || !wsConnected} // Disable camera when disconnected
            >
              <Ionicons 
                name="camera" 
                size={24} 
                color={(isTracking && wsConnected) ? "#fff" : "#ccc"} 
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.startButton]} 
            onPress={toggleTracking}
          >
            <Text style={styles.buttonText}>Start Tracking</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Add bottom padding to avoid tab bar overlap */}
      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  map: {
    flex: 1,
    marginTop: 0, // No header gap needed
  },
  connectionIndicator: {
    position: 'absolute',
    top: 10, 
    right: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  pauseButton: {
    backgroundColor: "#FF9800",
  },
  resumeButton: {
    backgroundColor: "#4CAF50",
  },
  finishButton: {
    backgroundColor: "#F44336",
  },
  cameraButton: {
    flex: 0.5,
    backgroundColor: "#2196F3",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  // Bottom spacing
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 80 : 80, // Extra padding at the bottom
  },
  reconnectionBanner: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconnectionText: {
    color: '#FFF',
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
