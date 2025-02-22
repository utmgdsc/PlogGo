
import { AuthProvider, useAuth } from "./context/AuthContext";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';

import Home from './screens/Home'; 
import Login from './screens/Login'; 
import Signup from "./screens/Signup";
import Metrics from "./screens/Metrics";
import Camera from "./screens/Camera";
import Social from "./screens/Social";
import Profile from "./screens/Profile";
import { Button } from "react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function Index() {
    return (
        <AuthProvider>
                <Layout />
        </AuthProvider>
    );
}

import { View } from "react-native";

const MainTabs = () => {
    const { onLogout } = useAuth();
    return (
        <Tab.Navigator
            screenOptions={{
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                tabBarActiveTintColor: '#37eb34',
                tabBarInactiveTintColor: 'gray',
                tabBarShowLabel: false,
                headerRight: () => (
                    <Button
                        onPress={onLogout}
                        title="Logout"
                        color="#37eb34"
                    />
                ),
            }}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Metrics"
                component={Metrics}
                options={{
                    title: 'Metrics',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="analytics" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Camera"
                component={Camera}
                options={{
                    title: 'Camera',
                    tabBarIcon: ({ color, size }) => (
                        <View
                            style={{
                                width: 70, // Adjust the size of the circle
                                height: 70,
                                backgroundColor: '#37eb34', // Green circle
                                borderRadius: 35, // Makes it a circle
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 20, // Moves it slightly up
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 5,
                                elevation: 5, // For Android shadow
                            }}
                        >
                            <Ionicons name="camera-outline" size={40} color="white" />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Social"
                component={Social}
                options={{
                    title: 'Social',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="clipboard-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};



// Layout: Handles Authentication & Main App Navigation
export const Layout = () => {
    const { authState, onLogout } = useAuth();

    return (
        <Stack.Navigator>
            {authState?.authenticated ? (
                <Stack.Screen 
                    name="MainTabs" 
                    component={MainTabs} 
                    options={{
                        headerShown: false,
                    }}
                />
            ) : (
                <>
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }}/>
                    <Stack.Screen name="Signup" component={Signup} options={{ headerShown: false }}/>
                </>
            )}
        </Stack.Navigator>
    );
};
