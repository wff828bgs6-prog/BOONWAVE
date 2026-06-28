
// state/store.js

const DEFAULT_STATE = Object.freeze({
  cards: {},
  links: [],
  currentSpace: 'personal',
  activeGesture: 'IDLE',
  selectedCardId: null,
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
});

class BoonwaveStore {
  constructor(initialState = {}) {
    if (BoonwaveStore.instance) {
      return BoonwaveStore.instance;
    }
    this.state = {
      ...DEFAULT_STATE,
      ...initialState,
      camera: {
        ...DEFAULT_STATE.camera,
        ...(initialState.camera ?? {}),
      },
    };

    this.listeners = new Set();
    BoonwaveStore.instance = this;
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    if (!newState || typeof newState !== 'object' || Array.isArray(newState)) {
      throw new TypeError('BoonwaveStore.setState expects a state object.');
    }
    const previousState = this.state;

    this.state = {
      ...previousState,
      ...newState,
      camera: newState.camera
        ? {
            ...previousState.camera,
            ...newState.camera,
          }
        : previousState.camera,
    };

    if (Object.is(previousState, this.state)) {
      return this.state;
    }

    for (const listener of [...this.listeners]) {
      try {
        listener(this.state, previousState);
      } catch (error) {
        console.error("BoonwaveStore subscriber error:", error);
      }
    }

    return this.state;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('BoonwaveStore.subscribe expects a function.');
    }
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

const store = new BoonwaveStore();
export { BoonwaveStore };
export default store;
