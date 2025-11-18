@echo off
echo Running missing migrations on local database...
psql -U postgres -d aalap_vma -f migrations/004_add_script_support.sql
psql -U postgres -d aalap_vma -f migrations/008_add_script_file_path.sql
echo Done!
pause
