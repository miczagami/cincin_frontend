import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const en = {
  common: { appName: 'CinCin', tagline: 'AI · Tasting · Game', loading: 'Loading…', error: 'Something went wrong', retry: 'Try again', cancel: 'Cancel', save: 'Save', done: 'Done', next: 'Next', back: 'Back', skip: 'Skip for now', or: 'or' },
  auth: { createAccount: 'Create Account', signIn: 'Sign In', signUp: 'Sign Up', logOut: 'Log Out', email: 'Email address', password: 'Password', displayName: 'Display name', continueApple: 'Continue with Apple', continueGoogle: 'Continue with Google', forgotPassword: 'Forgot password?', alreadyHaveAccount: 'I already have an account', termsNotice: 'By signing up you agree to our Terms of Service and Privacy Policy', subtitle: 'Join the game. Prove your palate.' },
  ageVerify: { title: 'Verify Your Age', subtitle: 'CinCin is for legal-age drinkers. We use a secure third-party service to verify your identity.', scanId: "You'll be asked to scan your government-issued ID. This takes about 60 seconds.", privacyNote: 'Your ID data is handled by our verification partner and is not stored by CinCin.', yourRegion: 'Your region', beginVerification: 'Begin Verification', verifying: 'Verifying…', verified: 'Age verified', failed: 'Verification failed' },
  notifications: { title: 'Stay in the Loop', subtitle: "Choose which notifications you'd like to receive. You can change these anytime." },
  home: { scanBottle: 'Scan a Bottle', scanSubtitle: 'Start a new tasting game', recentGames: 'Recent Games', myCellarClub: 'My Cellar Club', discover: 'Discover', seeAll: 'See all', browse: 'Browse', scansRemaining: '{{count}} of {{total}} free scans remaining' },
  scan: { pointCamera: 'Point camera at bottle label', flash: 'Flash', close: 'Close', camera: 'Camera', barcode: 'Barcode', search: 'Search', bottleIdentified: 'Bottle Identified', scanAgain: 'Scan again', startGame: 'Start Game', notRight: 'Not right? Search manually', searchBottle: 'Search Bottle', tastingNotes: 'This bottle has {{min}}–{{max}} tasting notes to find', buyBottle: 'Buy this bottle' },
  splash: { hero: 'Scan. Taste. Compete.', getStarted: 'Get Started' },
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en } },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
