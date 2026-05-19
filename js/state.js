import { DEFAULT_CONFIG } from './config.js';

export class StateManager {
  constructor() {
    this.state = { ...DEFAULT_CONFIG };
    this.state.currentStep = 1;
    this.state.shareId = '';
    this.state.isSharedPlay = false;
    this.state.isPlaying = false;
    this.state.floatTimer = null;
    this.listeners = [];
  }

  set(key, value) {
    this.state[key] = value;
    this.notifyListeners();
  }

  get(key) {
    return this.state[key];
  }

  getAll() {
    return { ...this.state };
  }

  reset() {
    this.state = { ...DEFAULT_CONFIG };
    this.state.currentStep = 1;
    this.state.shareId = '';
    this.state.isSharedPlay = false;
    this.state.isPlaying = false;
    this.state.floatTimer = null;
    this.notifyListeners();
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }
}

export const stateManager = new StateManager();