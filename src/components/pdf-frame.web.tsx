import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

type PdfFrameProps = {
  html?: string;
  uri?: string;
  onMessage?: (message: string) => void;
};

export function PdfFrame({ html, uri }: PdfFrameProps) {
  const iframe = html
    ? createElement('iframe', {
        srcDoc: html,
        title: 'Catalog PDF',
        style: styles.frame,
      })
    : uri
      ? createElement('iframe', {
          src: uri,
          title: 'Catalog PDF',
          style: styles.frame,
        })
      : null;

  return <View style={styles.container}>{iframe}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#525659',
  },
  frame: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
});
