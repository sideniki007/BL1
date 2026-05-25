import { create } from 'zustand';
import {
  type BillyMode,
  type BillyZone,
  CORNER_POS,
  ZONE_Z_INDEX,
} from './billy.constants';
import { useTrackInfoStore } from '../stores/trackInfo.store';

// Hot state (posX, posY, velocity, etc.) перенесён в billy-runtime.ts (singleton)
// INV-BILLY-NO-RERENDER: Store — только low-frequency поля

// ── Zone Boundaries (absolute px, updated on resize/track-change) ──
export interface ZoneBounds {
  ground: { top: number; bottom: number };
  corner: { x: number; y: number };
}

// ── Billy Runtime State (low-frequency only) ──
export interface BillyRuntimeState {
  mode: BillyMode;
  prevMode: BillyMode | null;
  zone: BillyZone;
  facing: 'left' | 'right';
  modeTimer: number;              // ms в текущем режиме
  zones: ZoneBounds;              // кэш, обновляется на resize
}

// ── Actions ──
export interface BillyRuntimeActions {
  setMode: (mode: BillyMode) => void;
  tickModeTimer: (dt: number) => void;
  setZone: (zone: BillyZone) => void;
  updateZoneCache: (zones: Partial<ZoneBounds>) => void;
  setFacing: (facing: 'left' | 'right') => void;
  reset: () => void;
  retreatToCorner: () => void;
  returnFromRetreat: () => void;
  isOverlayOpen: () => boolean;
  effectiveZIndex: () => number;
}

// ── Initial State ──
const initialState: BillyRuntimeState = {
  mode: 'sleep',
  prevMode: null,
  zone: 'corner',
  facing: 'right',
  modeTimer: 0,
  zones: {
    ground: { top: 0, bottom: 0 },
    corner: { x: CORNER_POS.x, y: CORNER_POS.y },
  },
};

// ── Store ──
export const useBillyRuntimeStore = create<BillyRuntimeState & BillyRuntimeActions>()(
  (set, get) => ({
  ...initialState,

  setMode: (mode) => set(state => ({
    mode,
    prevMode: state.mode,
    modeTimer: 0,
  })),

  tickModeTimer: (dt) => set(state => ({
    modeTimer: state.modeTimer + dt,
  })),

  setZone: (zone) => set({ zone }),

  updateZoneCache: (zones) => set(state => ({
    zones: { ...state.zones, ...zones },
  })),

  setFacing: (facing) => set({ facing }),

  reset: () => set({
    ...initialState,
    zones: get().zones,  // сохранить кэш зон
  }),

  retreatToCorner: () => set(state => ({
    mode: 'retreat' as BillyMode,
    prevMode: state.mode,
    zone: 'corner',
    modeTimer: 0,
  })),

  returnFromRetreat: () => {
    const prevMode = get().prevMode;
    if (prevMode && prevMode !== 'retreat') {
      set({ mode: prevMode, prevMode: null, modeTimer: 0 });
    } else {
      set({ mode: 'patrol', prevMode: null, modeTimer: 0 });
    }
  },

  isOverlayOpen: () => {
    return useTrackInfoStore.getState().isOpen;
  },

  effectiveZIndex: () => {
    const { zone, mode } = get();
    if (mode === 'retreat') return ZONE_Z_INDEX.retreat;
    return ZONE_Z_INDEX[zone] ?? ZONE_Z_INDEX.corner;
  },
  }),
);

if (typeof document !== 'undefined') {
  document.addEventListener('before-track-change', () => {
    useBillyRuntimeStore.getState().reset();
  });
}
