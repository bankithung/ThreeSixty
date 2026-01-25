import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LayoutContextType {
    headerContent: ReactNode | null
    setHeaderContent: (content: ReactNode | null) => void
    sidebarCollapsed: boolean
    setSidebarCollapsed: (collapsed: boolean) => void
    toggleSidebar: () => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [headerContent, setHeaderContent] = useState<ReactNode | null>(null)
    
    // Initialize sidebar state from localStorage or default to false
    const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
        const saved = localStorage.getItem('sidebarCollapsed')
        return saved ? JSON.parse(saved) : false
    })

    // Persist sidebar state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
    }, [sidebarCollapsed])

    const setSidebarCollapsed = (collapsed: boolean) => {
        setSidebarCollapsedState(collapsed)
    }

    const toggleSidebar = () => {
        setSidebarCollapsedState(prev => !prev)
    }

    return (
        <LayoutContext.Provider value={{ 
            headerContent, 
            setHeaderContent,
            sidebarCollapsed,
            setSidebarCollapsed,
            toggleSidebar
        }}>
            {children}
        </LayoutContext.Provider>
    )
}

export function useLayout() {
    const context = useContext(LayoutContext)
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider')
    }
    return context
}
