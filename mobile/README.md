# ThreeSixty Mobile App

School bus tracking mobile application built with React Native.

## Features

### Parent App
- 📍 **Real-time Bus Tracking** - Track your child's bus on a map like Zomato
- 🔔 **Push Notifications** - Get alerts when your child boards/leaves the bus
- 👨‍👩‍👧 **Multiple Children** - Support for parents with multiple children
- 📊 **Attendance History** - View past attendance records

### Conductor App
- ✅ **Trip Management** - Start/end trips
- 📷 **Face Recognition** - Scan students for attendance
- 📋 **Student List** - View and manage students on route
- 📍 **Location Updates** - Automatic location sharing

## Tech Stack

- **React Native** 0.73+
- **TypeScript**
- **Redux Toolkit** for state management
- **React Navigation** 6.x
- **React Native Maps** for Google Maps
- **Socket.io** for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Install iOS pods (macOS only):
```bash
cd ios && pod install && cd ..
```

3. Configure environment:
- Copy `src/constants/config.ts` and update API URLs
- Add your Google Maps API key

4. Run the app:
```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
mobile/
├── src/
│   ├── api/           # API client and endpoints
│   ├── components/    # Reusable UI components
│   ├── constants/     # Config, colors, theme
│   ├── navigation/    # Navigation setup
│   ├── screens/       # App screens
│   ├── store/         # Redux store and slices
│   ├── types/         # TypeScript definitions
│   └── App.tsx        # App entry point
├── package.json
└── tsconfig.json
```

## Key Screens

### Auth Flow
- **LoginScreen** - Phone number input
- **OTPScreen** - OTP verification

### Parent Screens
- **ParentHomeScreen** - Children list and status
- **TrackingScreen** - Real-time bus tracking map
- **NotificationsScreen** - Push notification history

### Conductor Screens
- **ConductorHomeScreen** - Trip management
- **StudentListScreen** - Route students
- **FaceScanScreen** - Face recognition camera

## Configuration

Update `src/constants/config.ts` with your settings:

```typescript
export const API_BASE_URL = 'https://your-api.com/api';
export const WS_BASE_URL = 'wss://your-api.com/ws';
export const GOOGLE_MAPS_API_KEY = 'your-google-maps-key';
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linter: `npm run lint`
4. Submit a pull request
