import {Client} from 'pg'
import getPgConfig from '../getPgConfig'

export async function up() {
  const client = new Client(getPgConfig())
  await client.connect()
  await client.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationProviderTypesEnum') THEN
      CREATE TYPE "IntegrationProviderTypesEnum" AS ENUM (
        'GITLAB',
        'MATTERMOST'
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationProviderTokenTypeEnum') THEN
      CREATE TYPE "IntegrationProviderTokenTypeEnum" AS ENUM (
        'PAT',
        'OAUTH2',
        'WEBHOOK'
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationProviderScopesEnum') THEN
      CREATE TYPE "IntegrationProviderScopesEnum" AS ENUM (
        'GLOBAL',
        'ORG',
        'TEAM'
      );
    END IF;
    CREATE TABLE IF NOT EXISTS "IntegrationProvider" (
      "id" INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      "type" "IntegrationProviderTypesEnum" NOT NULL,
      "tokenType" "IntegrationProviderTokenTypeEnum" NOT NULL,
      "scope" "IntegrationProviderScopesEnum" NOT NULL,
      "scopeGlobal" BOOLEAN GENERATED ALWAYS AS (
        CASE
          WHEN "scope" = 'GLOBAL' THEN TRUE
          ELSE NULL
        END
      ) STORED,
      "orgId" VARCHAR(100),
      "teamId" VARCHAR(100),
      "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
      "name" VARCHAR(250) NOT NULL,
      "serverBaseUri" VARCHAR(2083) NOT NULL,
      "oauthScopes" VARCHAR(100)[],
      "oauthClientId" VARCHAR(2600),
      "oauthClientSecret" VARCHAR(2600),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE("scopeGlobal", "type"),
      CONSTRAINT global_provider_must_be_oauth2 CHECK (
        "scopeGlobal" IS NULL OR ("scopeGlobal" = TRUE AND "tokenType" = 'OAUTH2')
      )
    );
    CREATE INDEX IF NOT EXISTS "idx_IntegrationProvider_typeAndScope"
      ON "IntegrationProvider"("type", "scope");
    CREATE INDEX IF NOT EXISTS "idx_IntegrationProvider_orgId" ON "IntegrationProvider"("orgId");
    CREATE INDEX IF NOT EXISTS "idx_IntegrationProvider_teamId" ON "IntegrationProvider"("teamId");
    CREATE TABLE IF NOT EXISTS "IntegrationToken" (
      "teamId" VARCHAR(100) NOT NULL,
      "userId" VARCHAR(100) NOT NULL,
      "providerId" INT NOT NULL,
      "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
      "accessToken" VARCHAR(2600),
      "expiresAt" TIMESTAMP WITH TIME ZONE,
      "oauthRefreshToken" VARCHAR(2600),
      "oauthScopes" VARCHAR(100)[],
      "attributes" JSONB,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      PRIMARY KEY ("providerId", "userId", "teamId"),
      CONSTRAINT "fk_userId"
        FOREIGN KEY("userId")
          REFERENCES "User"("id"),
      CONSTRAINT "fk_integrationProvider"
        FOREIGN KEY("providerId")
          REFERENCES "IntegrationProvider"("id")
    );
    CREATE INDEX IF NOT EXISTS "idx_IntegrationTokens_teamId" ON "IntegrationToken"("teamId");
    CREATE INDEX IF NOT EXISTS "idx_IntegrationTokens_providerId" ON "IntegrationToken"("providerId");
  END $$;
  `)
  await client.end()
}

export async function down() {
  const client = new Client(getPgConfig())
  await client.connect()
  await client.query(`
  DROP TABLE "IntegrationToken";
  DROP TABLE "IntegrationProvider";
  DROP TYPE "IntegrationProviderScopesEnum";
  DROP TYPE "IntegrationProviderTokenTypeEnum";
  DROP TYPE "IntegrationProviderTypesEnum";
  `)
  await client.end()
}