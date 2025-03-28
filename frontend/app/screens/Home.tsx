import { Text, View, StyleSheet, Image, ScrollView } from "react-native";
import { useAuth } from '../context/AuthContext';
import { useEffect } from "react";
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
    navigation.navigate("Tracking");
  }

  return (
    <ScrollView 
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
    <View style={styles.container}>
      
      {/* Collection Card */}
      <View style={styles.collectioncard}>
        {/* Image inside collection card */}
        <Image 
          source={require('../../assets/images/bottles.png')}  // Local image path
          style={styles.image} 
          resizeMode="contain"  // Ensures the image fits without distortion
        />
        <Text style={styles.collectionText}>20 Bottles Day</Text>
        <Text style={styles.collection2Text}>Join the 20 Bottles a Day Challenge and make a difference! Collect and properly dispose of at least 20 plastic bottles today while plogging. Track your progress, inspire others, and contribute to a greener planet—one bottle at a time! 🌱💪</Text>
      </View>
      <View style={styles.emptyspace}></View>
      <Text style={styles.startbutton} onPress= {handleStartSession}>Start Session</Text>
      <View style={styles.emptyspace}></View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyspace: {
    height: 20,
  },
  collectioncard: {
    backgroundColor: '#A1DEBA',
    width: '90%',
    padding: 20,
    marginBottom: 20,
    borderRadius: 15,
    textAlign: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
    alignItems: 'center',  // Centers the content horizontally
  },
  collectionText: {
    fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginTop: 10,  // Space between the image and text
    textAlign: 'left',  // Aligns the text to the left
    alignSelf: 'flex-start',  // Align the text to the left
  },
  collection2Text: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    color: '#333',
    textAlign: 'left',
    marginTop: 10,  // Space between the image and text
    alignSelf: 'flex-start',  // Align the text to the left
  },
  image: {
    width: '100%',  // Ensures the image takes up the full width of the container
    height: 200,  // Height of the rectangle (you can adjust this)
    borderRadius: 10,  // Optional: Adds rounded corners to the image
  },
  startbutton: {
    fontFamily: 'Poppins-Bold',
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#34C759',
    color: 'white',
    width: '80%',
    textAlign: 'center',
    fontSize: 18,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
    alignSelf: 'center', 
  },
  smallbutton: {
    fontFamily: 'Poppins-Bold',
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#34C759',
    color: 'white',
    width: '50%',
    textAlign: 'center',
    fontSize: 12,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
    alignSelf: 'flex-end', 
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: -50,
    fontFamily: 'Poppins-Bold',
    fontSize: 80,
  },
  input: {
    fontFamily: 'Poppins-Light',
    borderRadius: 15,
    width: '80%',
    backgroundColor: '#f5f2f2',
    height: 50,
    padding: 5,
    paddingLeft: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 5,
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
});
