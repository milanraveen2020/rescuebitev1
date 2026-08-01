import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export type AddToCalendarResult = 'added' | 'permission-denied' | 'no-calendar';

/** Add a pickup window to the device calendar, reporting which outcome occurred. */
export async function addPickupToCalendar(params: {
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
}): Promise<AddToCalendarResult> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return 'permission-denied';

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  const calendarId =
    Platform.OS === 'ios' ? (await Calendar.getDefaultCalendarAsync()).id : writable?.id;
  if (!calendarId) return 'no-calendar';

  await Calendar.createEventAsync(calendarId, {
    title: params.title,
    startDate: new Date(params.start),
    endDate: new Date(params.end),
    location: params.location,
    notes: params.notes,
    alarms: [{ relativeOffset: -30 }],
  });
  return 'added';
}
