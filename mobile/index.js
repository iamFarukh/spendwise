/**
 * @format
 */

// Must be the first import so gesture-handler installs its native handlers.
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import {enableScreens, enableFreeze} from 'react-native-screens';

// Native screen optimizations: keep off-screen navigator screens out of the
// native view hierarchy AND freeze their React tree so blurred tabs / pushed
// screens stop re-rendering (and pause their animations) on every data tick.
enableScreens(true);
enableFreeze(true);
import notifee from '@notifee/react-native';
import App from './src/App';
import {name as appName} from './app.json';
import {handleBackgroundNotificationEvent} from './src/providers/push-notification-provider';

// Hermes lacks crypto.randomUUID; get-random-values only polyfills
// getRandomValues. @pfos/shared builders rely on randomUUID, so add it here.
if (typeof global.crypto !== 'undefined' && !global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    const bytes = global.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [];
    for (let i = 0; i < 16; i += 1) {
      hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    return (
      hex.slice(0, 4).join('') +
      '-' +
      hex.slice(4, 6).join('') +
      '-' +
      hex.slice(6, 8).join('') +
      '-' +
      hex.slice(8, 10).join('') +
      '-' +
      hex.slice(10, 16).join('')
    );
  };
}

notifee.onBackgroundEvent(async event => {
  await handleBackgroundNotificationEvent(event);
});

AppRegistry.registerComponent(appName, () => App);
