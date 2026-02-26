# Requirements Document

## Introduction

This feature enhances the event booking system to automatically detect and display expired events in the user's registration list, and track local event identifiers in the admin booking management system. This improves user experience by clearly indicating which events have passed and helps administrators distinguish between local and remote events.

## Glossary

- **Event Booking System**: The system that manages user registrations for events
- **Registration View**: The user interface displaying a user's event bookings
- **Event Status**: The current state of an event booking (pending, confirmed, cancelled, expired, completed)
- **Local Event**: An event with an eventId that starts with the prefix 'local-'
- **Admin Booking Data**: The enriched booking information returned to administrators
- **Event Date**: The scheduled date when an event will occur

## Requirements

### Requirement 1

**User Story:** As a user viewing my registrations, I want to see which events have already passed, so that I can distinguish between upcoming and past events.

#### Acceptance Criteria

1. WHEN the current date is after an event's scheduled date THEN the Event Booking System SHALL display the status as "已过期" (expired)
2. WHEN an event booking has status "cancelled" THEN the Event Booking System SHALL display "已取消" regardless of the event date
3. WHEN an event booking is expired THEN the Event Booking System SHALL apply the "expired" status badge styling
4. WHEN determining expiration status THEN the Event Booking System SHALL compare dates at midnight (00:00:00) to avoid time-of-day issues
5. WHEN an event has no date field THEN the Event Booking System SHALL treat it as not expired

### Requirement 2

**User Story:** As an administrator, I want to identify which bookings are for local events, so that I can filter and manage local versus remote events separately.

#### Acceptance Criteria

1. WHEN retrieving booking data THEN the Admin Booking Data SHALL include an isLocalEvent field for each booking
2. WHEN a booking's eventId starts with "local-" THEN the isLocalEvent field SHALL be set to true
3. WHEN a booking has an existing isLocalEvent field THEN the Admin Booking Data SHALL preserve that value
4. WHEN a booking has no isLocalEvent field and eventId does not start with "local-" THEN the isLocalEvent field SHALL default to false or undefined
