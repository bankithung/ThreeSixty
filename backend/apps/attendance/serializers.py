"""
Serializers for attendance app.
"""
from rest_framework import serializers
from .models import Attendance, EventType
from apps.students.serializers import StudentListSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer for Attendance model."""
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    conductor_name = serializers.CharField(source='conductor.full_name', read_only=True)
    location = serializers.ReadOnlyField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'trip', 'conductor', 'conductor_name',
            'event_type', 'timestamp', 'latitude', 'longitude', 'location',
            'confidence_score', 'scan_photo', 'is_manual', 'notes'
        ]
        read_only_fields = ['id', 'timestamp']


class FaceScanSerializer(serializers.Serializer):
    """Serializer for face scan attendance."""
    trip_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=EventType.choices)
    photo = serializers.ImageField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    
    def create(self, validated_data):
        """Process face scan and record attendance."""
        from apps.transport.models import Trip, TripStatus
        from apps.students.models import Student, FaceEncoding
        from .face_recognition import match_face
        from apps.notifications.services import send_attendance_notification
        
        trip_id = validated_data['trip_id']
        event_type = validated_data['event_type']
        photo = validated_data['photo']
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        conductor = self.context['request'].user
        
        # Get trip
        try:
            trip = Trip.objects.get(id=trip_id, status=TripStatus.IN_PROGRESS)
        except Trip.DoesNotExist:
            raise serializers.ValidationError({"trip_id": "Active trip not found."})
        
        # Get students on this route with face encodings
        students = Student.objects.filter(
            route=trip.route,
            is_active=True
        ).prefetch_related('face_encodings')
        
        # Prepare encodings for matching
        student_encodings = []
        for student in students:
            for face in student.face_encodings.all():
                student_encodings.append({
                    'student_id': student.id,
                    'encoding': face.encoding
                })
        
        if not student_encodings:
            raise serializers.ValidationError({
                "photo": "No students with face encodings on this route."
            })
        
        # Match face
        result = match_face(photo, student_encodings)
        
        if not result['success']:
            raise serializers.ValidationError({
                "photo": result['error'] or "Face not recognized."
            })
        
        student = Student.objects.get(id=result['student_id'])
        
        # Check for duplicate scan
        existing = Attendance.objects.filter(
            student=student,
            trip=trip,
            event_type=event_type
        ).exists()
        
        if existing:
            raise serializers.ValidationError({
                "photo": f"Student {student.full_name} already {event_type}."
            })
        
        # Create attendance record
        attendance = Attendance.objects.create(
            student=student,
            trip=trip,
            conductor=conductor,
            event_type=event_type,
            latitude=latitude,
            longitude=longitude,
            confidence_score=result['confidence'],
            scan_photo=photo,
        )
        
        # Update trip counters
        if event_type == EventType.CHECKIN:
            trip.students_boarded += 1
        else:
            trip.students_dropped += 1
        trip.save(update_fields=['students_boarded', 'students_dropped'])
        
        # Send notification to parents
        send_attendance_notification(attendance)
        
        return attendance


class ManualAttendanceSerializer(serializers.Serializer):
    """Serializer for manual attendance marking."""
    trip_id = serializers.UUIDField()
    student_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=EventType.choices)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        """Create manual attendance record."""
        from apps.transport.models import Trip, TripStatus
        from apps.students.models import Student
        from apps.notifications.services import send_attendance_notification
        
        trip_id = validated_data['trip_id']
        student_id = validated_data['student_id']
        event_type = validated_data['event_type']
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        notes = validated_data.get('notes', '')
        conductor = self.context['request'].user
        
        # Get trip and student
        try:
            trip = Trip.objects.get(id=trip_id, status=TripStatus.IN_PROGRESS)
            student = Student.objects.get(id=student_id)
        except Trip.DoesNotExist:
            raise serializers.ValidationError({"trip_id": "Active trip not found."})
        except Student.DoesNotExist:
            raise serializers.ValidationError({"student_id": "Student not found."})
        
        # Check for duplicate
        existing = Attendance.objects.filter(
            student=student,
            trip=trip,
            event_type=event_type
        ).exists()
        
        if existing:
            raise serializers.ValidationError({
                "student_id": f"Student already {event_type}."
            })
        
        # Create attendance record
        attendance = Attendance.objects.create(
            student=student,
            trip=trip,
            conductor=conductor,
            event_type=event_type,
            latitude=latitude,
            longitude=longitude,
            confidence_score=1.0,
            is_manual=True,
            notes=notes,
        )
        
        # Update trip counters
        if event_type == EventType.CHECKIN:
            trip.students_boarded += 1
        else:
            trip.students_dropped += 1
        trip.save(update_fields=['students_boarded', 'students_dropped'])
        
        # Send notification
        send_attendance_notification(attendance)
        
        return attendance


class TripAttendanceSerializer(serializers.Serializer):
    """Serializer for trip attendance summary."""
    student = StudentListSerializer()
    checkin = AttendanceSerializer(allow_null=True)
    checkout = AttendanceSerializer(allow_null=True)
    status = serializers.CharField()
