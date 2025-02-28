import { Text, View } from "react-native";
import { useAuth } from '../context/AuthContext';
import { useEffect } from "react";

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


  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>This is the Home Page.</Text>
    </View>
  );
}
