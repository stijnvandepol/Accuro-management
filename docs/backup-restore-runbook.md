# Backup And Restore Runbook

## Scope
This runbook covers the P0 launch scope for the ticket system database.

## Before Every Production Deploy
1. Confirm the target release and migration list.
2. Create a fresh database snapshot or managed backup.
3. Record:
   - timestamp
   - environment
   - backup identifier
   - release version
4. Do not run schema migrations until the backup is confirmed.

## Daily Backup Policy
- Frequency: at least daily
- Retention: minimum 14 days
- Storage: encrypted storage managed by the database provider or infrastructure platform
- Access: production operators only

## Restore Drill
Run before first live launch and after any major schema change.

1. Create a throwaway restore target database.
2. Restore the most recent production-like backup into that database.
3. Point a disposable app instance at the restored database.
4. Verify:
   - login works
   - `/api/health/ready` returns 200
   - `/api/v1/tickets?limit=5` returns data
   - archived tickets can be queried with `archived=true`
5. Record the restore duration and any manual steps.

## Production Restore Procedure
1. Freeze writes if the incident requires point-in-time recovery.
2. Select the backup or snapshot to restore from.
3. Restore into an isolated database first.
4. Validate application integrity on the isolated restore.
5. Decide between:
   - forward fix on current production
   - app rollback if schema is backward compatible
   - full database restore if data corruption is confirmed
6. If full restore is required, announce downtime and execute the infra restore plan.
7. Run smoke tests after restore.

## Validation Checklist
- Users present
- Tickets readable
- Ticket create works in non-production validation environment
- Timeline entries readable
- Communications readable
- References readable

## Notes
- Down-migrations are not the default rollback mechanism.
- Prefer backward-compatible schema changes and app rollback when possible.
