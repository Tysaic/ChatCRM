from django.core.management.base import BaseCommand
from apps.user.models import UserType

class Command(BaseCommand):

    help = "Create the types of users by default if they do not exist"

    def handle(self, *args, **options):

        user_types = [
            {
                'code': 'ADMIN',
                'name': 'Administrator',
                'description': 'User with full access',
                'priority': 100,
            },
            {
                'code': 'STAFF',
                'name': 'Staff Member',
                'description': 'User with limited access',
                'priority': 75,
            },
            {
                'code': 'USER',
                'name': 'Regular User',
                'description': 'Standar User with basic access',
                'priority': 50,
            },
            {
                'code': 'GUEST',
                'name': 'Guest User',
                'description': 'Third Part User guess with minimal privileges. Created with API',
                'priority': 10,
            }
        ]

        created_count = 0
        updated_count = 0


        for delta_data in user_types:

            user_type, created = UserType.objects.update_or_create(
                code = delta_data['code'],
                defaults = {
                    'name': delta_data['name'],
                    'description': delta_data['description'],
                    'priority': delta_data['priority'],
                    'is_active': True
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created: {user_type.code} - {user_type.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  ➜ Updated: {user_type.code} - {user_type.name}')
                )
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'User Types Seed Completed: {created_count} created, {updated_count} updated.'
            )
        )