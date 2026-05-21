import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ItineraryItem {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  address?: string;
  img?: string;
  rating?: string;
  price?: string;
  reason?: string;
  google_maps_url?: string;
}

export interface ItineraryState {
  items: ItineraryItem[];
  travelMode: 'walking' | 'riding' | 'driving';
}

const getInitialItems = (): ItineraryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('wanderbite_itinerary');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse itinerary from localStorage', e);
    return [];
  }
};

const getInitialTravelMode = (): 'walking' | 'riding' | 'driving' => {
  if (typeof window === 'undefined') return 'riding';
  try {
    const mode = localStorage.getItem('wanderbite_travel_mode');
    return (mode === 'walking' || mode === 'riding' || mode === 'driving') ? mode : 'riding';
  } catch (e) {
    return 'riding';
  }
};

const initialState: ItineraryState = {
  items: getInitialItems(),
  travelMode: getInitialTravelMode(),
};

export const itinerarySlice = createSlice({
  name: 'itinerary',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<ItineraryItem>) => {
      if (!state.items.some(item => item.id === action.payload.id)) {
        state.items.push(action.payload);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
        }
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
      }
    },
    reorderItems: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex >= 0 &&
        fromIndex < state.items.length &&
        toIndex >= 0 &&
        toIndex < state.items.length
      ) {
        const [moved] = state.items.splice(fromIndex, 1);
        state.items.splice(toIndex, 0, moved);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
        }
      }
    },
    moveItemUp: (state, action: PayloadAction<number>) => {
      const idx = action.payload;
      if (idx > 0 && idx < state.items.length) {
        const temp = state.items[idx];
        state.items[idx] = state.items[idx - 1];
        state.items[idx - 1] = temp;
        if (typeof window !== 'undefined') {
          localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
        }
      }
    },
    moveItemDown: (state, action: PayloadAction<number>) => {
      const idx = action.payload;
      if (idx >= 0 && idx < state.items.length - 1) {
        const temp = state.items[idx];
        state.items[idx] = state.items[idx + 1];
        state.items[idx + 1] = temp;
        if (typeof window !== 'undefined') {
          localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
        }
      }
    },
    clearItinerary: (state) => {
      state.items = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wanderbite_itinerary');
      }
    },
    setTravelMode: (state, action: PayloadAction<'walking' | 'riding' | 'driving'>) => {
      state.travelMode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('wanderbite_travel_mode', action.payload);
      }
    },
    setItinerary: (state, action: PayloadAction<ItineraryItem[]>) => {
      state.items = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('wanderbite_itinerary', JSON.stringify(state.items));
      }
    },
  },
});

export const {
  addItem,
  removeItem,
  reorderItems,
  moveItemUp,
  moveItemDown,
  clearItinerary,
  setTravelMode,
  setItinerary,
} = itinerarySlice.actions;

export default itinerarySlice.reducer;
