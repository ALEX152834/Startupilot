# Design Document

## Overview

This design implements event expiration detection and local event tracking for the event booking system. The solution involves two independent enhancements:

1. **Client-side expiration detection**: Add logic to the registrations view component to detect and display expired events based on the event date
2. **Server-side local event tracking**: Enhance the admin cloud function to include local event identification in booking data

Both changes are minimal, focused modifications that don't require database schema changes or new API endpoints.

## Architecture

### Component Changes

**Frontend Component**: `subPackages/profile/registrations/registrations.vue`
- Add `isEventExpired()` helper function for date comparison
- Modify `getStatusText()` to accept booking object and check expiration
- Update template to use expiration status for badge styling
- Add CSS styling for expired status badge

**Backend Cloud Function**: `cloudfunctions/admin/index.js`
- Modify `getAllBookings()` function to enrich booking data with `isLocalEvent` field
- Use eventId prefix detection to determine local event status

### Data Flow

**Expiration Status Display**:
1. User navigates to registrations page
2. Component loads booking list from store
3. For each booking, `isEventExpired()` checks if event date < current date
4. `getStatusText()` returns appropriate status text based on expiration and booking status
5. Template applies corresponding CSS class for visual styling

**Local Event Tracking**:
1. Admin requests booking data via cloud function
2. `getAllBookings()` retrieves bookings from database
3. During enrichment phase, add `isLocalEvent` field based on eventId prefix
4. Return enriched data to admin interface

## Components and Interfaces

### Frontend Component API

**New Functions**:

```javascript
// Check if an event has expired
isEventExpired(booking: Booking): boolean

// Get display status text for a booking
getStatusText(booking: Booking): string
```

**Modified Template Bindings**:
- Status badge class: Dynamic based on expiration check
- Status text: Passes full booking object instead of just status string

### Backend Function Modifications

**Modified Function Signature**:
```javascript
// Returns enriched booking data with isLocalEvent field
getAllBookings(params, wxContext): Promise<{
  code: number,
  message: string,
  data: {
    list: EnrichedBooking[],
    total: number,
    todayCount: number
  }
}>
```

**EnrichedBooking Type**:
```javascript
{
  ...booking,
  userName: string,
  userPhone: string,
  userWechat: string,
  userRole: string,
  isLocalEvent: boolean  // NEW FIELD
}
```

## Data Models

### Booking Object (Frontend)

```javascript
{
  _id: string,
  eventId: string,
  eventTitle: string,
  eventType: 'online' | 'offline',
  date: string,        // Format: YYYY-MM-DD
  time: string,
  location?: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  uid: string,
  registeredAt: Date
}
```

### Enriched Booking Object (Backend)

