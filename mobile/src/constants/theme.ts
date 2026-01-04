/**
 * ThreeSixty Theme Configuration
 */

import { colors } from './colors';

export const theme = {
    colors,

    // Typography
    typography: {
        fontFamily: {
            regular: 'System',
            medium: 'System',
            bold: 'System',
        },
        fontSize: {
            xs: 10,
            sm: 12,
            md: 14,
            lg: 16,
            xl: 18,
            xxl: 24,
            xxxl: 32,
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        },
    },

    // Spacing
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    // Border Radius
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },

    // Shadows
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
        },
    },
};

export default theme;
