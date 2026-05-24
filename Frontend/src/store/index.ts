import { configureStore } from '@reduxjs/toolkit';
import locationReducer from './slices/locationSlice';
import itineraryReducer from './slices/itinerarySlice';
import searchReducer from './slices/searchSlice';

export const store = configureStore({
  reducer: {
    location: locationReducer,
    itinerary: itineraryReducer,
    search: searchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
