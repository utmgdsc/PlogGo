import React, { useState } from 'react';
import { Text, View, TextInput, Button, StyleSheet, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatedPassword, setRepeatedPassword] = useState('');
  const navigation = useNavigation<any>();
  const { onRegister } = useAuth();

  const [loaded, error] = useFonts({
    'Poppins-Black': require('../../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'OpenSans-Regular': require('../../assets/fonts/OpenSans-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }


  const register =  async () => {
    if (onRegister) {
      console.log('registering');
      const result = await onRegister!(email, password);
      if (result && result.error) {
        alert(result.msg);
      }
    } else {
      alert('Login function is not available.');
    }
  }
  
  const Login = () => {
    try {
        // navigate to login.tsx
        navigation.navigate('Login');
      console.log('Success');
    } catch (error) {
      console.log('Error signing up...', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign</Text>
      <Text style={styles.title}>Up!</Text>
      <View style = {styles.emptyspace}/>
      <View style = {styles.emptyspace}/>
      <View style = {styles.emptyspace}/>
      <TextInput
        style={styles.input}
        onChangeText={(text: string) => setEmail(text)}
        value={email}
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        placeholder="Password"
      />
      <TextInput
        style={styles.input}
        onChangeText={setRepeatedPassword}
        value={repeatedPassword}
        placeholder="Confirm Password"
        secureTextEntry
      />
      <View style = {styles.emptyspace}/>
      <Text style = {styles.loginbutton} onPress={register}>Sign up</Text>
      <View style = {styles.emptyspace}/>
      <Text style={{ marginTop: 20 }}>
        Already have an account? <Text style = {styles.smallButton} onPress={Login}>Log in</Text></Text>
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
    backgroundColor: '#f5f2f2',
    width: '80%',
    height: 50,
    padding: 5,
    paddingLeft: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: -5,
    marginBottom: 20,
  },
});