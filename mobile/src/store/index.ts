/**
 * Redux Store Configuration with RTK Query
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import authReducer from './slices/authSlice';
import tripReducer from './slices/tripSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authReducer,
        trip: tripReducer,
        notification: notificationReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(api.middleware),
});

// Enable refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
