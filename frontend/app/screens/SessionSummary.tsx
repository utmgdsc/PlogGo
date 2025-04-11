import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useTracking } from '../context/TrackingContext';
import { API_URL, API_ROUTES } from '../config/env';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Define route param types
type RootStackParamList = {
  MainTabs: undefined;
  SessionSummary: undefined;
};

type SummaryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionSummary'>;

// Define session data interface
interface SessionData {
  id: string;
  sessionId: string;
  userId: string;
  startTime: string;
  endTime: string;
  elapsedTime: number;
  routes: Array<{ latitude: number; longitude: number; timestamp: string }>;
  distancesTravelled: number;
  steps: number;
  points?: number;
  litterCollected?: Record<string, number>;
  litterDetails?: Record<string, number>;
  totalLitter?: number;
}

const getEncouragementMessage = (distance: number, steps: number) => {
  if (distance > 5) return "Amazing effort! You're making a huge difference for our planet!";
  if (distance > 3) return "Outstanding job! Your plogging session helped clean our environment!";
  if (distance > 1) return "Great work! Every step you take makes our world cleaner!";
  return "Well done! Every bit of plogging helps our planet!";
};

const calculateCaloriesBurned = (duration: number, distance: number) => {
  // Simple calculation: ~60 calories per km while jogging + extra for picking up trash
  return Math.round((distance * 60) + (duration / 60) * 5);
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function SessionSummary() {
  const navigation = useNavigation<SummaryScreenNavigationProp>();
  const { getToken } = useAuth();
  const { ensureSocketConnection } = useTracking();
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02
  });
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number; longitude: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load fonts
  const [loaded] = useFonts({
    'Poppins-Black': require('../../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  // Fetch the latest plogging session
  useEffect(() => {
    const fetchLatestSession = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getToken?.();
        if (!token) {
          setError('Authentication token not available');
          setLoading(false);
          return;
        }
        
        console.log('Fetching latest session data...');
        const response = await axios.get(
          `${API_URL}${API_ROUTES.SESSIONS_LATEST}`, 
          { 
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        
        if (response.status === 200) {
          const data = response.data;
          console.log('Received session data:', data);
          setSessionData(data);
          
          // Process route data for map
          if (data.routes && data.routes.length > 0) {
            const validCoordinates = data.routes
              .filter((point: any) => 
                typeof point.latitude === 'number' && 
                typeof point.longitude === 'number' &&
                !isNaN(point.latitude) && 
                !isNaN(point.longitude)
              )
              .map((point: any) => ({
                latitude: point.latitude,
                longitude: point.longitude
              }));
            
            if (validCoordinates.length > 0) {
              setRouteCoordinates(validCoordinates);
              
              // Set map region to fit the route
              const firstCoord = validCoordinates[0];
              setMapRegion({
                latitude: firstCoord.latitude,
                longitude: firstCoord.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02
              });
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching session data:', err);
        setError(err.response?.data?.error || 'Failed to load session data');
        
        // Show alert for error
        Alert.alert(
          'Error',
          'Could not load session data. Please try again.',
          [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchLatestSession();
  }, []);

  const handleContinue = () => {
    // Simply go back to the previous screen (MainTabs)
    navigation.goBack();
  };

  // Ensure we reconnect the socket when navigating back from this screen
  const handleContinueWithReconnect = async () => {
    // First navigate back to main app
    handleContinue();
    
    // Then reconnect the socket after a short delay 
    // to ensure navigation has completed
    setTimeout(async () => {
      await ensureSocketConnection();
    }, 1000);
  };

  if (!loaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.loadingText}>Loading your session summary...</Text>
      </View>
    );
  }

  if (error || !sessionData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>
          {error || 'No session data available'}
        </Text>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinueWithReconnect}
        >
          <Text style={styles.buttonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extract data for display
  const { 
    elapsedTime,
    distancesTravelled,
    steps
  } = sessionData;
  
  const duration = elapsedTime;
  const distance = distancesTravelled / 1000; // Convert to km

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Session Summary</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Congratulations Message */}
        <View style={styles.congratsCard}>
          <LinearGradient
            colors={['#34C759', '#30D158']}
            style={styles.congratsGradient}
          >
            <Ionicons name="trophy" size={40} color="#FFFFFF" />
            <Text style={styles.congratsTitle}>Great Job!</Text>
            <Text style={styles.congratsMessage}>
              {getEncouragementMessage(distance, steps)}
            </Text>
          </LinearGradient>
        </View>
        
        {/* Map with Route */}
        <View style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Your Route</Text>
          <View style={styles.mapContainer}>
            {mapRegion.latitude && mapRegion.longitude && mapReady ? (
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                onMapReady={() => setMapReady(true)}
              >
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeWidth={4}
                    strokeColor="#34C759"
                    tappable={false}
                    zIndex={1}
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>Loading map...</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#34C759" />
              <Text style={styles.statValue}>{formatTime(duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="walk-outline" size={24} color="#34C759" />
              <Text style={styles.statValue}>{distance.toFixed(2)} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="footsteps-outline" size={24} color="#34C759" />
              <Text style={styles.statValue}>{steps}</Text>
              <Text style={styles.statLabel}>Steps</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={24} color="#34C759" />
              <Text style={styles.statValue}>{calculateCaloriesBurned(duration, distance)}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>
        </View>
        
        {/* Environmental Impact */}
        <View style={styles.impactCard}>
          <Text style={styles.sectionTitle}>Environmental Impact</Text>
          
          {/* Litter Collection Details */}
          {sessionData.litterDetails && Object.keys(sessionData.litterDetails).length > 0 ? (
            <View style={styles.litterSection}>
              <Text style={styles.litterTitle}>Litter Collected</Text>
              <Text style={styles.litterTotal}>
                Total Items: {sessionData.totalLitter || 0}
              </Text>
              
              <View style={styles.litterItems}>
                {Object.entries(sessionData.litterDetails).map(([type, count], index) => (
                  <View key={index} style={styles.litterItem}>
                    <Ionicons name="trash-outline" size={18} color="#34C759" />
                    <Text style={styles.litterItemText}>
                      {count} {type}{Number(count) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
              
              {sessionData.points ? (
                <Text style={styles.litterPoints}>
                  Points Earned: {sessionData.points}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyLitterSection}>
              <Ionicons name="trash-outline" size={28} color="#BBBBBB" />
              <Text style={styles.emptyLitterText}>
                No litter was collected during this session
              </Text>
            </View>
          )}
          
          <View style={styles.impactContent}>
            <View style={styles.impactItem}>
              <Ionicons name="leaf-outline" size={30} color="#34C759" />
              <View style={styles.impactTextContainer}>
                <Text style={styles.impactValue}>You've helped clean our planet!</Text>
                <Text style={styles.impactDescription}>Every piece of litter collected makes a difference.</Text>
              </View>
            </View>
            
            <View style={styles.impactItem}>
              <Ionicons name="earth-outline" size={30} color="#34C759" />
              <View style={styles.impactTextContainer}>
                <Text style={styles.impactValue}>Reduced pollution</Text>
                <Text style={styles.impactDescription}>By combining jogging and picking up litter, you've reduced your carbon footprint.</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Footer spacing */}
        <View style={styles.footerSpace} />
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinueWithReconnect}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Poppins-Light',
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    marginBottom: 30,
    fontSize: 16,
    fontFamily: 'Poppins-Light',
    color: '#333',
    textAlign: 'center',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  congratsCard: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  congratsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  congratsTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 10,
  },
  congratsMessage: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 5,
  },
  mapCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#000000',
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statsGrid: {
    margin: 16,
    marginTop: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#000000',
    marginTop: 8,
  },
  impactCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  impactContent: {
    marginTop: 8,
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  impactTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  impactValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#000000',
  },
  impactDescription: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  continueButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  footerSpace: {
    height: 20,
  },
  litterSection: {
    marginBottom: 16,
  },
  litterTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
  },
  litterTotal: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#000000',
  },
  litterItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  litterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  litterItemText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#333333',
    marginLeft: 4,
  },
  litterPoints: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#000000',
    marginTop: 8,
  },
  emptyLitterSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyLitterText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#8E8E93',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  mapPlaceholderText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#8E8E93',
  },
}); 