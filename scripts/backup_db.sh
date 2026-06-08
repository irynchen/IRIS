#!/bin/bash
# IRIS Datenbank-Backup
# Auf dem VPS ausführen, BEVOR neue Code-Versionen deployed werden.
#
# Verwendung:
#   chmod +x scripts/backup_db.sh
#   sudo bash scripts/backup_db.sh
#
# Backups landen in: /var/backups/iris/
# Es werden immer die letzten 10 Backups behalten.

set -e

DB_USER="iris"
DB_NAME="iris_db"
BACKUP_DIR="/var/backups/iris"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/iris_db_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "=== IRIS Backup ==="
echo "Datenbank : $DB_NAME"
echo "Zieldatei : $BACKUP_FILE"
echo ""

pg_dump -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup erstellt: $BACKUP_FILE ($SIZE)"

# Letzte 10 Backups behalten, ältere löschen
KEPT=$(ls -t "$BACKUP_DIR"/iris_db_*.sql 2>/dev/null | wc -l)
if [ "$KEPT" -gt 10 ]; then
    ls -t "$BACKUP_DIR"/iris_db_*.sql | tail -n +11 | xargs rm
    echo "Alte Backups bereinigt. Behalte: 10"
fi

echo ""
echo "Verfügbare Backups:"
ls -lh "$BACKUP_DIR"/iris_db_*.sql 2>/dev/null || echo "(keine)"
