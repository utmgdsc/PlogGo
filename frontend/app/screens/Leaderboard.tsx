import { Text, View, FlatList, StyleSheet, Image, Dimensions, ActivityIndicator } from "react-native";
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../context/AuthContext';

// User profile interface
interface UserProfile {
  name: string;
  email: string;
  username: string;
  total_distance: number;
  total_time: number;
  total_points: number; // Added total_points property
  profile_picture?: string;
}

// Default profile image
const DEFAULT_PROFILE_PIC = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

// Default users (if API fails)
const DEFAULT_USERS: UserProfile[] = [
  {
    name: "John Doe",
    email: "johndoe@example.com",
    username: "johndoe123",
    total_points: 15000,
    total_distance: 10.5,
    total_time: 120,
  },
  {
    name: "Jane Smith",
    email: "janesmith@example.com",
    username: "janesmith456",
    total_points: 14000,
    total_distance: 9.8,
    total_time: 110,
  },
  {
    name: "Alice John",
    email: "alice@example.com",
    username: "alicej",
    total_points: 13000,
    total_distance: 9.2,
    total_time: 100,
  },
  {
    name: "Bob Brown",
    email: "bob@example.com",
    username: "bobbrown",
    total_points: 12000,
    total_distance: 8.5,
    total_time: 90,
  },
  {
    name: "Charlie White",
    email: "charlie@example.com",
    username: "charliewhite",
    total_points: 11000,
    total_distance: 7.8,
    total_time: 80,
  },
  {
    name: "David Black",
    email: "david@example.com",
    username: "davidblack",
    total_points: 10000,
    total_distance: 7.0,
    total_time: 70,
  }
];

// Selected metric to display
const METRIC = "total_points"; // Change this to "total_distance" or "total_time" if needed
const METRIC_LABEL = "Points"; // Label for the metric

// Get screen width
const { width } = Dimensions.get('window');

