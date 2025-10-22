/**
 * Root Index Screen
 * Navigation is handled by _layout.tsx
 * This is just a placeholder that shows loading while routing
 */

import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  // Navigation logic is in _layout.tsx
  // This screen just shows loading while the app determines where to route
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#0084FF" />
    </View>
  );
}

