import NetInfo from '@react-native-community/netinfo';

/** RN 實作：用 NetInfo 偵測連線狀態（見 spec.md §5.11）。對應 Web 版的 window online/offline 事件。 */
export function subscribeOnlineStatus(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    onChange(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
