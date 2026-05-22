import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
  color: string;
}

const TABS: TabConfig[] = [
  { name: 'index',   title: '홈',   icon: 'home-outline',     activeIcon: 'home',      color: Colors.primary },
  { name: 'diet',    title: '식단', icon: 'nutrition-outline', activeIcon: 'nutrition', color: Colors.diet },
  { name: 'workout', title: '운동', icon: 'barbell-outline',   activeIcon: 'barbell',   color: Colors.workout },
  { name: 'stats',   title: '통계', icon: 'bar-chart-outline', activeIcon: 'bar-chart', color: Colors.stats },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, borderTopWidth: 1, height: 80, paddingBottom: 16, paddingTop: 8 },
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