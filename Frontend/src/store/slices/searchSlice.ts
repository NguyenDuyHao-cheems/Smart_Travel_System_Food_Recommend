import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RecommendResult } from '../../app/result/page';

interface SearchState {
  rawResults: RecommendResult[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SearchState = {
  rawResults: [],
  status: 'idle',
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setRawResults(state, action: PayloadAction<RecommendResult[]>) {
      state.rawResults = action.payload;
      state.status = 'succeeded';
    },
    setSearchLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    setSearchError(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.error = action.payload;
    },
    clearSearch(state) {
      state.rawResults = [];
      state.status = 'idle';
      state.error = null;
    }
  },
});

export const { setRawResults, setSearchLoading, setSearchError, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
