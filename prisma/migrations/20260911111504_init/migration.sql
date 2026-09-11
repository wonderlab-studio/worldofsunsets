-- CreateTable
CREATE TABLE "Sunset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagePath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "takenAt" DATETIME NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "placeName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Sunset_status_takenAt_idx" ON "Sunset"("status", "takenAt");
