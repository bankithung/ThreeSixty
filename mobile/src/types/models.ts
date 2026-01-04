/**
 * Model Type Definitions for ThreeSixty Mobile App
 */

// ========== USER & AUTH ==========

export type UserRole = 'root_admin' | 'school_admin' | 'office_staff' | 'teacher' | 'conductor' | 'driver' | 'parent';

export interface User {
    id: string;
    phone: string;
    email: string | null;
    first_name: string;
    last_name: string;
    full_name: string;
    role: UserRole;
    avatar: string | null;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: User;
    is_new_user: boolean;
}

export interface SchoolMembership {
    id: string;
    school: string;
    school_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
}

// ========== SCHOOL ==========

export interface School {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    country: string;
    phone: string;
    email: string;
    logo: string | null;
    is_active: boolean;
}

// ========== STUDENT ==========

export interface Student {
    id: string;
    admission_number: string;
    first_name: string;
    last_name: string;
    full_name: string;
    date_of_birth: string;
    grade: string;
    section: string | null;
    photo: string | null;
    school: string;
    route: string | null;
    route_name: string | null;
    stop: string | null;
    stop_name: string | null;
    pickup_latitude: number;
    pickup_longitude: number;
    pickup_address: string;
    drop_latitude: number;
    drop_longitude: number;
    drop_address: string;
    face_encoding_count: number;
    parents: ParentMinimal[];
    is_active: boolean;
}

export interface ParentMinimal {
    id: string;
    user: string;
    full_name: string;
    phone: string;
    relationship: string;
    is_primary: boolean;
}

export interface ChildStatus {
    student: {
        id: string;
        full_name: string;
        photo: string | null;
    };
    status: 'not_on_bus' | 'on_bus' | 'dropped';
    active_trip_id: string | null;
    message: string;
    today_records: Attendance[];
}

// ========== TRANSPORT ==========

export interface Bus {
    id: string;
    number: string;
    registration_number: string;
    capacity: number;
    model: string | null;
    school: string;
    driver: string | null;
    driver_name: string | null;
    conductor: string | null;
    conductor_name: string | null;
    is_active: boolean;
}

export interface Route {
    id: string;
    name: string;
    school: string;
    description: string | null;
    total_stops: number;
    is_active: boolean;
}

export interface Stop {
    id: string;
    route: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    order: number;
    estimated_time: string | null;
    student_count: number;
}

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'morning' | 'evening' | 'special';

export interface Trip {
    id: string;
    school: string;
    bus: string;
    bus_number: string;
    route: string;
    route_name: string;
    driver: string | null;
    driver_name: string | null;
    conductor: string | null;
    conductor_name: string | null;
    trip_type: TripType;
    date: string;
    status: TripStatus;
    start_time: string | null;
    end_time: string | null;
    total_students: number;
    students_boarded: number;
    students_dropped: number;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    timestamp?: string;
}

export interface TripTrackingData {
    trip: Trip;
    latest_location: LocationData | null;
    route_polyline: string | null;
    stops: Stop[];
    staff: {
        driver: { name: string; phone: string } | null;
        conductor: { name: string; phone: string } | null;
    };
}

// ========== ATTENDANCE ==========

export type AttendanceEventType = 'checkin' | 'checkout';
export type AttendanceMethod = 'face_scan' | 'manual' | 'rfid' | 'app';

export interface Attendance {
    id: string;
    student: string;
    student_name: string;
    trip: string | null;
    event_type: AttendanceEventType;
    method: AttendanceMethod;
    timestamp: string;
    latitude: number | null;
    longitude: number | null;
    stop: string | null;
    confidence_score: number;
    face_image: string | null;
    verified_by: string | null;
    notes: string | null;
}

export interface TripAttendance {
    trip: Trip;
    total_students: number;
    checked_in_count: number;
    checked_out_count: number;
    students: Array<{
        student: Student;
        checkin: Attendance | null;
        checkout: Attendance | null;
        status: 'not_boarded' | 'on_bus' | 'dropped';
    }>;
}

// ========== NOTIFICATIONS ==========

export type NotificationType =
    | 'checkin'
    | 'checkout'
    | 'trip_started'
    | 'trip_ended'
    | 'approaching'
    | 'delay'
    | 'emergency'
    | 'general';

export interface Notification {
    id: string;
    user: string;
    title: string;
    body: string;
    notification_type: NotificationType;
    is_read: boolean;
    student: string | null;
    trip: string | null;
    data: Record<string, any> | null;
    created_at: string;
}

// ========== API RESPONSES ==========

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface ApiError {
    detail?: string;
    message?: string;
    [key: string]: any;
}
