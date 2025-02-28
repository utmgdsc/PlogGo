import { Text, View } from "react-native";
import axios from 'axios';
import { useEffect, useState } from 'react';
import { API_URL } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';

// leaderboard
export default function Social() {
  // get request to api/leaderboard
  interface UserProfile {
    name: String,
    email: String,
    username: String,
    total_steps: Number,
    total_distance: Number,
    total_time: Number
  }

  const [data, setData] = useState<[UserProfile]>([{
    name: "",
    email: "",
    username: "",
    total_steps: 0,
    total_distance: 0,
    total_time: 0
  }]);
  useEffect(() => {
    fetchData();
  }
    ,[]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/leaderboard`);
      console.log(response.data);
      setData(response.data);
    } catch (error) {
      setData([{
        name: "John Doe",
        email: "",
        username: "johndoe",
        total_steps: 10000,
        total_distance: 100,
        total_time: 100
      }]);
    };
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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>This is the social Page.</Text>
    </View>
  );
}
