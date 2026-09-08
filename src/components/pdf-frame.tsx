import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { Paths } from 'expo-file-system';

type PdfFrameProps = {
  html?: string;
  uri?: string;
  onMessage?: (message: string) => void;
};

export function PdfFrame({ html, uri, onMessage }: PdfFrameProps) {
  const source = html
    ? { html, baseUrl: 'https://firebasestorage.googleapis.com/' }
    : uri
      ? { uri }
      : undefined;

  if (!source) {
    return null;
  }

  return (
    <WebView
      source={source}
      style={styles.webview}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      allowUniversalAccessFromFileURLs
      mixedContentMode="always"
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      startInLoadingState
      allowingReadAccessToURL={Paths.cache.uri}
      onMessage={(event) => onMessage?.(event.nativeEvent.data)}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#525659',
  },
});
