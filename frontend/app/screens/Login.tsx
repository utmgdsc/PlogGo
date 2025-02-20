import { StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { onLogin, onRegister } = useAuth();

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

  const login =  async () => {
    if (onLogin) {
      const result = await onLogin(email, password);
      if (result.error && result.error) {
        alert(result.msg);
      }
    } else {
      alert('Login function is not available.');
    }
  }

  const register =  async () => {
    if (onRegister) {
      const result = await onRegister(email, password);
      if (result.error && result.error) {
        alert(result.msg);
      }
    } else {
      alert('Login function is not available.');
    }
  }

  return (
    <View style={styles.container}>
          <Text style={styles.title}>Log</Text>
          <Text style={styles.title}>In!</Text>
          <View style = {styles.emptyspace}/>
          <View style = {styles.emptyspace}/>
          <View style = {styles.emptyspace}/>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="Email"
          />
          <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            placeholder="Password"
            secureTextEntry
          />
          <View style = {styles.emptyspace}/>
          <Text style = {styles.loginbutton} onPress={login}>Log in</Text>
          <View style = {styles.emptyspace}/>
          <Text style={{ marginTop: 20 }}>
            Don't have an account? <Text style = {styles.smallButton} onPress={register}>Sign Up</Text></Text>
        </View>
      );
}

export default Login;

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