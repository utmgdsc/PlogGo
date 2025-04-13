import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, API_ROUTES } from '../config/env';

interface AuthProps{
    authState?: {token: string | null; authenticated: boolean | null};
    onRegister?: (email: string, password: string) => Promise<any>;
    onLogin?: (email: string, password: string) => Promise<any>;
    onLogout?: () => Promise<any>;
    getToken?: () => Promise<string | null>;
}

const TOKEN_KEY = 'JWT_SECRET_KEY';
const USERID_KEY = 'USER_ID';
const AuthContext = createContext<AuthProps>({});

export const useAuth = () => {
    return useContext(AuthContext);
}

export const AuthProvider = ({children}: any) => {
    const [authState, setAuthState] = useState<{
        token: string | null; 
        authenticated: boolean | null;
        user_id: string | null;
    }>({
        token: "", 
        authenticated: null,
        user_id: ""
    });

    useEffect(() => {
        const loadToken = async () => {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            const user_id = await SecureStore.getItemAsync(USERID_KEY);
            if (token) {
                setAuthState({
                    token,
                    authenticated: true,
                    user_id: user_id
                });

                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } else {
                setAuthState({
                    token: null,
                    authenticated: false,
                    user_id: ""
                });
            }
        };
        loadToken();
    }, []);

    const register = async (email: string, password: string) => {
        try {
            await axios.post(`${API_URL}${API_ROUTES.REGISTER}`, { email, password });
            login(email, password);
        } catch (e) {
            return {error: true, msg: (e as any).response.data.message};
        }
    };

    const login = async (email: string, password: string) => {
        console.log(`${API_URL}${API_ROUTES.LOGIN}`)
        try {
            const result = await axios.post(`${API_URL}${API_ROUTES.LOGIN}`, { email, password });
            setAuthState({
                token: result.data.access_token,
                authenticated: true,
                user_id: result.data.user_id
            });

            axios.defaults.headers.common['Authorization'] = `Bearer ${result.data.access_token}`;

            await SecureStore.setItemAsync(TOKEN_KEY, result.data.access_token);
            await SecureStore.setItemAsync(USERID_KEY, result.data.user_id);
            
            return result;
        } catch (e) {
            return {error: true, msg: (e as any).response.data.message};
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USERID_KEY);

        axios.defaults.headers.common['Authorization'] = '';
        setAuthState({
            token: null,
            authenticated: false,
            user_id: ""
        });
    };

    const getJWTToken = async () => {
        return authState.token;
    }

    const getUserId = async () => {
        return authState.user_id;
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

// Default export for the AuthProvider
export default AuthProvider;