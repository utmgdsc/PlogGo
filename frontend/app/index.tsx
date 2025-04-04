import React from 'react';
import { AuthProvider, useAuth } from "./context/AuthContext";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

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
            screenOptions={({ navigation }) => ({
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                tabBarActiveTintColor: '#34C759',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 80 : 25,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
                },
                tabBarItemStyle: {
                    paddingTop: 15,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins-Medium',
                    fontSize: 10,
                    marginTop: 0,
                },
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                    height: Platform.OS === 'ios' ? 50 : 40,
                    paddingTop: 0,
                    marginTop: Platform.OS === 'ios' ? -20 : -10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E5EA',
                },
                headerTitleStyle: {
                    fontFamily: 'Poppins-Bold',
                    fontSize: 18,
                    color: '#000000',
                    marginTop: -35,
                },
                // Add logout button to header
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={onLogout}
                        style={{ 
                            marginRight: 15, 
                            marginTop: -35,
                            padding: 5,
                        }}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                ),
                // Wrap each screen in a SafeAreaView with bottom padding
                tabBarBackground: () => (
                    <View style={styles.tabBarBackground}>
                        <View style={styles.bottomSpacing} />
                    </View>
                ),
            })}
        >
            <Tab.Screen
                name="Home"
                component={Home}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={styles.iconContainer}>
                            <Ionicons 
                                name={focused ? "home" : "home-outline"} 
                                size={size} 
                                color={color} 
                            />
                            {focused && <View style={styles.activeIndicator} />}
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Metrics"
                component={Metrics}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={styles.iconContainer}>
                            <Ionicons 
                                name={focused ? "analytics" : "analytics-outline"} 
                                size={size} 
                                color={color} 
                            />
                            {focused && <View style={styles.activeIndicator} />}
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Camera"
                component={Camera}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconContainer, styles.cameraContainer]}>
                            <View style={styles.cameraButton}>
                                <Ionicons name="camera" size={size} color="#FFFFFF" />
                            </View>
                        </View>
                    ),
                    tabBarLabel: () => null,
                }}
            />
            <Tab.Screen
                name="Social"
                component={Social}
                options={{
                    title: 'Leaderboard',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={styles.iconContainer}>
                            <Ionicons 
                                name={focused ? "trophy" : "trophy-outline"} 
                                size={size} 
                                color={color} 
                            />
                            {focused && <View style={styles.activeIndicator} />}
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={styles.iconContainer}>
                            <Ionicons 
                                name={focused ? "person" : "person-outline"} 
                                size={size} 
                                color={color} 
                            />
                            {focused && <View style={styles.activeIndicator} />}
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -8,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#34C759',
    },
    cameraContainer: {
        marginTop: -20,
    },
    cameraButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#34C759',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    tabBarBackground: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    bottomSpacing: {
        height: Platform.OS === 'ios' ? 110 : 45,
    },
});

// Layout: Handles Authentication & Main App Navigation
export const Layout = () => {
    const { authState, onLogout } = useAuth();

    return (
        <Stack.Navigator>
            {authState?.authenticated ? (
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
