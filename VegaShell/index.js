import { AppRegistry, LogBox } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';

// Temporary workaround for problem with nested text
// not working currently.
LogBox.ignoreAllLogs();
// if (__DEV__) globalThis.RNFBDebug = true;

AppRegistry.registerComponent(appName, () => App);
