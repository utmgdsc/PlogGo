import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

interface AuthProps{
    authState?: {token: string | null; authenticated: boolean | null};
    onRegister?: (email: string, password: string) => Promise<any>;
    onLogin?: (email: string, password: string) => Promise<any>;
    onLogout?: () => Promise<any>;
    getToken?: () => Promise<string | null>;
}

const TOKEN_KEY = 'JWT_SECRET_KEY';
export const API_URL = process.env.EXPO_PUBLIC_BASE_URL;
const AuthContext = createContext<AuthProps>({});

export const useAuth = () => {
    return useContext(AuthContext);
}

export const AuthProvider = ({children}: any) => {
    const [authState, setAuthState] = useState<{
        token: string | null; 
        authenticated: boolean | null;
    }>({
        token: "", 
        authenticated: null
    });

    useEffect(() => {
        const loadToken = async () => {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                setAuthState({
                    token,
                    authenticated: true
                });

                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } else {
                setAuthState({
                    token: null,
                    authenticated: false
                });
            }
        };
        loadToken();
    }, []);

    const register = async (email: string, password: string) => {
        try {
            return await axios.post(`${API_URL}/register`, { email, password });
        } catch (e) {
            return {error: true, msg: (e as any).response.data.msg};
        }
    };

    const login = async (email: string, password: string) => {
        console.log(`${API_URL}/login`)
        try {
            const result = await axios.post(`${API_URL}/login`, { email, password });
            setAuthState({
                token: result.data.access_token,
                authenticated: true
            });

            axios.defaults.headers.common['Authorization'] = `Bearer ${result.data.token}`;

            await SecureStore.setItemAsync(TOKEN_KEY, result.data.token);
            
            return result;
        } catch (e) {
            return {error: true, msg: (e as any).response.data.msg};
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);

        axios.defaults.headers.common['Authorization'] = '';
        setAuthState({
            token: null,
            authenticated: false
        });
    };

    const getJWTToken = async () => {
        return authState.token;
    }

    const value = {
        onRegister: register,
        onLogin: login,
        onLogout: logout,
        getToken: getJWTToken,
        authState
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}