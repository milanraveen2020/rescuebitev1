import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Add a pickup window to the device calendar. Returns true on success. Falls back
 * gracefully (returns false) if permission is denied or no calendar is available.
 */
export async function addPickupToCalendar(params: {
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
}): Promise<boolean> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return false;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  const calendarId =
    Platform.OS === 'ios'
      ? (await Calendar.getDefaultCalendarAsync()).id
      : writable?.id;
  if (!calendarId) return false;

  await Calendar.createEventAsync(calendarId, {
    title: params.title,
    startDate: new Date(params.start),
    endDate: new Date(params.end),
    location: params.location,
    notes: params.notes,
    alarms: [{ relativeOffset: -30 }],
  });
  return true;
}
