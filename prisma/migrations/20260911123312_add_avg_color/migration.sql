-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sunset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagePath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "takenAt" DATETIME NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "placeName" TEXT,
    "colorR" INTEGER NOT NULL DEFAULT 128,
    "colorG" INTEGER NOT NULL DEFAULT 128,
    "colorB" INTEGER NOT NULL DEFAULT 128,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Sunset" ("createdAt", "id", "imagePath", "lat", "lng", "placeName", "status", "takenAt", "thumbPath") SELECT "createdAt", "id", "imagePath", "lat", "lng", "placeName", "status", "takenAt", "thumbPath" FROM "Sunset";
DROP TABLE "Sunset";
ALTER TABLE "new_Sunset" RENAME TO "Sunset";
CREATE INDEX "Sunset_status_takenAt_idx" ON "Sunset"("status", "takenAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
