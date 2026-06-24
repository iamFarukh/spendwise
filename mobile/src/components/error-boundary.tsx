import {Component, type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import {AppText} from '@/components/ui/app-text';
import {Button} from '@/components/ui/button';
import {colors, spacing} from '@/constants/theme';

type Props = {children: ReactNode};
type State = {hasError: boolean};

/**
 * App-wide safety net: catches render/runtime errors in the tree below it and
 * shows a recoverable screen instead of a white crash. "Try again" remounts
 * the subtree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false};

  static getDerivedStateFromError(): State {
    return {hasError: true};
  }

  componentDidCatch(error: unknown) {
    // Surface in dev; a real build would forward this to crash reporting.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error);
    }
  }

  reset = () => this.setState({hasError: false});

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <AppText variant="h2" style={styles.title}>
            Something went wrong
          </AppText>
          <AppText variant="body" muted style={styles.message}>
            The app hit an unexpected error. Your data is safe — try again.
          </AppText>
          <Button label="Try again" onPress={this.reset} style={styles.button} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
  title: {textAlign: 'center'},
  message: {textAlign: 'center', lineHeight: 22},
  button: {marginTop: spacing.md, alignSelf: 'stretch'},
});
