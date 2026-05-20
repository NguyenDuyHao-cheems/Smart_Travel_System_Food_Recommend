import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState {
  coords: Coordinates | null;
  address: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isManualUpdated: boolean;
}

const initialState: LocationState = {
  coords: null,
  address: null,
  status: 'idle',
  isManualUpdated: false,
};

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<Coordinates>) => {
      state.coords = action.payload;
      state.status = 'success';
      state.isManualUpdated = true;
    },
    setLocationStatus: (state, action: PayloadAction<'idle' | 'loading' | 'success' | 'error'>) => {
      state.status = action.payload;
    },
    setLocationAddress: (state, action: PayloadAction<string | null>) => {
      state.address = action.payload;
    },
    setLocationFromBackground: (state, action: PayloadAction<Coordinates>) => {
      // Background shouldn't override manual searches if already exist
      if (!state.isManualUpdated) {
        state.coords = action.payload;
        state.status = 'success';
      }
    }
  },
});

export const { setLocation, setLocationStatus, setLocationAddress, setLocationFromBackground } = locationSlice.actions;

export default locationSlice.reducer;
