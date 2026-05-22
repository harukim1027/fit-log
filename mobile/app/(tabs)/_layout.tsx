import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS = [
  { name: 'index',   title: '홈',   icon: 'home-outline' as IoniconsName,     activeIcon: 'home' as IoniconsName,      color: Colors.primary },
  { name: 'diet',    title: '식단', icon: 'nutrition-outline' as IoniconsName, activeIcon: 'nutrition' as IoniconsName, color: Colors.diet },
  { name: 'workout', title: '운동', icon: 'barbell-outline' as IoniconsName,   activeIcon: 'barbell' as IoniconsName,   color: Colors.workout },
  { name: 'stats',   title: '통계', icon: 'bar-chart-outline' as IoniconsName, activeIcon: 'bar-chart' as IoniconsName, color: Colors.stats },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={size} color={focused ? tab.color : Colors.textMuted} />
            ),
            tabBarActiveTintColor: tab.color,
          }}
        />
      ))}
    </Tabs>
  );
}
