// src/utils/networkState.ts
//
// Plain (non-React) singleton holding the latest known connectivity state.
// NetworkContext.tsx is the single source of truth that writes to this via
// setNetworkState() whenever NetInfo reports a change; apiService.ts reads
// it synchronously in the Axios request interceptor so we can avoid firing
// requests we already know will fail, without making apiService depend on
// React context.

export interface NetworkState {
	// null = not yet known (NetInfo hasn't reported an initial state yet)
	isConnected: boolean | null
	isInternetReachable: boolean | null
}

let currentState: NetworkState = {
	isConnected: null,
	isInternetReachable: null,
}

export const getNetworkState = (): NetworkState => currentState

export const setNetworkState = (state: NetworkState): void => {
	currentState = state
}

// True only once NetInfo has positively reported a disconnected state.
// Deliberately conservative: unknown/null never counts as offline, so we
// never block a request based on a state we're not sure about yet.
export const isKnownOffline = (): boolean => currentState.isConnected === false