```javascript
{
  ...Booking,
  userName: string,
  userPhone: string,
  userWechat: string,
  userRole: string,
  isLocalEvent: boolean  // Derived from eventId prefix or existing field
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Past date events show as expired
*For any* booking with a date field where the event date is before today's date (at midnight), the status text returned by `getStatusText()` should be "已过期"
**Validates: Requirements 1.1**

### Property 2: Cancelled status takes precedence
*For any* booking with status "cancelled", regardless of the event date (past, present, or future), the status text returned by `getStatusText()` should be "已取消"
**Validates: Requirements 1.2**

### Property 3: Expired events receive expired styling
*For any* booking where `isEventExpired()` returns true, the template should apply the CSS class "status-badge--expired"
**Validates: Requirements 1.3**

### Property 4: Date comparison uses midnight normalization
*For any* booking with today's date, `isEventExpired()` should return false, and for any booking with yesterday's date, `isEventExpired()` should return true, regardless of the current time of day
**Validates: Requirements 1.4**

### Property 5: All enriched bookings include isLocalEvent field
*For any* booking returned by `getAllBookings()`, the enriched booking object should contain an `isLocalEvent` field
**Validates: Requirements 2.1**

### Property 6: Local prefix detection
*For any* booking where the eventId starts with "local-", the `isLocalEvent` field should be set to true
**Validates: Requirements 2.2**

### Property 7: Existing isLocalEvent values are preserved
*For any* booking that already has an `isLocalEvent` field with a value, the enrichment process should preserve that exact value
**Validates: Requirements 2.3**

### Property 8: Non-local events default appropriately
*For any* booking without an existing `isLocalEvent` field and with an eventId that does not start with "local-", the `isLocalEvent` field should be false or undefined
**Validates: Requirements 2.4**

## Error Handling

### Frontend Error Handling

**Missing Date Field**: 
- `isEventExpired()` returns false for bookings without a date field
- Prevents runtime errors from date parsing

**Invalid Date Format**:
- Date constructor handles invalid formats by returning Invalid Date
- Comparison with Invalid Date returns false, treating as not expired

### Backend Error Handling

**Missing eventId**:
- Optional chaining (`eventId?.startsWith()`) prevents errors
- Returns undefined which is falsy, resulting in isLocalEvent being false/undefined

**Null/Undefined Booking Fields**:
- Use fallback operators (`||`) to provide default values
- Ensures enriched data always has expected structure

## Testing Strategy

### Unit Testing

We will write focused unit tests for:

**Frontend**:
- `isEventExpired()` with various date scenarios (past, present, future, missing)
- `getStatusText()` with different booking statuses and dates
- Edge cases: null dates, invalid date formats, cancelled + expired combinations

**Backend**:
- `getAllBookings()` enrichment logic with various eventId formats
- Preservation of existing isLocalEvent values
- Edge cases: missing eventId, null values, empty strings

### Property-Based Testing

We will use a property-based testing library appropriate for the JavaScript/Vue ecosystem (such as fast-check for JavaScript).

**Configuration**:
- Each property test should run a minimum of 100 iterations
- Tests should generate random booking objects with varied dates, statuses, and eventIds

**Property Test Requirements**:
- Each property-based test MUST be tagged with a comment referencing the correctness property
- Tag format: `// Feature: event-expiration-status, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test

**Test Generators**:
- Generate random dates (past, present, future)
- Generate random booking statuses
- Generate random eventIds (with and without "local-" prefix)
- Generate bookings with and without optional fields

**Property Tests to Implement**:
1. Property 1: Generate bookings with past dates, verify status text is "已过期"
2. Property 2: Generate cancelled bookings with any date, verify status text is "已取消"
3. Property 4: Generate bookings with today/yesterday dates at various times, verify expiration logic
4. Property 6: Generate bookings with various eventId prefixes, verify local detection
5. Property 7: Generate bookings with pre-existing isLocalEvent values, verify preservation

### Integration Testing

- Test the full flow from component mount to status display
- Test admin function with real database queries (using test data)
- Verify CSS classes are correctly applied in rendered output

## Implementation Notes

### Date Handling

The date comparison must normalize both dates to midnight to avoid time-of-day issues:

```javascript
const eventDate = new Date(booking.date)
const today = new Date()
today.setHours(0, 0, 0, 0)
return eventDate < today
```

### Status Priority

The status determination follows this priority order:
1. Cancelled status (highest priority)
2. Expiration check
3. Original booking status

### Local Event Detection

The detection uses a simple prefix check with optional chaining for safety:

```javascript
isLocalEvent: booking.isLocalEvent || booking.eventId?.startsWith('local-')
```

This preserves existing values and safely handles missing eventIds.

## Performance Considerations

**Frontend**:
- `isEventExpired()` is called for each booking in the list
- Date operations are lightweight and synchronous
- No performance impact expected for typical list sizes (< 100 bookings)

**Backend**:
- `isLocalEvent` calculation adds minimal overhead to existing enrichment loop
- String prefix check is O(1) operation
- No additional database queries required

## Future Enhancements

Potential improvements for future iterations:

1. **Automatic status updates**: Background job to mark expired events as "completed"
2. **Expiration notifications**: Alert users before events expire
3. **Filter by status**: Allow users to filter registrations by expired/upcoming
4. **Local event badge**: Visual indicator in the UI for local events
5. **Bulk operations**: Admin actions specific to local vs remote events
