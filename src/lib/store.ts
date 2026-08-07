import { create } from 'zustand';

interface SyncState {
  isUploading: boolean;
  progress: number;
  processedRows: number;
  totalRows: number;
  setIsUploading: (status: boolean) => void;
  setProgress: (progress: number, processed: number) => void;
  setTotalRows: (total: number) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isUploading: false,
  progress: 0,
  processedRows: 0,
  totalRows: 0,
  setIsUploading: (status) => set({ isUploading: status }),
  setProgress: (progress, processed) => set({ progress, processedRows: processed }),
  setTotalRows: (total) => set({ totalRows: total }),
  reset: () => set({ isUploading: false, progress: 0, processedRows: 0, totalRows: 0 }),
}));
