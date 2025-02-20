import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, View} from 'react-native';
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from './screens/Home'; // Adjust the path as necessary
import Login from './screens/Login'; // Adjust the path as necessary

const Stack = createNativeStackNavigator();

export default function Index() {
    return(
        <AuthProvider>
            <Layout></Layout>
        </AuthProvider>
    );
}


export const Layout = () => {
    const {authState, onLogout} = useAuth();
    return (
        <Stack.Navigator>
            {authState?.authenticated ? (
                    <Stack.Screen 
                    name="Home" 
                    component={Home}
                    options ={{
                        headerRight: () =><Button onPress={onLogout} title="Sign Out"/>
                    }}></Stack.Screen>
                ) : (
                    <Stack.Screen name="Login" component={Login}></Stack.Screen>
                )}
        </Stack.Navigator>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});