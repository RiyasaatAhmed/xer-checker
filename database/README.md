# Database

**Now:** an empty PostgreSQL 17 database, at `localhost:5432`. No tables yet.

**Next:** the backend creates the tables, once it saves results.

**Settings:** `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env`. Without them, the local defaults in `docker-compose.yml` apply.

**Connect:**

```
docker compose exec database psql -U xer_checker xer_checker
```
