import { configureStore } from '@reduxjs/toolkit';
import locationReducer from './slices/locationSlice';
import itineraryReducer from './slices/itinerarySlice';

export const store = configureStore({
  reducer: {
    location: locationReducer,
    itinerary: itineraryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
