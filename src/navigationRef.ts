import { createNavigationContainerRef } from '@react-navigation/native';

// export a navigation ref so non-component code (FCM handlers) can navigate
export const navigationRef = createNavigationContainerRef<any>();

export default navigationRef;
