import { Text, View, StyleSheet } from "react-native";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../context/AuthContext";
import { Image } from 'expo-image';
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";

export default function Profile() {

  // uncomment when backend is ready
  // const [data, setData] = useState({});
  // useEffect(() => {
  //   fetchData();
  // }
  //   ,[]);

  // const fetchData = async () => {
  //   try {
  //     const response = await axios.get(`${API_URL}/user`);
  //     console.log(response.data);
  //     setData(response.data);
  //   } catch (error) {
  //     const data = {
  //   pfp: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
  //   name: "John Doe",
  //   description: "I love to recycle!",
  //   badges: [
  //     { icon: "♻️", title: "Recycler" },
  //     { icon: "🌱", title: "Eco-Warrior" },
  //     { icon: "🌍", title: "Earth Lover" },
  //   ],
  //   streak: 5,
  // };
  //   };
  // };

  // load fonts
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

  const data = {
    pfp: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
    name: "John Doe",
    description: "I love to recycle!",
    badges: [
      { icon: "♻️", title: "Recycler" },
      { icon: "🌱", title: "Eco-Warrior" },
      { icon: "🌍", title: "Earth Lover" },
    ],
    streak: 5,
  };

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profile}>
        <Image style={styles.pfp} source={{ uri: data.pfp }} contentFit="cover" />
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.description}>{data.description}</Text>
        <Text style={styles.editProfile}>Edit</Text>
      </View>

       {/* Badges Section */}
       <View style={styles.badges}>
        <Text style={styles.badgesTitle}>Badges</Text>
        <View style={styles.badgeContainer}>
          {data.badges.map((badge, index) => (
            <View key={index} style={styles.badgeItem}>
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
              </View>
              <Text style={styles.badgeText}>{badge.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Streak Section */}
      <View style={styles.streak}>
        <View style={styles.streakTextContainer}>
          <Text style={styles.streakCount}>{data.streak}</Text>
          <Text style={styles.streakDays}>  Streak days</Text>
        </View>
        <Text style={styles.streakEmoji}>🔥</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: '#ffffff',
  },
  profile: {
    alignItems: "center",
  },
  pfp: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  description: {
    fontSize: 16,
    color: "gray",
  },
  editProfile: {
    fontFamily: 'Poppins-Bold',
    borderRadius: 20,
    padding: 5,
    paddingHorizontal: 35,
    marginTop: 12,
    backgroundColor: '#1dff06',
    color: 'white',
    width: '80%',
    textAlign: 'center',
    fontSize: 12,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  badges: {
    width: "80%",
    height: "40%",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    position: "relative",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgesTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    alignSelf: "flex-start",
  },
  badgeContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  badgeItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  badgeCircle: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeText: {
    fontFamily: 'Poppins-Light',
    marginTop: 10, // Increased space between badge and title
    fontSize: 12,
    color: '#1dff06',
  },
  streak: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  streakTextContainer: {
    flexDirection: "row",
    alignItems: "center", // Align items to the center vertically
  },
  streakCount: {
    
    fontSize: 32,
  },
  streakDays: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: "#555",
    marginTop: 8, // Move "Streak days" slightly below the center
  },
  streakEmoji: {
    fontSize: 30,
  },
});