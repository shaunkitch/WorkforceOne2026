import { Stack } from 'expo-router';

export default function SecurityLayout() {
    return (
        <Stack>
            <Stack.Screen name="patrol" options={{ title: 'Start Patrol', headerBackTitle: 'Back' }} />
            <Stack.Screen name="incident" options={{ title: 'Report Incident', headerBackTitle: 'Back' }} />
        </Stack>
    );
}
