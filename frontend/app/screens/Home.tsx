import { Text, View, StyleSheet, Image, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef } from "react";
import { useFonts } from 'expo-font';
import { SplashScreen, useNavigation } from 'expo-router';

export default function Home() {
  // hook for getting token
  const { getToken } = useAuth();
  
  if (getToken) {
    useEffect(() => {
      const fetchToken = async () => {
        const token = await getToken();
        console.log(token);
      };

      fetchToken();
    }, []);
  } else {
    console.log("Token function is undefined");
  }

  const [loaded, error] = useFonts({
    'Poppins-Black': require('../../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });
  const navigation = useNavigation<any>();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
        if (loaded || error) {
          SplashScreen.hideAsync();
        }
      }, [loaded, error]);
    
      if (!loaded && !error) {
        return null;
      }

  if (!loaded) {
    return null; // Optionally return a loading state until the fonts are loaded
  }
  const handleStartSession = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate("Tracking");
    });
  }

  const handleChallengePress = () => {
    navigation.navigate("Camera");
  }

  return (
    <ScrollView 
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PlogGo</Text>
          <Text style={styles.headerSubtitle}>Make Earth Cleaner, One Step at a Time</Text>
        </View>

        <TouchableOpacity 
          style={styles.collectioncard}
          onPress={handleChallengePress}
          activeOpacity={0.9}
        >
          <Image 
            source={require('../../assets/images/bottles.png')}
            style={styles.image} 
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <Text style={styles.collectionText}>20 Bottles Day Challenge</Text>
            <Text style={styles.collection2Text}>
              Join the 20 Bottles a Day Challenge and make a difference! Collect and properly dispose of at least 20 plastic bottles today while plogging. Track your progress, inspire others, and contribute to a greener planet—one bottle at a time! 🌱💪
            </Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity 
            style={styles.startbutton}
            onPress={handleStartSession}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Start Plogging Session</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#2C3E50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  collectioncard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 20,
  },
  collectionText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#2C3E50',
    marginBottom: 12,
  },
  collection2Text: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  startbutton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    fontSize: 18,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
