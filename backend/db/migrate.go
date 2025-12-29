package db

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
)

//go:embed schema.sql
var schemaSQL string

// ApplySchema ensures core tables exist before the API starts serving traffic.
func ApplySchema(ctx context.Context, conn *sql.DB) error {
	if _, err := conn.ExecContext(ctx, schemaSQL); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}
	return nil
}
