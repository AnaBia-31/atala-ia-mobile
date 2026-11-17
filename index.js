import { registerRootComponent } from 'expo';

// Antes de tudo: define a tarefa que confere os alertas com o app fechado.
import './src/notificacoes';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
