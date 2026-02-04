from django.core.management.base import BaseCommand
from apps.user.models import ApiKey, UserType, User

class Command(BaseCommand):

    help = "Create your first API key for accessing the system"

    def add_arguments(self, parser):

        parser.add_argument(
            'name',
            type=str,
            help='Name for the API key'
        )

        parser.add_argument(
            '--user-type',
            type=str,
            default = 'GUEST',
            help="Code of the default user type for this API key (default: GUEST)"
        )

        parser.add_argument(
            '--rate-limit',
            type=int,
            default=10000,
            help="Rate limit for the API key (default: 10000 requests per hoy, 0=unlimited)"
        )

        parser.add_argument(
            '--scopes',
            type=str,
            default='guest:created,guest:read',
            help="Comma separated list of scopes for the API key (default: guest:created, guest:read)"
        )
    
    def handle(self, *args, **options):

        name = options['name']
        user_type_code = options['user_type']
        rate_limit = options['rate_limit']
        scopes = [s.strip() for s in options['scopes'].split(',')]


        try:
            default_user_type = UserType.objects.get(code=user_type_code)
        except UserType.DoesNotExist:
            raise CommandError(
                f"UserType with code '{user_type_code}' does not exist. Please create it first."
                f" You can use the 'init_seed_user_types' management command to create default user types."
            )
        
        api_key, key_plain = ApiKey.create_key(
            name=name,
            default_user_type = default_user_type,
            scopes=scopes,
            rate_limit = rate_limit
        )


        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('═' * 60))
        self.stdout.write(self.style.SUCCESS('  API KEY CREATED SUCCESSFULLY'))
        self.stdout.write(self.style.SUCCESS('═' * 60))
        self.stdout.write('')
        self.stdout.write(f'  Name:        {api_key.name}')
        self.stdout.write(f'  Prefix:      {api_key.key_prefix}...')
        self.stdout.write(f'  User Type:   {default_user_type.code}')
        self.stdout.write(f'  Rate Limit:  {rate_limit}/hour')
        self.stdout.write(f'  Scopes:      {", ".join(scopes)}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('  ⚠️  SAVE THIS KEY - IT WILL NOT BE SHOWN AGAIN:'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'  {key_plain}'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('═' * 60))
