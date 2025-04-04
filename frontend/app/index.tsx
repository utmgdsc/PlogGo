
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
import Tracking from "./screens/Tracking";
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

// Main App Tabs
const MainTabs = () => {
    const { onLogout } = useAuth();
    return (
        <Tab.Navigator
            screenOptions={{
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                tabBarActiveTintColor: '#37eb34',
                tabBarInactiveTintColor: 'gray',
                // add logout button to right side of header,
                headerRight: () => (
                    <Button
                        onPress={onLogout}
                        title="Logout"
                        color="#37eb34"
                    />
                )
            }}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                options={{
                    title: 'Home',
                    tabBarLabel: () => null,
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
                    tabBarLabel: () => null,
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
                    tabBarLabel: () => null,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="camera-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Social"
                component={Social}
                options={{
                    title: 'Leaderboard',
                    tabBarLabel: () => null,
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
                    tabBarLabel: () => null,
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
            {/* {authState?.authenticated ? ( */}
                {true ? (
                <>
                <Stack.Screen 
                    name="MainTabs" 
                    component={MainTabs} 
                    options={{
                        headerShown: false, // Hides stack header since tabs already have headers
                    }}
                />
                <Stack.Screen
                    name= "Tracking"
                    component={Tracking}
                    options={{
                        headerShown: true,
                        title: "Tracking",
                    }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }}/>
                    <Stack.Screen name="Signup" component={Signup} options={{ headerShown: false }}/>
                </>
            )}
        </Stack.Navigator>
    );
};
