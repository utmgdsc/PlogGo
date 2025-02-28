import { Text, View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../context/AuthContext";
import { Image } from 'expo-image';
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";

export default function Profile() {

  // uncomment when backend is ready
  interface UserProfile {
    pfp: string;
    name: string;
    description: string;
    badges: { icon: string; title: string }[];
    streak: number;
  }

  const [data, setData] = useState<UserProfile>({
    pfp: "",
    name: "",
    description: "",
    badges: [],
    streak: 0,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ name: "", description: "", pfp: "" });

  useEffect(() => {
    fetchData();
  }
    ,[]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/data`);
      console.log(response.data);
      setData(response.data);
      setEditedData({ name: response.data.name, description: response.data.description, pfp: response.data.pfp });
    } catch (error) {
      setData({
        pfp: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
        name: "John Doe",
        description: "I love to recycle!",
        badges: [
          { icon: "♻️", title: "Recycler" },
          { icon: "🌱", title: "Eco-Warrior" },
          { icon: "🌍", title: "Earth Lover" },
        ],
        streak: 5,
      });
      setEditedData({ name: "John Doe", description: "I love to recycle!", pfp: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png" });
    };
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/user/update`, editedData);
      setData({ ...data, ...editedData });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

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


  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profile}>
        <TouchableOpacity onPress={() => setIsEditing(true)}>
          <Image style={styles.pfp} source={{ uri: editedData.pfp }} contentFit="cover" />
        </TouchableOpacity>
        {isEditing ? (
          <TextInput style={styles.input} value={editedData.name} onChangeText={(text) => setEditedData({ ...editedData, name: text })} />
        ) : (
          <Text style={styles.name}>{data.name}</Text>
        )}
        {isEditing ? (
          <TextInput style={styles.input} value={editedData.description} onChangeText={(text) => setEditedData({ ...editedData, description: text })} />
        ) : (
          <Text style={styles.description}>{data.description}</Text>
        )}
        {isEditing ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editProfile} onPress={() => setIsEditing(true)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
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
    elevation: 2,
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
    elevation: 2,
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
    elevation: 2,
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
  editText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "gray",
    padding: 5,
    marginVertical: 5,
    width: 200,
    textAlign: "center",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#007AFF",
    borderRadius: 20,
    padding: 10,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
});