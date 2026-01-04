import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { authAPI } from '../lib/api'

interface User {
    id: string
    email: string
    first_name: string
    last_name: string
    full_name: string
    role: string
    school?: string
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token')
            if (!token) {
                setIsLoading(false)
                return
            }

            const { data } = await authAPI.getProfile()
            setUser(data)
        } catch (error) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    const login = async (email: string, password: string) => {
        const { data } = await authAPI.login(email, password)
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        setUser(data.user)
    }

    const logout = async () => {
        try {
            await authAPI.logout()
        } catch (error) {
            // Ignore logout errors
        } finally {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            setUser(null)
        }
    }

    const refreshUser = async () => {
        await fetchUser()
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
