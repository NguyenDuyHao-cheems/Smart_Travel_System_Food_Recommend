import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState {
  coords: Coordinates | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isManualUpdated: boolean;
  errorMessage: string | null;
}

const initialState: LocationState = {
  coords: null,
  status: 'idle',
  isManualUpdated: false,
  errorMessage: null,
};

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<Coordinates>) => {
      state.coords = action.payload;
      state.status = 'success';
      state.isManualUpdated = true;
      state.errorMessage = null;
    },
    setLocationStatus: (state, action: PayloadAction<'idle' | 'loading' | 'success' | 'error'>) => {
      state.status = action.payload;
    },
    setLocationError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.errorMessage = action.payload;
    },
    setLocationFromBackground: (state, action: PayloadAction<Coordinates>) => {
      // Background shouldn't override manual searches if already exist
      if (!state.isManualUpdated) {
        state.coords = action.payload;
        state.status = 'success';
        state.errorMessage = null;
      }
    }
  },
});

export const { setLocation, setLocationStatus, setLocationError, setLocationFromBackground } = locationSlice.actions;

export default locationSlice.reducer;
