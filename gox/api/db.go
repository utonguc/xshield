package main

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// connectDB birkaç deneme ile bağlanır (db ayağa kalkarken tolerans).
func connectDB(ctx context.Context, url string) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error
	for i := 0; i < 10; i++ {
		pool, err = pgxpool.New(ctx, url)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				return pool, nil
			} else {
				err = pingErr
				pool.Close()
			}
		}
		time.Sleep(2 * time.Second)
	}
	return nil, err
}