export default function Leaderboard() {
  const [data, setData] = useState<UserProfile[]>(DEFAULT_USERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Fetching leaderboard data...");
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leaderboard?metric=${METRIC}&count=10`);
      if (response.data && Array.isArray(response.data.leaderboard) && response.data.leaderboard.length > 0) {
        setData(response.data.leaderboard);
      }
    } catch (error) {
      console.log("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load fonts
  const [loaded, error] = useFonts({
    'Poppins-Black': require('../../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const topThree = data.slice(0, 3);
  const rest = data.slice(3);

  // Format score based on metric
  const formatScore = (value: number) => {
    if (METRIC === "total_points") {
      return value.toLocaleString();
    } else if (METRIC === "total_distance") {
      return `${value.toFixed(1)} km`;
    } else if (METRIC === "total_time") {
      return `${Math.floor(value / 60)}h ${value % 60}m`;
    }
    return value;
  };

  return (
    <LinearGradient colors={['#4CAF50', '#00d2ff']} style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Top Performers</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <>
          {/* Podium */}
          <View style={styles.podiumContainer}>
            {/* Second Place */}
            <View style={[styles.podiumColumn, { height: 0 }]}>
              <View style={styles.profileContainer}>
                <Image 
                  source={{ uri: topThree[1]?.profile_picture || DEFAULT_PROFILE_PIC }} 
                  style={styles.podiumProfilePic} 
                />
                <View style={[styles.badge, styles.silverBadge]}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              </View>
              <View style={[styles.podiumBlock, styles.silverPodium]}>
                <Text style={styles.podiumName} numberOfLines={1} ellipsizeMode="tail">
                  {topThree[1]?.name || "---"}
                </Text>
                <Text style={styles.podiumScore}>
                  {topThree[1] ? formatScore(topThree[1][METRIC]) : "---"}
                </Text>
              </View>
            </View>

            {/* First Place */}
            <View style={[styles.podiumColumn, { height: 170, zIndex: 10 }]}>
              <View style={styles.profileContainer}>
                <Image 
                  source={{ uri: topThree[0]?.profile_picture || DEFAULT_PROFILE_PIC }} 
                  style={[styles.podiumProfilePic, styles.firstPlacePic]} 
                />
                <Image 
                  source={{ uri: "https://cdn-icons-png.flaticon.com/512/1828/1828970.png" }} 
                  style={styles.crown} 
                />
                <View style={[styles.badge, styles.goldBadge]}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
              </View>
              <View style={[styles.podiumBlock, styles.goldPodium]}>
                <Text style={styles.podiumName} numberOfLines={1} ellipsizeMode="tail">
                  {topThree[0]?.name || "---"}
                </Text>
                <Text style={styles.topScore}>
                  {topThree[0] ? formatScore(topThree[0][METRIC]) : "---"}
                </Text>
              </View>
            </View>

            {/* Third Place */}
            <View style={[styles.podiumColumn, { height: 2 }]}>
              <View style={styles.profileContainer}>
                <Image 
                  source={{ uri: topThree[2]?.profile_picture || DEFAULT_PROFILE_PIC }} 
                  style={styles.podiumProfilePic} 
                />
                <View style={[styles.badge, styles.bronzeBadge]}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </View>
              <View style={[styles.podiumBlock, styles.bronzePodium]}>
                <Text style={styles.podiumName} numberOfLines={1} ellipsizeMode="tail">
                  {topThree[2]?.name || "---"}
                </Text>
                <Text style={styles.podiumScore}>
                  {topThree[2] ? formatScore(topThree[2][METRIC]) : "---"}
                </Text>
              </View>
            </View>
          </View>

          {/* Remaining Users List */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderRank}>Rank</Text>
              <Text style={styles.listHeaderUser}>User</Text>
              <Text style={styles.listHeaderScore}>{METRIC_LABEL}</Text>
            </View>

            <FlatList
              data={rest}
              keyExtractor={(item, index) => item?.username || `empty-${index}`}
              renderItem={({ item, index }) => (
                <View style={styles.listItem}>
                  <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>#{index + 4}</Text>
                  </View>
                  <Image 
                    source={{ uri: item?.profile_picture || DEFAULT_PROFILE_PIC }} 
                    style={styles.listProfilePic} 
                  />
                  <Text style={styles.listName} numberOfLines={1} ellipsizeMode="tail">
                    {item?.name || "---"}
                  </Text>
                  <Text style={styles.listScore}>
                    {item ? formatScore(item[METRIC]) : "---"}
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />
          </View>
        </>
      )}
    </LinearGradient>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
    marginTop: 10,
  },
  podiumColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 5,
    width: width * 0.28,
  },
  profileContainer: {
    position: 'relative',
    marginBottom: -20, // Decreased from -25 to -20 to raise profile images
    zIndex: 5,
  },
  podiumProfilePic: {
    width: 65, // Slightly reduced from 70
    height: 65, // Slightly reduced from 70
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  firstPlacePic: {
    width: 75, // Slightly reduced from 80
    height: 75, // Slightly reduced from 80
    borderRadius: 38,
    borderWidth: 4,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
  },
  badgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#000000',
  },
  crown: {
    width: 40,
    height: 40,
    position: 'absolute',
    top: -25,
    alignSelf: 'center',
    tintColor: '#FFD700',
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 30, // Keep this the same to maintain space for the profile pictures
    paddingBottom: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  goldPodium: {
    height: 120,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
  },
  silverPodium: {
    height: 100,
    backgroundColor: 'rgba(192, 192, 192, 0.8)',
  },
  bronzePodium: {
    height: 90,
    backgroundColor: 'rgba(205, 127, 50, 0.8)',
  },
  podiumName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 13, // Reduced from 14 to fit better
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 8, // Added to push text down from profile pic
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  podiumScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  topScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  flatListContent: {
    paddingBottom: 20, // Add padding to ensure content doesn't get cut off
  },
  listHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 5,
  },
  listHeaderRank: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    width: 50,
  },
  listHeaderUser: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  listHeaderScore: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    width: 70,
    textAlign: 'right',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginVertical: 5,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankContainer: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#666',
  },
  listProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  listScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#3a7bd5',
    marginLeft: 5,
  },
});