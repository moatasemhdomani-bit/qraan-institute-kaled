-- الموظف قد يأخذ أكثر من دور في الفوج نفسه
DROP INDEX "StaffAssignment_userId_cohortId_key";
CREATE UNIQUE INDEX "StaffAssignment_userId_cohortId_role_track_key" ON "StaffAssignment"("userId", "cohortId", "role", "track");
CREATE INDEX "StaffAssignment_userId_cohortId_idx" ON "StaffAssignment"("userId", "cohortId");
