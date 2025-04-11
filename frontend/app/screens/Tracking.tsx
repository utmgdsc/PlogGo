import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Animated } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import haversine from 'haversine';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTracking } from '../context/TrackingContext';

type RootStackParamList = {
  MainTabs: undefined;
  SessionSummary: undefined;
  Camera: undefined;
  Tracking: undefined;
};

type TrackingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;

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
    wsConnected,
    metrics
  } = useTracking();
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [showDetailedStats, setShowDetailedStats] = useState<boolean>(false);
  const detailedStatsHeight = useRef(new Animated.Value(0)).current;
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

  // Effect to sync metrics from context when they change
  useEffect(() => {
    if (isTracking) {
      // If tracking is already in progress, sync the steps and distance from metrics
      setTotalSteps(metrics.steps);
      setTotalDistance(metrics.distance * 1000); // Convert km to meters for internal state
    }
  }, [isTracking, metrics]);

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
      navigation.navigate('SessionSummary');
    } else {
      startTracking();
    }
  };

  const navigateToCamera = () => {
    // Make sure we're only navigating to Camera when tracking is active
    navigation.navigate('Camera');
  };

  const calculateDistance = (start: { lat: number; lon: number }, end: { lat: number; lon: number }): number => {
    return haversine(
      { latitude: start.lat, longitude: start.lon },
      { latitude: end.lat, longitude: end.lon },
      { unit: 'meter' }
    );
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

  const toggleDetailedStats = () => {
    const newValue = !showDetailedStats;
    setShowDetailedStats(newValue);
    
    Animated.timing(detailedStatsHeight, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Update the value display to show the metrics from context when tracking
  const displaySteps = isTracking ? metrics.steps : totalSteps;
  const displayDistance = isTracking ? metrics.distance : totalDistance / 1000;

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
      
      {/* Stats Container - Top of the screen */}
      <View style={styles.statsContainer}>
        {/* Main Stats (Time and Distance) - Always visible */}
        <View style={styles.mainStatsRow}>
          <View style={styles.mainStatBox}>
            <Text style={styles.mainStatLabel}>Time</Text>
            <Text style={styles.mainStatValue}>
              {formatTime(startTime, currentTime)}
            </Text>
          </View>
          
          <View style={styles.mainStatBox}>
            <Text style={styles.mainStatLabel}>Distance</Text>
            <Text style={styles.mainStatValue}>
              {(displayDistance).toFixed(2)} km
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleDetailedStats}
          >
            <Ionicons 
              name={showDetailedStats ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
        
        {/* Detailed Stats (Steps, Litters, Points) - Toggleable */}
        <Animated.View 
          style={[
            styles.detailedStatsContainer,
            {
              maxHeight: detailedStatsHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 120]
              }),
              opacity: detailedStatsHeight
            } as any
          ]}
        >
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <Ionicons name="footsteps-outline" size={16} color="#007AFF" style={styles.statIcon} />
                <Text style={styles.statLabel}>Steps</Text>
              </View>
              <Text style={styles.statValue}>{displaySteps}</Text>
            </View>
            
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <Ionicons name="trash-outline" size={16} color="#34C759" style={styles.statIcon} />
                <Text style={styles.statLabel}>Litters</Text>
              </View>
              <Text style={styles.statValue}>{isTracking ? metrics.litters : 0}</Text>
            </View>
            
            <View style={styles.statBox}>
              <View style={styles.iconContainer}>
                <Ionicons name="star-outline" size={16} color="#FFD700" style={styles.statIcon} />
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <Text style={styles.statValue}>{isTracking ? metrics.points : 0}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
      
      {/* Bottom Button Container */}
      <View style={styles.bottomContainer}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  mainStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainStatBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  mainStatLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  mainStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  toggleButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedStatsContainer: {
    overflow: 'hidden',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 8,
    marginHorizontal: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 10,
    padding: 15,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  startButton: {
    backgroundColor: "#34C759",
  },
  pauseButton: {
    backgroundColor: "#FF9500",
  },
  resumeButton: {
    backgroundColor: "#34C759",
  },
  finishButton: {
    backgroundColor: "#FF3B30",
  },
  cameraButton: {
    backgroundColor: "#007AFF",
    flex: 0.5,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  // Bottom spacing
  bottomContainer: {
    position: "absolute",
    bottom: 35,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
  },
  reconnectionBanner: {
    position: 'absolute',
    top: 240, // Position below the stats container
    left: 10,
    right: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
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
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    marginRight: 5,
  },
});
