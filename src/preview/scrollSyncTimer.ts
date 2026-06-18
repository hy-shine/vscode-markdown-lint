export interface PreviewScrollSyncTimerOwner {
  scrollSyncTimer?: ReturnType<typeof setTimeout>;
}

export function clearPreviewScrollSyncTimer(owner: PreviewScrollSyncTimerOwner): void {
  if (!owner.scrollSyncTimer) {
    return;
  }

  clearTimeout(owner.scrollSyncTimer);
  owner.scrollSyncTimer = undefined;
}
