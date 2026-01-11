from django.core.management.base import BaseCommand
from apps.students.models import Student

class Command(BaseCommand):
    help = 'Syncs student pickup locations with their assigned stops'

    def handle(self, *args, **kwargs):
        students = Student.objects.filter(stop__isnull=False)
        count = 0
        for student in students:
            if student.stop.latitude and student.stop.longitude:
                student.pickup_latitude = student.stop.latitude
                student.pickup_longitude = student.stop.longitude
                student.save()
                count += 1
                self.stdout.write(f'Synced {student.first_name} {student.last_name} to {student.stop.name}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully synced {count} students'))
