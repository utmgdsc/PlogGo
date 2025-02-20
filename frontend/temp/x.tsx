import React, { useState } from 'react';
import { Text, View, TextInput, Button, StyleSheet, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';
import { Ionicons } from '@expo/vector-icons';

const backendUrl = process.env.EXPO_BASE_URL;
SplashScreen.preventAutoHideAsync();
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<any>();

  const [loaded, error] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const signIn = async () => {
    try {
        // navigate to home.tsx and reveal navigation bar
        const response = await fetch(`${backendUrl}/login`,
          {
            method: "POST",
            body: JSON.stringify({
              email: username,
              password: password
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8"
            }
          });
        
        if(!response.ok){
          throw new Error('Network response was not ok');
        }
        const data = response.json();

        navigation.navigate('main');
      console.log('Success');
    } catch (error) {
      console.log('Error signing in...', error);
    }
  };
  
  const signUp = () => {
    try {
        // navigate to signup.tsx
        navigation.navigate('signup');
      console.log('Success');
    } catch (error) {
      console.log('Error signing up...', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log</Text>
      <Text style={styles.title}>In!</Text>
      <View style = {styles.emptyspace}/>
      <View style = {styles.emptyspace}/>
      <View style = {styles.emptyspace}/>
      <TextInput
        style={styles.input}
        onChangeText={setUsername}
        value={username}
        placeholder="Username"
      />
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        placeholder="Password"
        secureTextEntry
      />
      <View style = {styles.emptyspace}/>
      <Text style = {styles.loginbutton} onPress={signIn}>Log in</Text>
      <View style = {styles.emptyspace}/>
      <Text style={{ marginTop: 20 }}>
        Don't have an account? <Text style = {styles.smallButton} onPress={signUp}>Sign Up</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyspace:{
    height: 20,
  },
  loginbutton:{
    fontFamily: 'Poppins-Bold',
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#1dff06',
    color: 'white',
    width: '80%',
    textAlign: 'center',
    fontSize: 20,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  smallButton:{
    color: 'blue',
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor:`#f5f2f2`,
    height: 50,
    padding: 5,
    paddingLeft: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 5,
    marginBottom: 20,
  },
});