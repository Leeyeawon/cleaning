This folder contains schema logic only. It does not contain employee, attendance, session, or uploaded-photo data.

Restore into an empty Supabase project in this order:

20260830_current_schema_backup.sql

20260830_current_functions_backup.sql

20260830_current_policies_backup.sql

Before step 2, enable pg_cron in the destination Supabase project. Do not run these backup files against the current healthy production database.