import {SplashScene} from '@/components/splash/splash-scene';

export function LoadingScreen({message}: {message?: string}) {
  return <SplashScene mode="loading" message={message} showProgress />;
}
