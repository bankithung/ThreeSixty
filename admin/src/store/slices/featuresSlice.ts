import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { subscriptionsAPI } from '../../lib/api'

export interface PricingTier {
    min: number
    max: number | null
    price: number
}

export interface Feature {
    id: string
    name: string
    code: string
    description: string
    price: number
    pricing_type: 'flat' | 'tiered'
    tiers: PricingTier[]
    is_active: boolean
    created_at: string
}

interface FeaturesState {
    items: Feature[]
    status: 'idle' | 'loading' | 'succeeded' | 'failed'
    error: string | null
    lastUpdated: number
}

const initialState: FeaturesState = {
    items: [],
    status: 'idle',
    error: null,
    lastUpdated: 0
}

export const fetchFeatures = createAsyncThunk('features/fetchFeatures', async () => {
    const response = await subscriptionsAPI.listFeatures()
    return response.data.results || response.data
})

export const createFeature = createAsyncThunk('features/createFeature', async (data: any) => {
    const response = await subscriptionsAPI.createFeature(data)
    return response.data
})

export const updateFeature = createAsyncThunk('features/updateFeature', async ({ id, data }: { id: string, data: any }) => {
    const response = await subscriptionsAPI.updateFeature(id, data)
    return response.data
})

const featuresSlice = createSlice({
    name: 'features',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchFeatures.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(fetchFeatures.fulfilled, (state, action: PayloadAction<Feature[]>) => {
                state.status = 'succeeded'
                state.items = action.payload
                state.lastUpdated = Date.now()
            })
            .addCase(fetchFeatures.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message || 'Failed to fetch features'
            })
            // Create
            .addCase(createFeature.fulfilled, (state, action: PayloadAction<Feature>) => {
                state.items.push(action.payload)
            })
            // Update
            .addCase(updateFeature.fulfilled, (state, action: PayloadAction<Feature>) => {
                const index = state.items.findIndex(feature => feature.id === action.payload.id)
                if (index !== -1) {
                    state.items[index] = action.payload
                }
            })
    }
})

export default featuresSlice.reducer
