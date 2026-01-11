/**
 * ThreeSixty Mobile App Constants
 */

import Config from 'react-native-config';

// API Configuration
export const API_BASE_URL = Config.API_URL || 'https://subdivine-indivertibly-kayleen.ngrok-free.dev/api';
export const WS_BASE_URL = Config.WS_URL || 'ws://10.0.2.2:8000/ws';

// Google Maps
export const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY || '';

// Map defaults
export const DEFAULT_LATITUDE = 28.6139;  // Delhi
export const DEFAULT_LONGITUDE = 77.2090;
export const DEFAULT_LATITUDE_DELTA = 0.0922;
export const DEFAULT_LONGITUDE_DELTA = 0.0421;

// Location update interval (ms)
export const LOCATION_UPDATE_INTERVAL = 5000;

// OTP
export const OTP_LENGTH = 6;
export const OTP_RESEND_DELAY = 30; // seconds


