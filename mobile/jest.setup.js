/* eslint-env jest, node */
jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const Easing = {
    linear: t => t,
    cubic: t => t,
    out: fn => fn,
    in: fn => fn,
    inOut: fn => fn,
  };
  const Keyframe = function Keyframe() {
    return {duration: () => ({})};
  };
  const animBuilder = () => {
    const b = () => b;
    b.duration = () => b;
    b.springify = () => b;
    b.damping = () => b;
    b.stiffness = () => b;
    b.mass = () => b;
    return b;
  };
  const chain = () => chain;
  chain.springify = () => chain;
  chain.damping = () => chain;
  chain.stiffness = () => chain;
  chain.mass = () => chain;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: Component => Component,
    },
    Easing,
    Keyframe,
    LinearTransition: chain(),
    useSharedValue: init => ({value: init}),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: value => value,
    withSpring: value => value,
    withDelay: (_delay, value) => value,
    runOnJS: fn => fn,
    FadeIn: animBuilder(),
    FadeOut: animBuilder(),
    Layout: {},
  };
});

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {trigger: jest.fn()},
  HapticFeedbackTypes: {
    notificationSuccess: 'notificationSuccess',
    notificationError: 'notificationError',
    notificationWarning: 'notificationWarning',
    impactLight: 'impactLight',
  },
}));

jest.mock('lottie-react-native', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('react-native-gesture-handler', () => {
  const {View} = require('react-native');
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    RectButton: View,
  };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasPlayServices: jest.fn(),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({
      isConnected: true,
      isInternetReachable: true,
    })),
  },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {setString: jest.fn()},
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
    createTriggerNotification: jest.fn(),
    cancelTriggerNotification: jest.fn(),
    getTriggerNotificationIds: jest.fn(async () => []),
    getNotificationSettings: jest.fn(async () => ({authorizationStatus: 1})),
    requestPermission: jest.fn(async () => ({authorizationStatus: 1})),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
  },
  AndroidImportance: {HIGH: 4},
  AuthorizationStatus: {AUTHORIZED: 1, DENIED: 0, PROVISIONAL: 2},
  EventType: {PRESS: 1, ACTION_PRESS: 2},
  TriggerType: {TIMESTAMP: 0},
}));

jest.mock('@/navigation/root-navigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn((_ref, onNext) => {
    onNext({exists: () => false, docs: []});
    return jest.fn();
  }),
  query: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn(),
  })),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => {
    cb(null);
    return jest.fn();
  }),
}));
jest.mock('@/lib/firebase/config', () => ({
  isFirebaseConfigured: () => false,
}));

jest.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: () => null,
  getFirebaseDb: () => null,
}));
