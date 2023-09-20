-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jsonContents" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientError" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastOccurrence" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "serverVersion" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "FeatureTracking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feature" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientError_message_stack_context_clientVersion_serverVersion_key" ON "ClientError"("message", "stack", "context", "clientVersion", "serverVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureTracking_feature_context_key" ON "FeatureTracking"("feature", "context");
